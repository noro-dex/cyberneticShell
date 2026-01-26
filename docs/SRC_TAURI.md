# src-tauri Structure & Design

Documentation for the Tauri v2 backend in `ClaudeCraftShell/src-tauri`: layout, modules, IPC, and patterns.

---

## 1. Directory Layout

```
src-tauri/
├── build.rs              # Tauri build script (tauri_build::build)
├── Cargo.toml            # Rust crate manifest and dependencies
├── Cargo.lock
├── tauri.conf.json       # Tauri v2 app configuration
├── capabilities/
│   └── default.json      # Permissions and shell allowlist
├── gen/schemas/          # Generated ACL/schema files (build artifact)
├── icons/                # App icons (png, ico, icns)
└── src/
    ├── main.rs           # Entry point; delegates to lib::run
    ├── lib.rs            # App builder, invoke handlers, managed state
    ├── commands.rs       # Tauri commands (invoke from frontend)
    ├── agent_manager.rs  # Spawns and manages Claude CLI subprocesses
    └── types.rs          # Serde DTOs and enums
```

---

## 2. Design Patterns

| Concern | Pattern | Location |
|--------|---------|----------|
| Entry point | Thin `main` → `lib::run()` | `main.rs` |
| Shared state | `Arc<AgentManager>` via `tauri::manage()` | `lib.rs` |
| IPC | Commands (request/response) + one-way events | `commands.rs`, `agent_manager.rs` |
| Subprocess | `tokio::process::Command`; line-based stdout/stderr | `agent_manager.rs` |
| CLI contract | `claude` or `agent` (Cursor) with `--output-format stream-json` | `agent_manager` builds args per `CliType` |

---

## 3. Module Overview

### 3.1 `main.rs`

- `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]` for Windows GUI (no console in release).
- Calls `claude_command_center_lib::run()`.

### 3.2 `lib.rs`

- **Modules:** `agent_manager`, `commands`, `types`.
- **App setup:**
  - `tauri_plugin_shell::init()` for shell/process capabilities.
  - `manage(Arc::new(AgentManager::new()))` for shared backend state.
  - `invoke_handler` registers:  
    `start_agent`, `stop_agent`, `stop_all_agents`, `list_agents`,  
    `check_cli_available`, `check_cursor_cli_available`, `list_skills`, `get_skill`.
- **Lifecycle:** `on_window_event` on `CloseRequested` runs `manager.stop_all().await` in the async runtime so all agents are killed on app close.

### 3.3 `commands.rs`

All functions are `#[tauri::command]` and can be called from the frontend via `invoke`.

