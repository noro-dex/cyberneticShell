# Multi-stage build for Tauri application
FROM rust:1.75-slim as rust-builder

# Install Tauri build dependencies
RUN apt-get update && apt-get install -y \
    libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    xz-utils \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

# Copy package files first for better caching
COPY package.json bun.lock* ./
COPY vite.config.ts tsconfig.json tsconfig.node.json ./
COPY tailwind.config.js postcss.config.js ./
COPY index.html ./

# Copy frontend source
COPY src ./src
COPY public ./public

# Install frontend dependencies
RUN bun install

# Copy Rust project
COPY src-tauri ./src-tauri

# Build frontend
RUN bun run build

# Build Rust backend
WORKDIR /app/src-tauri
# Build the binary (package name becomes binary name)
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies for Tauri
RUN apt-get update && apt-get install -y \
    libwebkit2gtk-4.1-0 \
    libgtk-3-0 \
    libayatana-appindicator3-1 \
    librsvg2-2 \
    ca-certificates \
    curl \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built binary from builder
# Cargo creates binary with package name from Cargo.toml
COPY --from=rust-builder /app/src-tauri/target/release/claude-command-center /app/claude-command-center
COPY --from=rust-builder /app/dist /app/dist
COPY --from=rust-builder /app/src-tauri/tauri.conf.json /app/tauri.conf.json
COPY --from=rust-builder /app/src-tauri/capabilities /app/capabilities

# Create directories for mounted host binaries
RUN mkdir -p /host/usr/local/bin \
    /host/home/.local/bin \
    /host/home/.cargo/bin \
    /host/home/.bun/bin \
    /host/usr/bin \
    /host/bin

# Set PATH to include mounted host binaries (these will be mounted from host)
ENV PATH="/host/usr/local/bin:/host/home/.local/bin:/host/home/.cargo/bin:/host/home/.bun/bin:/host/usr/bin:/host/bin:${PATH}"

# Expose port for web UI
EXPOSE 1420

# Run the application
CMD ["/app/claude-command-center"]
