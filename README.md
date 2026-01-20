# ClaudeCraft
GUI layer for Agent Visualization

## Run (Tauri + web UI)

```bash
bash scripts/dev.sh
```

Uses **bun**: runs `bun install` if needed, then `bun run tauri:dev` (Vite on port 1420 + Rust backend in a native window). Requires [bun](https://bun.sh) installed.

## Docs

- [src-tauri structure & design](docs/SRC_TAURI.md) — Tauri v2 backend: layout, modules, IPC, and patterns.
