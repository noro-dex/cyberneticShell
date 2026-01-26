#!/bin/bash
# Run Claude Command Center in Docker

set -e

echo "Starting Claude Command Center in Docker..."

# Check if image exists
if ! docker images | grep -q "claude-command-center"; then
    echo "⚠️  Docker image not found. Building..."
    ./scripts/build-docker.sh
fi

# Start with docker-compose
docker-compose up -d

echo "✅ Container started!"
echo ""
echo "Access the application at: http://localhost:1420"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop:"
echo "  docker-compose down"
