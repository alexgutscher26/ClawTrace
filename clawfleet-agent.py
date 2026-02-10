#!/usr/bin/env python3
"""ClawFleet Agent - Cross-platform Heartbeat Agent"""
# Run: python3 clawfleet-agent.py

import json, time, urllib.request, platform, os, hmac, hashlib, sys

SAAS_URL = os.environ.get("CLAWFLEET_SAAS_URL", "http://localhost:3000")
AGENT_ID = os.environ.get("CLAWFLEET_AGENT_ID")
AGENT_SECRET = os.environ.get("CLAWFLEET_AGENT_SECRET")
INTERVAL = int(os.environ.get("CLAWFLEET_INTERVAL", "300"))
SESSION_TOKEN = None
GATEWAY_URL = None
_last_cpu_stats = None


def perform_handshake():
    """Perform a handshake with the server to establish a session."""
    global SESSION_TOKEN, GATEWAY_URL
    timestamp = str(int(time.time()))
    signature = hmac.new(
        AGENT_SECRET.encode(),
        (AGENT_ID + timestamp).encode(),
        hashlib.sha256
    ).hexdigest()
    
    payload = {
        "agent_id": AGENT_ID,
        "timestamp": timestamp,
        "signature": signature
    }
    
    data = json.dumps(payload).encode()
    req = urllib.request.Request(f"{SAAS_URL}/api/agents/handshake", data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            res = json.loads(resp.read().decode())
            SESSION_TOKEN = res.get("token")
            GATEWAY_URL = res.get("gateway_url")
            print(f"[{time.strftime('%H:%M:%S')}] Handshake successful")
            if GATEWAY_URL: print(f"   \033[96mProbing active: {GATEWAY_URL}\033[0m")
            return True
    except Exception as e:
        print(f"[{time.strftime('%H:%M:%S')}] Handshake failed: {e}")
        return False

def get_cpu():
    """Retrieve the current CPU usage percentage based on the operating system.
    
    The function checks the platform type and retrieves CPU statistics accordingly.
    For Linux, it reads from `/proc/stat` to calculate the CPU usage based on
    previous and current statistics. For macOS, it uses the `ps` command to gather
    CPU usage data, while for Windows, it utilizes the `wmic` command. If any
    errors occur during execution, the function returns 0.
    
    Returns:
        int: The CPU usage percentage, or 0 if an error occurs.
    """
    global _last_cpu_stats
    try:
        if platform.system() == "Linux":
            with open("/proc/stat") as f:
                current_stats = [int(x) for x in f.readline().split()[1:]]

            if _last_cpu_stats is None:
                time.sleep(1)
                with open("/proc/stat") as f:
                    new_stats = [int(x) for x in f.readline().split()[1:]]
                prev = current_stats
                curr = new_stats
                _last_cpu_stats = curr
            else:
                prev = _last_cpu_stats
                curr = current_stats
                _last_cpu_stats = curr

            d = [curr[i]-prev[i] for i in range(len(curr))]
            total = sum(d)
            if total == 0: return 0
            return int(100*(total-d[3])/total)
        elif platform.system() == "Darwin":
            import subprocess
            r = subprocess.run(["ps", "-A", "-o", "%cpu"], capture_output=True, text=True)
            return min(100, int(sum(float(x) for x in r.stdout.strip().split("\n")[1:] if x.strip()) / (os.cpu_count() or 4)))
        elif platform.system() == "Windows":
            import subprocess
            r = subprocess.run(["wmic", "cpu", "get", "loadpercentage"], capture_output=True, text=True)
            for line in r.stdout.strip().split("\n"):
                line = line.strip()
                if line.isdigit(): return int(line)
    except: pass
    return 0

def get_mem():
    try:
        if platform.system() == "Linux":
            with open("/proc/meminfo") as f:
                lines = {l.split(":")[0]: int(l.split(":")[1].strip().split()[0]) for l in f if ":" in l}
            return int((lines["MemTotal"]-lines["MemAvailable"])/lines["MemTotal"]*100)
        elif platform.system() == "Darwin":
            import subprocess
            r = subprocess.run(["vm_stat"], capture_output=True, text=True)
            d = {}
            for line in r.stdout.split("\n"):
                if ":" in line:
                    k,v = line.split(":",1)
                    val = v.strip().rstrip(".")
                    if val.isdigit():
                        d[k.strip()] = int(val)
            active = d.get("Pages active",0)+d.get("Pages wired down",0)
            total = active+d.get("Pages free",0)+d.get("Pages speculative",0)
            return int(active/max(total,1)*100)
        elif platform.system() == "Windows":
            import subprocess
            r = subprocess.run(["wmic", "os", "get", "FreePhysicalMemory,TotalVisibleMemorySize", "/value"], capture_output=True, text=True)
            vals = {}
            for line in r.stdout.strip().split("\n"):
                if "=" in line:
                    k,v = line.strip().split("=")
                    vals[k] = int(v)
            if vals: return int((vals["TotalVisibleMemorySize"]-vals["FreePhysicalMemory"])/vals["TotalVisibleMemorySize"]*100)
    except: pass
    return 0

def get_uptime():
    try:
        if platform.system() == "Linux":
            with open("/proc/uptime") as f: return int(float(f.read().split()[0])/3600)
        elif platform.system() == "Darwin":
            import subprocess
            r = subprocess.run(["sysctl", "-n", "kern.boottime"], capture_output=True, text=True)
            import re; m = re.search(r"sec = (\d+)", r.stdout)
            if m: return int((time.time()-int(m.group(1)))/3600)
        elif platform.system() == "Windows":
            return int(time.monotonic()/3600)
    except: pass
    return 0

def send_heartbeat():
    global SESSION_TOKEN
    if not SESSION_TOKEN:
        if not perform_handshake(): return

    status = "healthy"
    latency = 0
    if GATEWAY_URL:
        try:
            start = time.time()
            urllib.request.urlopen(GATEWAY_URL, timeout=5)
            latency = int((time.time() - start) * 1000)
        except:
            status = "error"

    cpu, mem, uptime = get_cpu(), get_mem(), get_uptime()
    data = json.dumps({"agent_id": AGENT_ID, "status": status, "metrics": {"cpu_usage": cpu, "memory_usage": mem, "uptime_hours": uptime, "latency_ms": latency}}).encode()

    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {SESSION_TOKEN}"}
    req = urllib.request.Request(f"{SAAS_URL}/api/heartbeat", data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            t = time.strftime("%H:%M:%S")
            st_upper = status.upper()
            if status == "error":
                print(f"[{t}] \033[91mWARNING: Gateway probe failed ({GATEWAY_URL})\033[0m")
                print(f"[{t}] \033[91mHeartbeat sent ({st_upper})  CPU: {cpu}%  MEM: {mem}%  Latency: {latency}ms\033[0m")
            else:
                print(f"[{t}] \033[92mHeartbeat sent ({st_upper})  CPU: {cpu}%  MEM: {mem}%  Latency: {latency}ms\033[0m")
    except urllib.error.HTTPError as e:
        if e.code == 401:
            print(f"[{time.strftime('%H:%M:%S')}] Session expired, retrying...")
            SESSION_TOKEN = None
            send_heartbeat()
        else: print(f"[{time.strftime('%H:%M:%S')}] FAIL: {e}")
    except Exception as e:
        print(f"[{time.strftime('%H:%M:%S')}] FAIL: {e}")

if __name__ == "__main__":
    if not AGENT_ID or not AGENT_SECRET:
        print("Error: Agent ID and Agent Secret are required.")
        print("Set CLAWFLEET_AGENT_ID and CLAWFLEET_AGENT_SECRET environment variables.")
        sys.exit(1)

    print()
    print("  ClawFleet Agent")
    print("  --------------------------------")

    if not AGENT_ID or not AGENT_SECRET:
        print("  \033[91mError: CLAWFLEET_AGENT_ID and CLAWFLEET_AGENT_SECRET must be set.\033[0m")
        print("  Please set these environment variables and run the agent again.")
        print()
        exit(1)

    print(f"  Agent:    {AGENT_ID}")
    print(f"  SaaS:     {SAAS_URL}")
    print(f"  Interval: {INTERVAL}s")
    print(f"  OS:       {platform.system()} {platform.machine()}")
    print()
    if perform_handshake():
        print("Starting heartbeat loop (Ctrl+C to stop)...")
        print()
        while True:
            send_heartbeat()
            time.sleep(INTERVAL)
    else:
        print("Fatal: Initial handshake failed. Exiting.")