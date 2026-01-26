# Build Quick Reference

## Quick Start

### Web Development
```bash
bun run dev:web
# Starts Vite dev server on port 5173
# Connect to server at http://localhost:3000
```

### Tauri Development
```bash
bun run dev:tauri
# Starts Tauri dev mode on port 1420
# Uses Tauri commands (no server needed)
```

### Web Production Build
```bash
bun run build:web
# Builds to dist/ directory
# Serve with src-server on port 3000
```

### Tauri Production Build
```bash
bun run build:tauri
# Builds web first, then creates Tauri app
# Output: platform-specific binaries
```

## Script Summary

| Script | Purpose | Port | Output |
|--------|---------|------|--------|
| `dev` / `dev:web` | Web dev mode | 5173 | - |
| `dev:tauri` | Tauri dev mode | 1420 | - |
| `build` / `build:web` | Web production | - | `dist/` |
| `build:tauri` | Tauri production | - | Native app |
| `tauri:dev` | Tauri CLI dev | 1420 | - |
| `tauri:build` | Tauri CLI build | - | Native app |

## Environment Variables

### For Web Mode
```bash
VITE_API_URL=http://localhost:3000
```

### For Tauri Mode
Tauri sets these automatically:
- `TAURI_PLATFORM` (macos/windows/linux)
- `TAURI_FAMILY` (unix/windows)
- `TAURI_DEBUG` (1/0)

## Common Workflows

### Developing Web Version
1. Start server: `cd src-server && cargo run`
2. Start frontend: `bun run dev:web`
3. Open: `http://localhost:3000`

### Developing Tauri Version
1. Start Tauri: `bun run dev:tauri`
2. Tauri window opens automatically

### Building for Deployment
1. Web: `bun run build:web` → serve `dist/` with server
2. Tauri: `bun run build:tauri` → get native app
