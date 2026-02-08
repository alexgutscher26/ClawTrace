#!/usr/bin/env python3
"""OpenClaw Fleet Monitor - Cross-platform Heartbeat Agent"""
# Agent: 79a68826-b5af-49a3-b9db-6c322c858f17
# Run: python3 openclaw-monitor.py

import json, time, urllib.request, platform, os

SAAS_URL = "http://localhost:3000"
AGENT_ID = "79a68826-b5af-49a3-b9db-6c322c858f17"
AGENT_SECRET = "4721c562-21eb-4b65-ae77-dcd6ec94f710"
INTERVAL = 300
SESSION_TOKEN = None
GATEWAY_URL = None


def perform_handshake():
    """Perform a handshake with the server to obtain session token and gateway URL."""
    global SESSION_TOKEN, GATEWAY_URL
    data = json.dumps({"agent_id": AGENT_ID, "agent_secret": AGENT_SECRET}).encode()
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
    """Get the CPU usage percentage based on the operating system.
    
    This function retrieves the CPU usage percentage by checking system-specific
    files or commands.  For Linux, it reads from `/proc/stat` to calculate the CPU
    load over a one-second interval.  For macOS, it uses the `ps` command to get
    the CPU usage of all processes, while for Windows,  it utilizes the `wmic`
    command to fetch the CPU load percentage. If any errors occur during execution,
    the function returns 0.
    
    Returns:
        int: The CPU usage percentage or 0 if an error occurs.
    """
    try:
        if platform.system() == "Linux":
            with open("/proc/stat") as f:
                a = [int(x) for x in f.readline().split()[1:]]
            time.sleep(1)
            with open("/proc/stat") as f:
                b = [int(x) for x in f.readline().split()[1:]]
            d = [b[i]-a[i] for i in range(len(a))]
            return int(100*(sum(d)-d[3])/max(sum(d),1))
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
    """Get the memory usage percentage of the system.
    
    This function checks the operating system type and retrieves memory information
    accordingly. For Linux, it reads from `/proc/meminfo`, while for macOS
    (Darwin), it uses the `vm_stat` command. On Windows, it utilizes the `wmic`
    command to gather memory statistics. The function calculates the percentage of
    used memory based on the total and available memory values.
    
    Returns:
        int: The percentage of memory used, or 0 if an error occurs.
    """
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
                    d[k.strip()] = int(v.strip().rstrip("."))
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
    """Retrieve the system uptime in hours.
    
    This function checks the operating system type and retrieves the uptime
    accordingly.  For Linux, it reads from the `/proc/uptime` file. For macOS
    (Darwin), it uses the  `sysctl` command to get the boot time and calculates the
    difference from the current  time. For Windows, it utilizes the monotonic clock
    to determine the uptime. If any  errors occur during this process, the function
    returns 0.
    """
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
    """Send a heartbeat signal to the monitoring service.
    
    This function checks the SESSION_TOKEN and performs a handshake if it is not
    set.  It then measures the health status of the service by checking the
    GATEWAY_URL and  calculating latency. The CPU, memory usage, and uptime are
    gathered using  get_cpu(), get_mem(), and get_uptime() functions. A heartbeat
    message is sent  to the monitoring service, and appropriate logs are printed
    based on the response  status. If an HTTP 401 error occurs, it retries the
    heartbeat after resetting the  SESSION_TOKEN.
    """
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
    print()
    print("  OpenClaw Fleet Monitor")
    print("  --------------------------------")
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