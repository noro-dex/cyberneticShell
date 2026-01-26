use axum::{
    extract::{Extension, Path},
    http::StatusCode,
    response::Json,
};
use std::sync::Arc;
use tokio::sync::broadcast;
use giga_command_center_core::{AgentManager, AgentConfig, AgentId, SkillInfo, SkillDetail, AgentEvent};
use tokio::process::Command;
use tokio::fs;
use std::path::PathBuf;

pub async fn start_agent(
    Extension(manager): Extension<Arc<AgentManager>>,
    Extension(event_tx): Extension<Arc<broadcast::Sender<String>>>,
    Json(config): Json<AgentConfig>,
) -> Result<Json<AgentId>, StatusCode> {
    // Create event emitter that sends to WebSocket channel
    let emit_event = move |event: AgentEvent| {
        if let Ok(json) = serde_json::to_string(&event) {
            let _ = event_tx.send(json);
        }
    };
    
    manager.start_agent(config, emit_event)
        .await
        .map(Json)
        .map_err(|e| {
            tracing::error!("Failed to start agent: {}", e);
            match e {
                giga_command_center_core::AgentError::CliNotAvailable => StatusCode::SERVICE_UNAVAILABLE,
                giga_command_center_core::AgentError::AlreadyRunning => StatusCode::CONFLICT,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            }
        })
}

pub async fn stop_agent(
    Extension(manager): Extension<Arc<AgentManager>>,
    Path(agent_id): Path<AgentId>,
) -> Result<StatusCode, StatusCode> {
    manager.stop_agent(&agent_id)
        .await
        .map(|_| StatusCode::NO_CONTENT)
        .map_err(|e| {
            tracing::debug!("Failed to stop agent {}: {}", agent_id, e);
            match e {
                giga_command_center_core::AgentError::NotFound => StatusCode::NOT_FOUND,
                _ => {
                    tracing::error!("Unexpected error stopping agent: {}", e);
                    StatusCode::INTERNAL_SERVER_ERROR
                }
            }
        })
}

pub async fn stop_all_agents(
    Extension(manager): Extension<Arc<AgentManager>>,
) -> StatusCode {
    manager.stop_all().await;
    StatusCode::NO_CONTENT
}

pub async fn list_agents(
    Extension(manager): Extension<Arc<AgentManager>>,
) -> Json<Vec<AgentId>> {
    Json(manager.list_agents().await)
}

pub async fn check_cli_available(
    Path(cli): Path<String>,
) -> Json<bool> {
    let binary = match cli.as_str() {
        "claude" => "claude",
        "cursor" => "agent",
        "kilo" => "kilo",
        "gemini" => "gemini",
        "grok" => "grok",
        "deepseek" => "deepseek",
        _ => return Json(false),
    };
    
    let result = Command::new(binary).arg("--version").output().await;
    Json(result.map(|o| o.status.success()).unwrap_or(false))
}

pub async fn list_skills() -> Result<Json<Vec<SkillInfo>>, StatusCode> {
    let home = dirs::home_dir().ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;
    let skills_dir = home.join(".claude").join("skills");

    if !skills_dir.exists() {
        return Ok(Json(vec![]));
    }

    let mut skills = Vec::new();
    let mut entries = fs::read_dir(&skills_dir).await.map_err(|e| {
        tracing::error!("Failed to read skills directory: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    while let Some(entry) = entries.next_entry().await.map_err(|e| {
        tracing::error!("Failed to read directory entry: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })? {
        let path = entry.path();
        let metadata = entry.metadata().await.map_err(|e| {
            tracing::error!("Failed to read entry metadata: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
        
        if metadata.is_dir() {
            let skill_md = path.join("SKILL.md");
            if skill_md.exists() {
                if let Ok(content) = fs::read_to_string(&skill_md).await {
                    if let Some(info) = parse_skill_frontmatter(&content, &path) {
                        skills.push(info);
                    }
                }
            }
        }
    }

    Ok(Json(skills))
}

pub async fn get_skill(
    Path(skill_name): Path<String>,
) -> Result<Json<SkillDetail>, StatusCode> {
    let home = dirs::home_dir().ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;
    let skill_path = home.join(".claude").join("skills").join(&skill_name);
    let skill_md = skill_path.join("SKILL.md");

    if !skill_md.exists() {
        return Err(StatusCode::NOT_FOUND);
    }

    let content = fs::read_to_string(&skill_md).await.map_err(|e| {
        tracing::error!("Failed to read skill file: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    let info = parse_skill_frontmatter(&content, &skill_path)
        .ok_or_else(|| {
            tracing::error!("Failed to parse skill frontmatter for: {}", skill_name);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let markdown = extract_markdown_content(&content);

    Ok(Json(SkillDetail {
        info,
        markdown,
        path: skill_path.to_string_lossy().to_string(),
    }))
}

fn parse_skill_frontmatter(content: &str, path: &PathBuf) -> Option<SkillInfo> {
    let lines: Vec<&str> = content.lines().collect();

    if lines.first()? != &"---" {
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
