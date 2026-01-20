use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::types::*;

fn build_claude_args(config: &AgentConfig) -> (&'static str, Vec<String>) {
    let mut args = vec![
        "-p".to_string(),
        config.prompt.clone(),
        "--output-format".to_string(),
        "stream-json".to_string(),
        "--verbose".to_string(),
        "--permission-mode".to_string(),
        "bypassPermissions".to_string(),
    ];
    if let Some(model) = &config.model {
        args.push("--model".to_string());
        args.push(model.clone());
    }
    if let Some(sp) = &config.system_prompt {
        if !sp.is_empty() {
            args.push("--system-prompt".to_string());
            args.push(sp.clone());
        }
    }
    if let Some(tools) = &config.allowed_tools {
        if !tools.is_empty() {
            args.push("--allowedTools".to_string());
            args.push(tools.join(","));
        }
    }
    ("claude", args)
}

fn build_cursor_args(config: &AgentConfig) -> (&'static str, Vec<String>) {
    // Cursor CLI: https://cursor.com/docs/cli/overview
    // Modes: agent (default), plan, ask. Non-interactive: -p, --model, --output-format
    let mut args = vec![
        "-p".to_string(),
        config.prompt.clone(),
        "--output-format".to_string(),
        "stream-json".to_string(),
    ];
    if let Some(model) = &config.model {
        args.push("--model".to_string());
        args.push(model.clone());
    }
    if let Some(mode) = &config.mode {
        let m = mode.trim().to_lowercase();
        if ["agent", "plan", "ask"].contains(&m.as_str()) {
            args.push("--mode".to_string());
            args.push(m);
        }
    }
    ("agent", args)
}

pub struct AgentHandle {
    pub id: AgentId,
    pub workspace_id: WorkspaceId,
    pub child: Child,
}

pub struct AgentManager {
    agents: Arc<RwLock<HashMap<AgentId, AgentHandle>>>,
}

