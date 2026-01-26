# Migration to Bun

This project uses **Bun** as the package manager and runtime instead of npm.

## Why Bun?

- **Faster**: Bun is significantly faster than npm for package installation and script execution
- **Built-in TypeScript**: No need for separate TypeScript compilation step
- **Better performance**: Faster runtime and build times
- **Compatible**: Works with existing npm packages and scripts

## Installation

If you don't have Bun installed:

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows
powershell -c "irm bun.sh/install.ps1 | iex"
```

## Usage

### Installing Dependencies

```bash
# Install all dependencies
bun install

# Add a new dependency
bun add <package-name>

# Add a dev dependency
bun add -d <package-name>
```

### Running Scripts

All scripts in `package.json` use `bun run`:

```bash
# Development
bun run dev          # Web dev mode
bun run dev:web      # Explicit web dev
bun run dev:tauri    # Tauri dev mode

# Production builds
bun run build        # Web build
bun run build:web    # Explicit web build
bun run build:tauri  # Tauri build
```

### Direct Execution

Bun can also execute scripts directly:

```bash
bun vite --mode web
bun tauri dev
```

## Package Manager Commands

| npm | bun |
|-----|-----|
| `npm install` | `bun install` |
| `npm run <script>` | `bun run <script>` |
| `npm add <pkg>` | `bun add <pkg>` |
| `npm add -D <pkg>` | `bun add -d <pkg>` |
| `npm remove <pkg>` | `bun remove <pkg>` |
| `npm update` | `bun update` |

## Lock Files

- **Bun**: Uses `bun.lockb` (binary lock file)
- **npm**: Uses `package-lock.json` (if present, can be ignored)

The project includes `bun.lockb` for reproducible installs.

## Tauri Configuration

The `src-tauri/tauri.conf.json` is already configured to use Bun:

```json
{
  "build": {
    "beforeDevCommand": "bun run dev",
    "beforeBuildCommand": "bun run build"
  }
}
```

## Notes

- Bun is compatible with npm packages
- Scripts work the same way as with npm
- Bun.lockb is the lock file (binary format)
- All documentation has been updated to use `bun` commands
