use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

use crate::agent_manager::AgentManager;
use crate::types::*;

#[tauri::command]
pub async fn start_agent(
    app: AppHandle,
    manager: State<'_, Arc<AgentManager>>,
    config: AgentConfig,
) -> Result<AgentId, String> {
    println!("[CCC] Starting agent with prompt: {}", config.prompt);

    let app_clone = app.clone();
    let emit_event = move |event: AgentEvent| {
        println!("[CCC] Emitting event: {:?}", event);
        if let Err(e) = app_clone.emit("agent-event", &event) {
            eprintln!("[CCC] Failed to emit event: {}", e);
        }
    };

    match manager.start_agent(config, emit_event).await {
        Ok(agent_id) => {
            println!("[CCC] Agent started successfully: {}", agent_id);
            Ok(agent_id)
        }
        Err(e) => {
            eprintln!("[CCC] Failed to start agent: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn stop_agent(
    app: AppHandle,
    manager: State<'_, Arc<AgentManager>>,
    agent_id: AgentId,
) -> Result<(), String> {
    manager
        .stop_agent(&agent_id)
        .await
        .map_err(|e| e.to_string())?;

    let _ = app.emit(
        "agent-event",
        &AgentEvent::Stopped {
            agent_id,
            reason: StopReason::Cancelled,
        },
    );

    Ok(())
}

#[tauri::command]
pub async fn stop_all_agents(manager: State<'_, Arc<AgentManager>>) -> Result<(), String> {
    manager.stop_all().await;
    Ok(())
}

#[tauri::command]
pub async fn list_agents(manager: State<'_, Arc<AgentManager>>) -> Result<Vec<AgentId>, String> {
    Ok(manager.list_agents().await)
}

#[tauri::command]
pub fn check_cli_available() -> Result<bool, String> {
    match Command::new("claude").arg("--version").output() {
        Ok(output) => Ok(output.status.success()),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
pub fn list_skills() -> Result<Vec<SkillInfo>, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let skills_dir = home.join(".claude").join("skills");

    if !skills_dir.exists() {
        return Ok(vec![]);
    }

    let mut skills = Vec::new();

    let entries = fs::read_dir(&skills_dir).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            let skill_md = path.join("SKILL.md");
            if skill_md.exists() {
                if let Ok(content) = fs::read_to_string(&skill_md) {
                    if let Some(info) = parse_skill_frontmatter(&content, &path) {
                        skills.push(info);
                    }
                }
            }
        }
    }

    Ok(skills)
}

#[tauri::command]
pub fn get_skill(skill_name: String) -> Result<SkillDetail, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let skill_path = home.join(".claude").join("skills").join(&skill_name);
    let skill_md = skill_path.join("SKILL.md");

    if !skill_md.exists() {
        return Err(format!("Skill '{}' not found", skill_name));
    }

    let content = fs::read_to_string(&skill_md).map_err(|e| e.to_string())?;
    let info = parse_skill_frontmatter(&content, &skill_path)
        .ok_or_else(|| "Failed to parse skill".to_string())?;

    // Extract content after frontmatter
    let markdown = extract_markdown_content(&content);

    Ok(SkillDetail {
        info,
        markdown,
        path: skill_path.to_string_lossy().to_string(),
    })
}

fn parse_skill_frontmatter(content: &str, path: &PathBuf) -> Option<SkillInfo> {
    let lines: Vec<&str> = content.lines().collect();

    // Look for YAML frontmatter
    if lines.first()? != &"---" {
        // No frontmatter, try to extract from directory name
        let name = path.file_name()?.to_string_lossy().to_string();
        return Some(SkillInfo {
            name: name.clone(),
            description: format!("Custom skill: {}", name),
        });
    }

    let mut end_index = None;
    for (i, line) in lines.iter().enumerate().skip(1) {
        if *line == "---" {
            end_index = Some(i);
            break;
        }
    }

    let end_index = end_index?;
    let frontmatter: Vec<&str> = lines[1..end_index].to_vec();

    let mut name = path.file_name()?.to_string_lossy().to_string();
    let mut description = String::new();

    for line in frontmatter {
        if let Some(value) = line.strip_prefix("name:") {
            name = value.trim().to_string();
        } else if let Some(value) = line.strip_prefix("description:") {
            description = value.trim().to_string();
        }
    }

    Some(SkillInfo { name, description })
}

fn extract_markdown_content(content: &str) -> String {
    let lines: Vec<&str> = content.lines().collect();

    if lines.first().map(|l| *l) != Some("---") {
        return content.to_string();
    }

    let mut end_index = None;
    for (i, line) in lines.iter().enumerate().skip(1) {
        if *line == "---" {
            end_index = Some(i);
            break;
        }
    }

    if let Some(end_index) = end_index {
        lines[end_index + 1..].join("\n").trim().to_string()
    } else {
        content.to_string()
    }
}
