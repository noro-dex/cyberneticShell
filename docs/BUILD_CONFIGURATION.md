# Build Configuration Review

## Current State

### Package.json Scripts
- `dev`: Generic Vite dev server (port 1420 - Tauri default)
- `build`: Generic Vite build (outputs to `dist/`)
- `tauri:dev`: Tauri development mode
- `tauri:build`: Tauri production build

### Issues Identified

1. **Ambiguous Build Scripts**
   - `build` doesn't clearly indicate it's for web
   - No distinction between web and Tauri builds in script names
   - Vite config is Tauri-focused (port 1420)

2. **Build Output**
   - Both web and Tauri builds output to `dist/`
   - Web build needs to be served by `src-server` (port 3000)
   - Tauri build uses `dist/` as frontend (correct)

3. **Development Modes**
   - `dev` uses port 1420 (Tauri default)
   - No dedicated web dev mode that connects to server on port 3000

4. **Configuration**
   - Vite config has Tauri-specific settings
   - No environment-based configuration for web vs Tauri

## Recommended Improvements

### 1. Separate Build Scripts
- `build:web` - Build for web deployment (server mode)
- `build:tauri` - Build for Tauri (uses web build output)
- `build` - Alias to `build:web` (default)

### 2. Separate Dev Scripts
- `dev:web` - Dev mode for web (connects to server on port 3000)
- `dev:tauri` - Dev mode for Tauri (port 1420)
- `dev` - Alias to `dev:web` (default)

### 3. Vite Configuration
- Use environment variables to detect build mode
- Different ports for web (5173) vs Tauri (1420)
- Different build targets if needed

### 4. Build Output
- Web build: `dist/` (served by src-server)
- Tauri build: Uses `dist/` from web build (correct)

## Implementation Plan

1. ✅ Update `package.json` scripts
2. ✅ Update `vite.config.ts` to support both modes
3. ✅ Add environment variable detection
4. ✅ Create example environment files
5. ✅ Update documentation

## Build Scripts Reference

### Development

```bash
# Web development (connects to server on port 3000)
bun run dev          # Alias for dev:web
bun run dev:web      # Explicit web dev mode

# Tauri development (uses port 1420)
bun run dev:tauri    # Tauri dev mode
bun run tauri:dev    # Alternative (Tauri CLI)
```

### Production Builds

```bash
# Web build (outputs to dist/ for server)
bun run build        # Alias for build:web
bun run build:web    # Explicit web build

# Tauri build (builds web first, then Tauri app)
bun run build:tauri  # Full Tauri build
bun run tauri:build  # Alternative (Tauri CLI)
```

### Build Output

- **Web build**: `dist/` directory
  - Served by `src-server` on port 3000
  - Contains optimized production bundle
  
- **Tauri build**: Native application
  - Uses `dist/` from web build as frontend
  - Creates platform-specific binaries
  - Output location depends on platform

## Environment Variables

### Web Mode
- `VITE_API_URL`: Server URL (default: `http://localhost:3000`)
- `VITE_MODE`: Build mode (optional, set by script)

### Tauri Mode
- `TAURI_PLATFORM`: Platform (macos, windows, linux)
- `TAURI_FAMILY`: Family (unix, windows)
- `TAURI_DEBUG`: Debug mode (1 or 0)

## Port Configuration

- **Web dev**: Port 5173 (Vite default)
- **Tauri dev**: Port 1420 (Tauri default)
- **Server**: Port 3000 (src-server)

## Build Differences

### Web Build
- Targets modern browsers (`esnext`)
- Optimized chunking for better caching
- Output: `dist/` for server deployment

### Tauri Build
- Targets specific browser versions (Chrome 105 / Safari 13)
- Smaller bundle size (no need for modern browser features)
- Uses web build output as frontend
- Creates native application bundle
