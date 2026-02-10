'use client';
import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

/**
 * ClawFleet Terminal Component
 * Provides a secure, browser-based SSH interface for debugging agents.
 */
export default function ClawFleetTerminal({ agentId, onClose }) {
  const wrapperRef = useRef(null); // Reference for the wrapper div
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const timeoutsRef = useRef([]); // Store simulation timeouts
  const hasRunSim = useRef(false); // Flag to prevent double simulation

  useEffect(() => {
    // 1. Initialize Terminal
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: '"Fira Code", Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.2,
      convertEol: true,
      theme: {
        background: '#09090b', // Zinc-950
        foreground: '#e4e4e7', // Zinc-200
        cursor: '#10b981', // Emerald-500
        selectionBackground: '#10b98133',
        black: '#09090b',
        blue: '#3b82f6',
        cyan: '#06b6d4',
        green: '#10b981',
        magenta: '#d946ef',
        red: '#ef4444',
        white: '#e4e4e7',
        yellow: '#eab308',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    fitAddonRef.current = fitAddon; // Store fitAddon in ref

    xtermRef.current = term;

    // Clear any existing timeouts before starting new ones
    const clearTimeouts = () => {
      timeoutsRef.current.forEach(t => clearTimeout(t));
      timeoutsRef.current = [];
    };

    // 2. Connect WebSocket (Simulated for Demo)
    const runSimulation = () => {
      if (!term || term._disposed || hasRunSim.current) return;
      hasRunSim.current = true;

      try {
        term.reset();
        term.clear();
        term.scrollToTop();
      } catch (e) {
        console.warn('Simulation reset failed', e);
      }

      term.write('\x1b[1;32m⚡ ClawFleet Secure Shell v2.0\x1b[0m\r\n');
      term.write(`Connecting to agent: \x1b[1;34m${agentId}\x1b[0m...\r\n`);

      const t1 = setTimeout(() => {
        if (term._disposed) return;
        term.write('Authenticating via Mutual TLS...\r\n');
        const t2 = setTimeout(() => {
          if (term._disposed) return;
          term.write('\x1b[1;32m✔ Connection established.\x1b[0m\r\n');
          term.write('Welcome to ClawFleet Agent Runtime.\r\n');
          term.write('\r\n$ ');
        }, 800);
        timeoutsRef.current.push(t2);
      }, 600);
      timeoutsRef.current.push(t1);
    };

    // Open terminal in the wrapper div
    if (wrapperRef.current) {
      try {
        term.open(wrapperRef.current);

        // Initial fit and simulation
        const tInit = setTimeout(() => {
          if (!term._disposed && term.element && term.element.offsetParent !== null) {
            try {
              fitAddon.fit();
              runSimulation();
            } catch (e) {
              console.warn('Initial terminal setup failed:', e);
            }
          }
        }, 200);
        timeoutsRef.current.push(tInit);
      } catch (e) {
        console.error('Failed to open terminal:', e);
      }
    }

    // 3. Handle Input
    let commandBuffer = '';

    term.onData((data) => {
      // Handle Enter
      if (data === '\r') {
        term.write('\r\n');
        processCommand(commandBuffer, term);
        commandBuffer = '';
      }
      // Handle Backspace
      else if (data === '\x7f') {
        if (commandBuffer.length > 0) {
          commandBuffer = commandBuffer.slice(0, -1);
          term.write('\b \b');
        }
      }
      // Handle CTRL+C
      else if (data === '\x03') {
        term.write('^C\r\n$ ');
        commandBuffer = '';
      }
      // Normal Input
      else {
        commandBuffer += data;
        term.write(data);
      }
    });

    // Handle Resize with ResizeObserver for better precision than window resize
    let resizeObserver = null;
    if (wrapperRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (!term || term._disposed || !term.element) return;
        requestAnimationFrame(() => {
          if (!term._disposed && term.element && term.element.offsetParent !== null) {
            try {
              fitAddon.fit();
            } catch (e) {
              // Ignore resize errors during transitions
            }
          }
        });
      });
      resizeObserver.observe(wrapperRef.current);
    }

    const handleResize = () => {
      if (!term || term._disposed || !term.element) return;
      if (term.element.offsetParent !== null) { // Check visibility
        try {
          fitAddon.fit();
        } catch (e) {
          // Silent catch for resize transitions
        }
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeouts();
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [agentId]);

  const processCommand = (cmd, term) => {
    const command = cmd.trim();

    if (!command) {
      term.write('$ ');
      return;
    }

    if (command === 'exit') {
      onClose();
      return;
    }

    if (command === 'clear') {
      term.clear();
      term.write('$ ');
      return;
    }

    if (command === 'help') {
      term.writeln('Available commands:');
      term.writeln('  status    Check agent status');
      term.writeln('  logs      View recent logs');
      term.writeln('  top       View process usage');
      term.writeln('  history   View execution history');
      term.writeln('  clear     Clear screen');
      term.writeln('  exit      Close session');
      term.write('$ ');
      return;
    }

    if (command === 'top') {
      term.writeln('PID   USER      PR  NI  VIRT  RES  SHR S  %CPU %MEM    TIME+  COMMAND');
      term.writeln('1     root      20   0  102m  12m 4000 S   0.0  0.1   0:00.04 init');
      term.writeln(
        '42    claw      20   0  800m 250m  20m S  12.5  4.2   1:23.45 python3 agent.py'
      );
      term.write('$ ');
      return;
    }

    // Default: Simulate remote execution
    term.writeln(`Executing: ${command}`);
    setTimeout(() => {
      term.writeln(`Output from agent (${agentId}):`);
      term.writeln(`> ${command}: command not found (simulated)`);
      term.write('$ ');
    }, 500);
  };

  return (
    <div className="h-full w-full overflow-hidden bg-zinc-950 shadow-2xl">
      <div ref={wrapperRef} className="h-full w-full" />
    </div>
  );
}
