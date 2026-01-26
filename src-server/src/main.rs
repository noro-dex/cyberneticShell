mod routes;
mod websocket;

use std::sync::Arc;
use axum::{
    extract::Extension,
    routing::{get, post},
    Router,
};
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use giga_command_center_core::AgentManager;
use tokio::sync::broadcast;

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Create shared state
    let manager = Arc::new(AgentManager::new());
    
    // Create broadcast channel for WebSocket events
    let (event_tx, _) = broadcast::channel::<String>(1000);
    let event_tx = Arc::new(event_tx);

    // Build application with routes
    let app = Router::new()
        // API routes
        .route("/api/agents", post(routes::start_agent))
        .route("/api/agents/:id", axum::routing::delete(routes::stop_agent))
        .route("/api/agents", get(routes::list_agents))
        .route("/api/agents/all", axum::routing::delete(routes::stop_all_agents))
        .route("/api/cli/check/:cli", get(routes::check_cli_available))
        .route("/api/skills", get(routes::list_skills))
        .route("/api/skills/:name", get(routes::get_skill))
        // WebSocket route
        .route("/ws", get(websocket::websocket_handler))
        // Static file serving (for frontend)
        .nest_service("/", ServeDir::new("../dist"))
        // Add CORS
        .layer(CorsLayer::permissive())
        // Add shared state
        .layer(Extension(manager))
        .layer(Extension(event_tx));

    // Start server
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .expect("Failed to bind to address");
    
    tracing::info!("Server listening on http://0.0.0.0:3000");
    
    axum::serve(listener, app)
        .await
        .expect("Server failed to start");
}
