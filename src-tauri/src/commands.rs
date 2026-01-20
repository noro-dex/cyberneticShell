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
