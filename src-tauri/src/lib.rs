mod agent_manager;
mod commands;
mod types;

use std::sync::Arc;

use agent_manager::AgentManager;
use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let manager = Arc::new(AgentManager::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(manager.clone())
        .invoke_handler(tauri::generate_handler![
            start_agent,
            stop_agent,
            stop_all_agents,
            list_agents,
            check_cli_available,
            check_cursor_cli_available,
            check_kilo_cli_available,
            check_gemini_cli_available,
            check_grok_cli_available,
            check_deepseek_cli_available,
            list_skills,
            get_skill,
        ])
        .on_window_event({
            let manager = manager.clone();
            move |_window, event| {
                if let tauri::WindowEvent::CloseRequested { .. } = event {
                    let manager = manager.clone();
                    tauri::async_runtime::spawn(async move {
                        manager.stop_all().await;
                    });
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
