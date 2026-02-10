#!/bin/bash
# OpenClaw Fleet Monitor - Heartbeat Agent (Linux & macOS)
# Auto-generated for agent: {{AGENT_ID}}
# Usage: curl -sL "{{BASE_URL}}/api/install-agent?agent_id={{AGENT_ID}}&agent_secret={{AGENT_SECRET}}" | bash

SAAS_URL="{{BASE_URL}}"
AGENT_ID="{{AGENT_ID}}"
AGENT_SECRET="{{AGENT_SECRET}}"
: "${AGENT_SECRET:=$OPENCLAW_AGENT_SECRET}"

if [ -z "$AGENT_SECRET" ]; then
  echo "Error: AGENT_SECRET is not set. Please set OPENCLAW_AGENT_SECRET environment variable."
  exit 1
fi

INTERVAL={{INTERVAL}}
SESSION_TOKEN=""
GATEWAY_URL=""

echo ""
echo "  OpenClaw Fleet Monitor"
echo "  ─────────────────────────────"
echo "  Agent:    $AGENT_ID"
echo "  SaaS:     $SAAS_URL"
echo "  Interval: ${INTERVAL}s"
echo "  OS:       $(uname -s) $(uname -m)"
echo ""

perform_handshake() {
  echo "[$(date +%H:%M:%S)] Performing handshake..."
  TIMESTAMP=$(date +%s)
  # Generate HMAC-SHA256 signature using openssl (typical on Linux/macOS)
  SIGNATURE=$(echo -n "${AGENT_ID}${TIMESTAMP}" | openssl dgst -sha256 -hmac "$AGENT_SECRET" | cut -d' ' -f2)

  RESPONSE=$(curl -s -X POST "${SAAS_URL}/api/agents/handshake" \
    -H "Content-Type: application/json" \
    -d "{\"agent_id\":\"$AGENT_ID\",\"timestamp\":\"$TIMESTAMP\",\"signature\":\"$SIGNATURE\"}")

  # Extract token and gateway_url using simple grep/cut
  SESSION_TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  GATEWAY_URL=$(echo "$RESPONSE" | grep -o '"gateway_url":"[^"]*' | cut -d'"' -f4)

  if [ -n "$SESSION_TOKEN" ]; then
    echo "[$(date +%H:%M:%S)] Handshake successful"
    if [ -n "$GATEWAY_URL" ]; then echo -e "   \033[0;36mProbing active: $GATEWAY_URL\033[0m"; fi
    return 0
  else
    echo "[$(date +%H:%M:%S)] Handshake failed: $RESPONSE"
    return 1
  fi
}

get_cpu() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS: use ps to get total CPU
    ps -A -o %cpu | awk '{s+=$1} END {printf "%.0f", s/4}' 2>/dev/null || echo "0"
  elif [ -f /proc/stat ]; then
    # Linux: calculate from /proc/stat
    read -r cpu user nice system idle rest < /proc/stat
    total1=$((user + nice + system + idle))
    idle1=$idle
    sleep 1
    read -r cpu user nice system idle rest < /proc/stat
    total2=$((user + nice + system + idle))
    idle2=$idle
    if [ $((total2 - total1)) -gt 0 ]; then
      echo $(( (100 * ((total2 - total1) - (idle2 - idle1))) / (total2 - total1) ))
    else
      echo "0"
    fi
  else
    echo "0"
  fi
}

get_mem() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS: use vm_stat and sysctl
    PAGES_ACTIVE=$(vm_stat 2>/dev/null | awk '/Pages active/ {gsub(/\./, "", $3); print $3}')
    PAGES_WIRED=$(vm_stat 2>/dev/null | awk '/Pages wired/ {gsub(/\./, "", $4); print $4}')
    PAGES_FREE=$(vm_stat 2>/dev/null | awk '/Pages free/ {gsub(/\./, "", $3); print $3}')
    PAGES_SPECULATIVE=$(vm_stat 2>/dev/null | awk '/Pages speculative/ {gsub(/\./, "", $3); print $3}')
    TOTAL=$((PAGES_ACTIVE + PAGES_WIRED + PAGES_FREE + PAGES_SPECULATIVE))
    if [ "$TOTAL" -gt 0 ] 2>/dev/null; then
      echo $(( (PAGES_ACTIVE + PAGES_WIRED) * 100 / TOTAL ))
    else
      echo "0"
    fi
  elif command -v free &> /dev/null; then
    free 2>/dev/null | awk '/Mem/ {printf "%.0f", $3/$2 * 100}' || echo "0"
  else
    echo "0"
  fi
}

get_uptime_hours() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS: use sysctl kern.boottime
    BOOT=$(sysctl -n kern.boottime 2>/dev/null | awk -F'[= ,]' '{print $4}')
    NOW=$(date +%s)
    if [ -n "$BOOT" ] && [ "$BOOT" -gt 0 ] 2>/dev/null; then
      echo $(( (NOW - BOOT) / 3600 ))
    else
      echo "0"
    fi
  elif [ -f /proc/uptime ]; then
    awk '{printf "%.0f", $1/3600}' /proc/uptime 2>/dev/null || echo "0"
  else
    echo "0"
  fi
}

send_heartbeat() {
  if [ -z "$SESSION_TOKEN" ]; then
    perform_handshake || return 1
  fi

  STATUS="healthy"
  LATENCY=0
  if [ -n "$GATEWAY_URL" ]; then
    START=$(date +%s%3N)
    if curl -s -f -I -m 5 "$GATEWAY_URL" > /dev/null; then
      END=$(date +%s%3N)
      LATENCY=$((END - START))
    else
      STATUS="error"
    fi
  fi

  CPU=$(get_cpu)
  MEM=$(get_mem)
  UPTIME_H=$(get_uptime_hours)

  # Ensure numeric values
  CPU=${CPU:-0}
  MEM=${MEM:-0}
  UPTIME_H=${UPTIME_H:-0}

  # Update URL to use /api/heartbeat with token
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${SAAS_URL}/api/heartbeat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SESSION_TOKEN" \
    -d "{\"agent_id\":\"$AGENT_ID\",\"status\":\"$STATUS\",\"metrics\":{\"cpu_usage\":$CPU,\"memory_usage\":$MEM,\"uptime_hours\":$UPTIME_H,\"latency_ms\":$LATENCY}}")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -1)

  if [ "$HTTP_CODE" = "200" ]; then
    # Use green for healthy, red for error
    COLOR="\033[0;32m"
    if [ "$STATUS" = "error" ]; then
      COLOR="\033[0;31m"
      echo -e "\033[0;31m[$(date +%H:%M:%S)] WARNING: Gateway probe failed ($GATEWAY_URL)\033[0m"
    fi
    echo -e "${COLOR}[$(date +%H:%M:%S)] Heartbeat sent (${STATUS^^})  CPU: ${CPU}%  MEM: ${MEM}%  Latency: ${LATENCY}ms\033[0m"
  elif [ "$HTTP_CODE" = "401" ]; then
    echo "[$(date +%H:%M:%S)] Session expired, retrying..."
    SESSION_TOKEN=""
    send_heartbeat
  else
    echo "[$(date +%H:%M:%S)] Failed ($HTTP_CODE): $BODY"
  fi
}

echo "Initializing agent session..."
perform_handshake || exit 1
echo "Starting heartbeat loop (Ctrl+C to stop)..."
echo ""

while true; do
  send_heartbeat
  sleep $INTERVAL
done
