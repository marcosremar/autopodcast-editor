#!/bin/bash
# Dev Server Monitor - Auto-restarts Next.js when memory exceeds threshold
# Usage: ./scripts/dev-monitor.sh

# Configuration
MAX_MEMORY_MB=1500  # Restart if memory exceeds 1.5GB
CHECK_INTERVAL=30   # Check every 30 seconds
LOG_FILE="/tmp/aeropod-dev.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Aeropod Dev Monitor${NC}"
echo "Max memory: ${MAX_MEMORY_MB}MB"
echo "Check interval: ${CHECK_INTERVAL}s"
echo "---"

# Function to get Next.js memory usage in MB
get_memory() {
    ps aux | grep "next-server" | grep -v grep | awk '{sum += $6} END {print int(sum/1024)}'
}

# Function to restart dev server
restart_server() {
    echo -e "${YELLOW}[$(date +%H:%M:%S)] Restarting dev server...${NC}"
    pkill -f "next-server" 2>/dev/null
    sleep 2
    rm -rf .next
    npm run dev >> "$LOG_FILE" 2>&1 &
    sleep 5
    echo -e "${GREEN}[$(date +%H:%M:%S)] Dev server restarted${NC}"
}

# Start dev server if not running
if ! pgrep -f "next-server" > /dev/null; then
    echo -e "${YELLOW}Starting dev server...${NC}"
    npm run dev >> "$LOG_FILE" 2>&1 &
    sleep 5
fi

# Monitor loop
while true; do
    MEMORY=$(get_memory)

    if [ -z "$MEMORY" ] || [ "$MEMORY" -eq 0 ]; then
        echo -e "${RED}[$(date +%H:%M:%S)] Dev server not running. Restarting...${NC}"
        restart_server
    elif [ "$MEMORY" -gt "$MAX_MEMORY_MB" ]; then
        echo -e "${RED}[$(date +%H:%M:%S)] Memory: ${MEMORY}MB (exceeds ${MAX_MEMORY_MB}MB)${NC}"
        restart_server
    else
        echo -e "${GREEN}[$(date +%H:%M:%S)] Memory: ${MEMORY}MB - OK${NC}"
    fi

    sleep "$CHECK_INTERVAL"
done
