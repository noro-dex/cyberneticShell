# ClaudeCraft
GUI layer for Agent Visualization

## Run (Tauri + web UI)

### Native Development

```bash
bash scripts/dev.sh
```

Uses **bun**: runs `bun install` if needed, then `bun run tauri:dev` (Vite on port 1420 + Rust backend in a native window). Requires [bun](https://bun.sh) installed.

### Docker

Run in Docker container with access to host CLI tools:

```bash
# Build and run
./scripts/build-docker.sh
./scripts/run-docker.sh

# Access at http://localhost:1420
```

See [Docker Setup Guide](docs/DOCKER.md) for detailed instructions.

## Docs

- [src-tauri structure & design](docs/SRC_TAURI.md) — Tauri v2 backend: layout, modules, IPC, and patterns.
- [Docker setup](docs/DOCKER.md) — Running in Docker with host CLI access.
