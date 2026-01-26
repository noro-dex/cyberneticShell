# System Design: Dual Executable Architecture

This document describes the system design for supporting both Tauri desktop application and web server (HTTP/WebSocket) executables with shared core library.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Shared Core Library                       │
│  (giga-command-center-core)                                  │
│  - AgentManager                                              │
│  - Types (AgentConfig, AgentEvent, etc.)                    │
│  - CLI argument builders                                     │
│  - Process management                                        │
└─────────────────────────────────────────────────────────────┘
                          ▲
                          │
        ┌─────────────────┴─────────────────┐
        │                                     │
┌───────▼────────┐                  ┌────────▼────────┐
│  Tauri Binary  │                  │  Web Server     │
│  (Desktop App) │                  │  (HTTP/WS)      │
│                │                  │                 │
│  - Tauri       │                  │  - Axum         │
│    commands    │                  │  - HTTP routes │
│  - Tauri       │                  │  - WebSocket   │
│    events      │                  │  - Static files │
└────────────────┘                  └─────────────────┘
```

---

## 2. Directory Structure

```
ClaudeCraftShell/
├── Cargo.toml                    # Workspace root
├── src/                          # Frontend (React/Vite)
├── src-tauri/                    # Tauri binary
│   ├── Cargo.toml
│   ├── build.rs
│   ├── tauri.conf.json
│   └── src/
│       ├── main.rs               # Thin entry point
│       ├── lib.rs                # Tauri-specific wrapper
│       └── commands.rs           # Tauri command handlers
├── src-server/                    # Web server binary
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs               # HTTP/WebSocket server
│       ├── routes.rs              # HTTP route handlers
│       └── websocket.rs           # WebSocket handlers
└── crates/
    └── giga-command-center-core/ # Shared library
        ├── Cargo.toml
        └── src/
            ├── lib.rs
            ├── agent_manager.rs
            ├── types.rs
            └── cli_builders.rs
```

---

## 3. Implementation Status

✅ **Completed:**
- Workspace root Cargo.toml created
- Core library crate structure created
- Shared code (agent_manager, types, cli_builders) moved to core library
- Tauri binary updated to use core library
- Web server binary structure created
- HTTP routes and WebSocket handlers implemented

⏳ **Pending:**
- Frontend adaptation to support both Tauri and web environments
- Testing both executables
- Build scripts for both platforms

---

## 4. Build Commands

```bash
# Build Tauri app
cd src-tauri && cargo build --release

# Build web server
cd src-server && cargo build --release

# Build both
cargo build --workspace --release

# Run Tauri dev
cd src-tauri && cargo tauri dev

# Run web server
cd src-server && cargo run
```

---

## 5. Key Design Decisions

### 5.1 Event Emitter Abstraction

The `AgentManager` uses a closure-based event emitter pattern:

```rust
pub async fn start_agent<F>(
    &self,
    config: AgentConfig,
    emit_event: F,
) -> Result<AgentId, AgentError>
where
    F: Fn(AgentEvent) + Send + Sync + Clone + 'static,
```

This allows:
- **Tauri**: `emit_event` calls `app.emit("agent-event", &event)`
- **WebSocket**: `emit_event` sends JSON over WebSocket via broadcast channel

### 5.2 Code Sharing

✅ **Shared (in core library):**
- `AgentManager` - process management
- `AgentConfig`, `AgentEvent`, `AgentError` - types
- CLI argument builders
- Event parsing logic

❌ **Platform-Specific:**
- Tauri: `tauri::command` handlers, `AppHandle`, Tauri events
- Server: HTTP routes, WebSocket handlers, Axum setup

---

## 6. Next Steps

1. Update frontend to detect environment and use appropriate APIs
2. Test Tauri binary with core library
3. Test web server with HTTP/WebSocket
4. Add build scripts for both executables
5. Update Docker configuration if needed