| Command | Returns | Role |
|---------|---------|------|
| `start_agent` | `AgentId` | Starts a CLI process (`claude` or `agent` per `config.cli`); wires `emit_event` → `app.emit("agent-event", …)`. |
| `stop_agent` | `()` | Stops one agent; emits `Stopped` with `Cancelled`. |
| `stop_all_agents` | `()` | Stops all agents. |
| `list_agents` | `Vec<AgentId>` | Lists active agent IDs. |
| `check_cli_available` | `bool` | Runs `claude --version`; `true` if success. |
| `check_cursor_cli_available` | `bool` | Runs `agent --version`; `true` if [Cursor Agent CLI](https://cursor.com/docs/cli/overview) is installed. |
| `list_skills` | `Vec<SkillInfo>` | Scans `~/.claude/skills/*/SKILL.md`; parses YAML frontmatter. (Claude-only.) |
| `get_skill` | `SkillDetail` | Reads one skill’s `SKILL.md` (frontmatter + markdown body). (Claude-only.) |

**Skills:** `parse_skill_frontmatter` reads `name:` and `description:` from `---`-delimited YAML; `extract_markdown_content` returns the rest of the file after the frontmatter.

### 3.4 `agent_manager.rs`

**Types:**

- `AgentHandle`: `id`, `workspace_id`, `child: Child`.
- `AgentManager`: `agents: Arc<RwLock<HashMap<AgentId, AgentHandle>>>`.

**`start_agent`:**

1. Chooses CLI from `config.cli` (`Claude` default or `Cursor`). `build_claude_args` / `build_cursor_args` build the arg list.
   - **Claude:** `-p`, `--output-format stream-json`, `--verbose`, `--permission-mode bypassPermissions`; optional `--model`, `--system-prompt`, `--allowedTools`; `working_directory` as `current_dir`.
   - **Cursor ([Cursor CLI](https://cursor.com/docs/cli/overview)):** `-p`, `--output-format stream-json`; optional `--model`, `--mode` (`agent`|`plan`|`ask`). `working_directory` as `current_dir`. Cursor does not use `--system-prompt`, `--allowedTools`, or `--permission-mode`.
2. Spawns `Command::new(binary)` (`claude` or `agent`) with piped stdout/stderr.
3. Emits `Started`, then:
   - **Stderr:** `BufReader::new(stderr).lines()` → for each non-empty line, `AgentEvent::Error { message: "CLI: " + line }`.
   - **Stdout:** `process_output` → `parse_line` (JSON) → `convert_message` → `AgentEvent` (Init, Message, ToolUse, ToolResult, Result, Error, Stopped).
4. When the stdout reader completes, waits on `child`, emits `Result` then `Stopped`, and removes the handle from the map.

**`convert_message`** maps Claude stream-json to `AgentEvent`:

- `init` → `Init` (session_id, model).
- `assistant` with `content` blocks:
  - `text` → appended; if any text and no tool event, `Message`.
  - `tool_use` → `ToolUse` (stores `last_tool_name` for pairing).
  - `tool_result` → `ToolResult` using `last_tool_name`, `success = !is_error`.
- `result` → `Result` (success from subtype, duration_ms).
- `error` → `Error` (message from error object).

**`stop_agent`:** `agents.remove` + `child.kill().await`.  
**`stop_all`:** `drain` + `kill`.  
**`list_agents`:** keys of the map.

### 3.5 `types.rs`

**IDs:** `AgentId`, `WorkspaceId` = `String`.

**`CliType`:** `claude` (default) or `cursor`. Serde `rename_all = "lowercase"`.

**`AgentConfig`:** `workspace_id`, `prompt`; optional `cli` (`CliType`), `mode` (Cursor: `agent`|`plan`|`ask`), `allowed_tools`, `working_directory`, `system_prompt`, `model`. Serde `rename_all = "camelCase"`.

**`AgentEvent`:** `#[serde(tag = "type")]` enum used for `agent-event`:

- `Started` (agent_id, workspace_id)
- `Init` (agent_id, session_id, model)
- `Message` (agent_id, content)
- `ToolUse` (agent_id, tool_name, tool_input)
- `ToolResult` (agent_id, tool_name, success)
- `Result` (agent_id, success, duration_ms)
- `Error` (agent_id, message)
- `Stopped` (agent_id, reason: `StopReason`)

**`StopReason`:** `Completed`, `Cancelled`, `Error` (serde `lowercase`).

**`AgentError`:** `SpawnFailed`, `ProcessError`, `NotFound`, `AlreadyRunning`, `CliNotAvailable`; implements `Display` and `std::error::Error`.

**Claude stream-json (internal):**

- `ClaudeMessage`: `init`, `assistant`, `result`, `error`, `Unknown` (tag = `"type"`).
- `AssistantMessage`: `role`, `content: Vec<ContentBlock>`.
- `ContentBlock`: `text`, `tool_use` (id, name, input), `tool_result` (tool_use_id, content, is_error), `Unknown`.
- `ErrorInfo`: `message` (optional).

**Skills:** `SkillInfo` (name, description); `SkillDetail` (info, markdown, path).

---

## 4. Tauri v2 Configuration

### 4.1 `tauri.conf.json`

- **Build:** `beforeDevCommand`: `bun run dev`; `devUrl`: `http://localhost:1420`; `beforeBuildCommand`: `bun run build`; `frontendDist`: `../dist`.
- **App:** `withGlobalTauri: true`; one window “Claude Command Center”, 1400×900, min 1000×700; `csp: null`.
- **Bundle:** `active: true`, `targets: "all"`.

### 4.2 `capabilities/default.json`

- `core:default`, `shell:allow-spawn`, `shell:allow-kill`.
- `shell:allow-spawn` allowlist: `claude` and `agent` (Cursor) with `args: true`.

---

## 5. Frontend ↔ Backend Contract

### 5.1 Invoke (commands)

| Frontend call | Backend command | Payload |
|---------------|-----------------|---------|
| `invoke<string>('start_agent', { config })` | `start_agent` | `AgentConfig` (`cli?`, `mode?` for Cursor) |
| `invoke('stop_agent', { agentId })` | `stop_agent` | `AgentId` |
| `invoke('stop_all_agents')` | `stop_all_agents` | — |
| `invoke<Vec<string>>('list_agents')` | `list_agents` | — |
| `invoke<boolean>('check_cli_available')` | `check_cli_available` | — |
| `invoke<boolean>('check_cursor_cli_available')` | `check_cursor_cli_available` | — |
| `invoke<SkillInfo[]>('list_skills')` | `list_skills` | — |
| `invoke<SkillDetail>('get_skill', { skillName })` | `get_skill` | `skill_name: String` |

### 5.2 Events

- **Channel:** `agent-event`.
- **Payload:** `AgentEvent` (same shapes as in `types.rs`); frontend uses `listen<AgentEvent>('agent-event', …)`.
- **Flow:** Frontend calls `start_agent` → backend spawns `claude` or `agent` (per `config.cli`) and returns `AgentId`; backend streams `AgentEvent`s; frontend updates Zustand (`agents`, `workspaces`, `ui`) and workflow (e.g. `trigger-workflow-task` when a step succeeds).

---

## 6. Dependencies (Cargo.toml)

| Crate | Role |
|-------|------|
| `tauri` 2 | App, window, IPC (features: devtools). |
| `tauri-plugin-shell` 2 | Shell/process (spawn, kill). |
| `tauri-build` | Build script. |
| `serde`, `serde_json` | (De)serialization for config, events, Claude JSON. |
| `tokio` | Async; features: sync, process, io-util, macros. |
| `uuid` (v4) | `AgentId` generation. |
| `dirs` 5 | `home_dir()` for `~/.claude/skills`. |

---

## 7. Notable Design Choices

| Choice | Rationale |
|--------|-----------|
| `stream-json` + line-delimited JSON | Simple streaming from `claude` without a custom binary protocol. |
| Single `agent-event` channel | One event type with `type` discriminator; frontend switches on `data.type`. |
| `Arc<RwLock<HashMap>>` for agents | Safe shared map across async tasks (spawn, stop, list). |
| Emit stderr as `Error` | CLI logs and errors surface in the UI without separate stderr handling. |
| Skills from `~/.claude/skills` | Extensibility via `SKILL.md` and frontmatter; no code changes. |
| `on_window_event` + `stop_all` | All CLI processes (`claude` / `agent`) are killed on window close. |
| `cli` + `mode` on `AgentConfig` | Enables [Cursor Agent CLI](https://cursor.com/docs/cli/overview) (`agent`) with modes `agent`/`plan`/`ask` alongside Claude. |

---

## 8. Cursor Agent CLI

The backend supports the [Cursor Agent CLI](https://cursor.com/docs/cli/overview) (`agent`) in addition to Claude (`claude`):

- **Config:** Set `config.cli` to `"cursor"` and optionally `config.mode` to `"agent"`, `"plan"`, or `"ask"`.
- **Check:** Use `check_cursor_cli_available`; install with `curl https://cursor.com/install -fsS | bash`.
- **Args:** Cursor gets `-p`, `--output-format stream-json`, optional `--model` and `--mode`. Output is parsed with the same stream-json logic as Claude; if Cursor uses a different format, unparseable lines are logged.

---

## 9. Summary

`src-tauri` is a focused Tauri v2 backend that:

- Wraps the `claude` or `agent` (Cursor) CLI as subprocesses,
- Exposes agent lifecycle and skills via Tauri commands,
- Streams line-delimited JSON into `AgentEvent`s over `agent-event`,
- Uses capabilities to restrict shell to `claude` and `agent`,

with a clear split: **types** (contracts), **commands** (handlers + skills), **agent_manager** (process lifecycle and stream parsing), and **lib** (wiring and lifecycle).