impl AgentManager {
    pub fn new() -> Self {
        Self {
            agents: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn start_agent<F>(
        &self,
        config: AgentConfig,
        emit_event: F,
    ) -> Result<AgentId, AgentError>
    where
        F: Fn(AgentEvent) + Send + Sync + Clone + 'static,
    {
        let agent_id = Uuid::new_v4().to_string();
        let workspace_id = config.workspace_id.clone();
        let cli = config.cli.as_ref().unwrap_or(&CliType::Claude);

        let (binary, args) = match cli {
            CliType::Claude => build_claude_args(&config),
            CliType::Cursor => build_cursor_args(&config),
        };

        let mut cmd = Command::new(binary);
        cmd.args(&args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .stdin(Stdio::null());

        if let Some(dir) = &config.working_directory {
            cmd.current_dir(dir);
        }

        let mut child = cmd.spawn().map_err(|e| AgentError::SpawnFailed(e.to_string()))?;

        emit_event(AgentEvent::Started {
            agent_id: agent_id.clone(),
            workspace_id: workspace_id.clone(),
        });

        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| AgentError::ProcessError("Failed to capture stdout".to_string()))?;

        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| AgentError::ProcessError("Failed to capture stderr".to_string()))?;

        let agent_id_clone = agent_id.clone();
        let emit_clone = emit_event.clone();
        let agents_clone = self.agents.clone();

        // Spawn stderr reader to capture errors
        let agent_id_stderr = agent_id.clone();
        let emit_stderr = emit_event.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if !line.trim().is_empty() {
                    eprintln!("[CLI stderr] {}", line);
                    emit_stderr(AgentEvent::Error {
                        agent_id: agent_id_stderr.clone(),
                        message: format!("CLI: {}", line),
                    });
                }
            }
        });

        tokio::spawn(async move {
            Self::process_output(agent_id_clone.clone(), stdout, emit_clone.clone()).await;

            let mut agents = agents_clone.write().await;
            if let Some(handle) = agents.remove(&agent_id_clone) {
                let status = handle.child.wait_with_output().await;
                let (reason, success) = match status {
                    Ok(output) if output.status.success() => (StopReason::Completed, true),
                    Ok(output) => {
                        eprintln!("[CLI] Process exited with status: {:?}", output.status);
                        (StopReason::Error, false)
                    }
                    Err(e) => {
                        eprintln!("[CLI] Process error: {}", e);
                        (StopReason::Error, false)
                    }
                };

                // Emit result event before stopped
                emit_clone(AgentEvent::Result {
                    agent_id: agent_id_clone.clone(),
                    success,
                    duration_ms: 0,
                });

                emit_clone(AgentEvent::Stopped {
                    agent_id: agent_id_clone,
                    reason,
                });
            }
        });

        let handle = AgentHandle {
            id: agent_id.clone(),
            workspace_id,
            child,
        };

        self.agents.write().await.insert(agent_id.clone(), handle);

        Ok(agent_id)
    }

    async fn process_output<R, F>(agent_id: AgentId, reader: R, emit_event: F)
    where
        R: tokio::io::AsyncRead + Unpin,
        F: Fn(AgentEvent) + Send + Sync,
    {
        let reader = BufReader::new(reader);
        let mut lines = reader.lines();
        let mut last_tool_name: Option<String> = None;

        while let Ok(Some(line)) = lines.next_line().await {
            if line.trim().is_empty() {
                continue;
            }

            match Self::parse_line(&line) {
                Some(message) => {
                    if let Some(event) = Self::convert_message(&agent_id, message, &mut last_tool_name) {
                        emit_event(event);
                    }
                }
                None => {
                    // Log unparseable lines but don't fail
                    eprintln!("Unparseable line: {}", line);
                }
            }
        }
    }

    fn parse_line(line: &str) -> Option<ClaudeMessage> {
        serde_json::from_str(line).ok()
    }

    fn convert_message(
        agent_id: &AgentId,
        message: ClaudeMessage,
        last_tool_name: &mut Option<String>,
    ) -> Option<AgentEvent> {
        match message {
            ClaudeMessage::Init { session_id, model } => Some(AgentEvent::Init {
                agent_id: agent_id.clone(),
                session_id,
                model,
            }),
            ClaudeMessage::Assistant { message } => {
                let mut text_content = String::new();
                let mut tool_event = None;

                for block in message.content {
                    match block {
                        ContentBlock::Text { text } => {
                            if !text_content.is_empty() {
                                text_content.push('\n');
                            }
                            text_content.push_str(&text);
                        }
                        ContentBlock::ToolUse { name, input, .. } => {
                            *last_tool_name = Some(name.clone());
                            tool_event = Some(AgentEvent::ToolUse {
                                agent_id: agent_id.clone(),
                                tool_name: name,
                                tool_input: input,
                            });
                        }
                        ContentBlock::ToolResult { is_error, .. } => {
                            if let Some(tool_name) = last_tool_name.take() {
                                return Some(AgentEvent::ToolResult {
                                    agent_id: agent_id.clone(),
                                    tool_name,
                                    success: !is_error,
                                });
                            }
                        }
                        ContentBlock::Unknown => {}
                    }
                }

                // Prefer tool event over text if both present
                if let Some(event) = tool_event {
                    return Some(event);
                }

                if !text_content.is_empty() {
                    return Some(AgentEvent::Message {
                        agent_id: agent_id.clone(),
                        content: text_content,
                    });
                }

                None
            }
            ClaudeMessage::Result {
                subtype,
                duration_ms,
            } => Some(AgentEvent::Result {
                agent_id: agent_id.clone(),
                success: subtype == "success",
                duration_ms: duration_ms.unwrap_or(0),
            }),
            ClaudeMessage::Error { error } => Some(AgentEvent::Error {
                agent_id: agent_id.clone(),
                message: error.message.unwrap_or_else(|| "Unknown error".to_string()),
            }),
            ClaudeMessage::Unknown => None,
        }
    }

    pub async fn stop_agent(&self, agent_id: &AgentId) -> Result<(), AgentError> {
        let mut agents = self.agents.write().await;
        if let Some(mut handle) = agents.remove(agent_id) {
            let _ = handle.child.kill().await;
            Ok(())
        } else {
            Err(AgentError::NotFound)
        }
    }

    pub async fn stop_all(&self) {
        let mut agents = self.agents.write().await;
        for (_, mut handle) in agents.drain() {
            let _ = handle.child.kill().await;
        }
    }

    pub async fn list_agents(&self) -> Vec<AgentId> {
        self.agents.read().await.keys().cloned().collect()
    }

    pub async fn is_running(&self, agent_id: &AgentId) -> bool {
        self.agents.read().await.contains_key(agent_id)
    }
}

impl Default for AgentManager {
    fn default() -> Self {
        Self::new()
    }
}
