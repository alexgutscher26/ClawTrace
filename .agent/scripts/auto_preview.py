#!/usr/bin/env python3
"""
Auto Preview - Antigravity Kit
==============================
Manages (start/stop/status) the local development server for previewing the application.

Usage:
    python .agent/scripts/auto_preview.py start [port]
    python .agent/scripts/auto_preview.py stop
    python .agent/scripts/auto_preview.py status
"""

import os
import sys
import time
import json
import signal
import argparse
import subprocess
from pathlib import Path

AGENT_DIR = Path(".agent")
PID_FILE = AGENT_DIR / "preview.pid"
LOG_FILE = AGENT_DIR / "preview.log"

def get_project_root():
    """Return the absolute path of the project root directory."""
    return Path(".").resolve()

def is_running(pid):
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False

def get_start_command(root):
    """Retrieve the start command from the package.json file."""
    pkg_file = root / "package.json"
    if not pkg_file.exists():
        return None
    
    with open(pkg_file, 'r') as f:
        data = json.load(f)
    
    scripts = data.get("scripts", {})
    if "dev" in scripts:
        return ["npm", "run", "dev"]
    elif "start" in scripts:
        return ["npm", "start"]
    return None

def start_server(port=3000):
    """Start the server for the project.
    
    This function checks if a server is already running by reading the PID from a
    file. If the server is not running, it retrieves the project root and  the
    start command from the package.json file. The function then sets the  PORT
    environment variable and starts the server process, logging output  to a
    specified log file. Finally, it writes the new process's PID to the  PID file
    and prints the server's URL.
    
    Args:
        port (int): The port number on which to start the server. Defaults to 3000.
    """
    if PID_FILE.exists():
        try:
            pid = int(PID_FILE.read_text().strip())
            if is_running(pid):
                print(f"⚠️  Preview already running (PID: {pid})")
                return
        except:
            pass # Invalid PID file

    root = get_project_root()
    cmd = get_start_command(root)
    
    if not cmd:
        print("❌ No 'dev' or 'start' script found in package.json")
        sys.exit(1)
    
    # Add port env var if needed (simple heuristic)
    env = os.environ.copy()
    env["PORT"] = str(port)
    
    print(f"🚀 Starting preview on port {port}...")
    
    with open(LOG_FILE, "w") as log:
        process = subprocess.Popen(
            cmd,
            cwd=str(root),
            stdout=log,
            stderr=log,
            env=env,
            shell=True # Required for npm on windows often, or consistent path handling
        )
    
    PID_FILE.write_text(str(process.pid))
    print(f"✅ Preview started! (PID: {process.pid})")
    print(f"   Logs: {LOG_FILE}")
    print(f"   URL: http://localhost:{port}")

def stop_server():
    """Stop the preview server if it is running.
    
    This function checks for the existence of a PID file to determine if a  preview
    server is running. If the file exists, it reads the process ID  (PID) from the
    file and attempts to terminate the process. It first  tries a gentle
    termination using SIGTERM, and if the process is not  running, it notifies the
    user. In case of any errors during this  process, an error message is printed.
    Finally, the PID file is removed  if it exists.
    """
    if not PID_FILE.exists():
        print("ℹ️  No preview server found.")
        return

    try:
        pid = int(PID_FILE.read_text().strip())
        if is_running(pid):
            # Try gentle kill first
            os.kill(pid, signal.SIGTERM) if sys.platform != 'win32' else subprocess.call(['taskkill', '/F', '/T', '/PID', str(pid)])
            print(f"🛑 Preview stopped (PID: {pid})")
        else:
            print("ℹ️  Process was not running.")
    except Exception as e:
        print(f"❌ Error stopping server: {e}")
    finally:
        if PID_FILE.exists():
            PID_FILE.unlink()

def status_server():
    """Check and display the status of the server.
    
    This function checks if the server is running by reading the process ID  from
    the PID_FILE. If the process ID is valid and the server is confirmed  to be
    running, it sets the running status to True and assigns a heuristic  URL. The
    function then prints the server status, including the PID,  URL, and log file
    information.
    """
    running = False
    pid = None
    url = "Unknown"
    
    if PID_FILE.exists():
        try:
            pid = int(PID_FILE.read_text().strip())
            if is_running(pid):
                running = True
                # Heuristic for URL, strictly we should save it
                url = "http://localhost:3000" 
        except:
            pass
            
    print("\n=== Preview Status ===")
    if running:
        print(f"✅ Status: Running")
        print(f"🔢 PID: {pid}")
        print(f"🌐 URL: {url} (Likely)")
        print(f"📝 Logs: {LOG_FILE}")
    else:
        print("⚪ Status: Stopped")
    print("===================\n")

def main():
    """Parse command line arguments and control the server action."""
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["start", "stop", "status"])
    parser.add_argument("port", nargs="?", default="3000")
    
    args = parser.parse_args()
    
    if args.action == "start":
        start_server(int(args.port))
    elif args.action == "stop":
        stop_server()
    elif args.action == "status":
        status_server()

if __name__ == "__main__":
    main()
