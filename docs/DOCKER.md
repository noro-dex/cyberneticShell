# Docker Setup Guide

This guide explains how to run Claude Command Center in a Docker container while maintaining access to host system CLI tools (claude, agent, kilo, etc.).

## Architecture

The Docker setup uses **volume mounts** to access host CLI binaries directly, eliminating the need for a bridge service. The container mounts common installation paths from the host and adds them to the container's PATH.

```
Host System                    Docker Container
├── /usr/local/bin/claude ────► /host/usr/local/bin/claude
├── ~/.cargo/bin/agent    ────► /host/home/.cargo/bin/agent
└── ~/.local/bin/kilo     ────► /host/home/.local/bin/kilo
                                ↓
                          Added to PATH
```

## Prerequisites

- Docker and Docker Compose installed
- CLI tools installed on the host system (claude, agent, etc.)
- At least 2GB free disk space for the Docker image

## Quick Start

1. **Build the Docker image:**
   ```bash
   ./scripts/build-docker.sh
   ```

2. **Run the container:**
   ```bash
   ./scripts/run-docker.sh
   ```

3. **Access the application:**
   - Open http://localhost:1420 in your browser

## Manual Setup

### Build

```bash
docker build -t claude-command-center:latest .
```

### Run with docker-compose

```bash
docker-compose up -d
```

### Run directly

```bash
docker run -d \
  --name claude-command-center \
  -p 1420:1420 \
  -v /usr/local/bin:/host/usr/local/bin:ro \
  -v /usr/bin:/host/usr/bin:ro \
  -v ${HOME}/.local/bin:/host/home/.local/bin:ro \
  -v ${HOME}/.cargo/bin:/host/home/.cargo/bin:ro \
  -v ${HOME}/.bun/bin:/host/home/.bun/bin:ro \
  -v ${HOME}:/host/home:ro \
  -v ${HOME}/Documents:/workspace:rw \
  --network host \
  claude-command-center:latest
```

## Volume Mounts

The `docker-compose.yml` mounts the following paths from the host:

| Host Path | Container Path | Purpose |
|-----------|---------------|---------|
| `/usr/local/bin` | `/host/usr/local/bin` | System-wide CLI tools |
| `/usr/bin` | `/host/usr/bin` | System binaries |
| `/bin` | `/host/bin` | Core system binaries |
| `~/.local/bin` | `/host/home/.local/bin` | User-installed tools |
| `~/.cargo/bin` | `/host/home/.cargo/bin` | Rust/Cargo binaries |
| `~/.bun/bin` | `/host/home/.bun/bin` | Bun binaries |
| `~` | `/host/home` | Home directory (for skills: `~/.claude/skills`) |
| `~/Documents` | `/workspace` | Working directory for agents |

All binary paths are mounted as **read-only** (`:ro`) for security. The home directory is also read-only, except for the workspace directory which is read-write.

## PATH Configuration

The container's PATH is configured to include all mounted host binary directories:

```
/host/usr/local/bin:/host/home/.local/bin:/host/home/.cargo/bin:/host/home/.bun/bin:/host/usr/bin:/host/bin
```

This allows the Tauri backend to find and execute CLI tools using `Command::new("claude")` just like it would on the host.

## CLI Detection

The container can detect CLI tools installed on the host:

- ✅ `claude` - Claude CLI
- ✅ `agent` - Cursor Agent CLI
- ✅ `kilo` / `kilocode` - Kilo CLI
- ✅ `gemini` - Gemini CLI
- ✅ `grok` - Grok CLI
- ✅ `deepseek` - DeepSeek CLI

Detection works automatically because the binaries are in the container's PATH.

## Troubleshooting

### CLI not found

If a CLI tool is not detected:

1. **Check if it's installed on the host:**
   ```bash
   which claude
   ```

2. **Check if the path is mounted:**
   ```bash
   docker exec claude-command-center ls /host/usr/local/bin
   ```

3. **Check container PATH:**
   ```bash
   docker exec claude-command-center echo $PATH
   ```

4. **Add custom mount** to `docker-compose.yml` if the CLI is in a non-standard location:
   ```yaml
   volumes:
     - /custom/path/to/cli:/host/custom/path/to/cli:ro
   ```

### Container won't start

1. **Check logs:**
   ```bash
   docker-compose logs
   ```

2. **Check port availability:**
   ```bash
   lsof -i :1420
   ```

3. **Verify Docker has enough resources:**
   - Minimum 2GB RAM
   - Minimum 5GB disk space

### GUI/Display issues

If you need GUI support (for Tauri window), uncomment the X11 forwarding section in `docker-compose.yml`:

```yaml
volumes:
  - /tmp/.X11-unix:/tmp/.X11-unix:rw
devices:
  - /dev/dri:/dev/dri
```

And set:
```bash
xhost +local:docker
```

## Development

### Rebuild after changes

```bash
./scripts/build-docker.sh
docker-compose up -d --build
```

### View logs

```bash
docker-compose logs -f
```

### Stop container

```bash
docker-compose down
```

### Access container shell

```bash
docker exec -it claude-command-center /bin/bash
```

## Security Considerations

- All binary mounts are **read-only** to prevent container from modifying host binaries
- Home directory is mounted read-only (except workspace)
- Network mode is set to `host` for simplicity, but can be changed to bridge mode if needed
- Consider adding authentication if exposing to network

## Performance

- First build: ~10-15 minutes (downloads dependencies)
- Subsequent builds: ~5-10 minutes (uses cache)
- Container startup: ~2-5 seconds
- Memory usage: ~200-500MB

## Limitations

- CLI tools must be installed on the host system
- Container cannot install new CLI tools (mounts are read-only)
- Some CLIs may have dependencies that aren't available in the container
- GUI mode requires X11 forwarding setup

## Alternative: Bridge Service

If mounting binaries doesn't work for your use case, see the original plan in the conversation history for a bridge service approach.
