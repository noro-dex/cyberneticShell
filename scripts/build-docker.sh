#!/bin/bash
# Build Docker image for Claude Command Center

set -e

echo "Building Claude Command Center Docker image..."

# Get the project name from package.json or use default
PROJECT_NAME="claude-command-center"
IMAGE_NAME="${PROJECT_NAME}:latest"

# Build the Docker image
docker build -t "${IMAGE_NAME}" .

echo "✅ Docker image built successfully: ${IMAGE_NAME}"
echo ""
echo "To run the container:"
echo "  docker-compose up -d"
echo "  or"
echo "  ./scripts/run-docker.sh"
