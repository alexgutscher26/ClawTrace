'use client';
import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

/**
 * OpenClaw Terminal Component
 * Provides a secure, browser-based SSH interface for debugging agents.
 */
export default function OpenClawTerminal({ agentId, onClose }) {
    const terminalRef = useRef(null);
    const wrapperRef = useRef(null); // Reference for the wrapper div
    const xtermRef = useRef(null);
    const wsRef = useRef(null);
    const fitAddonRef = useRef(null); // Keep reference to fitAddon

    useEffect(() => {
        // 1. Initialize Terminal
        const term = new Terminal({
            cursorBlink: true,
            fontFamily: '"Fira Code", monospace',
            fontSize: 14,
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

        // Open terminal in the wrapper div
        if (wrapperRef.current) {
            // Fix: RenderService race condition 
            // xterm.js needs the element to be visible and have dimensions
            requestAnimationFrame(() => {
                if (wrapperRef.current) {
                    term.open(wrapperRef.current);
                    fitAddon.fit();
                }
            });
        }

        xtermRef.current = term;

        // 2. Connect WebSocket (Simulated for Demo)
        // Ideally: connect to wss://api.fleet.sh/ssh/${agentId}
        term.writeln('\x1b[1;32m⚡ OpenClaw Secure Shell v2.0\x1b[0m');
        term.writeln(`Connecting to agent: \x1b[1;34m${agentId}\x1b[0m...`);

        // Simulate connection delay
        setTimeout(() => {
            term.writeln('Authenticating via Mutual TLS...');
            setTimeout(() => {
                term.writeln('\x1b[1;32m✔ Connection established.\x1b[0m');
                term.writeln('Welcome to OpenClaw Agent Runtime.');
                term.write('\r\n$ ');
            }, 800);
        }, 600);

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

        // Handle Resize
        const handleResize = () => fitAddon.fit();
        window.addEventListener('resize', handleResize);

        return () => {
            term.dispose();
            window.removeEventListener('resize', handleResize);
            if (wsRef.current) wsRef.current.close();
        };
    }, [agentId]);

    // Use a ResizeObserver to observe the wrapper div size changes
    useEffect(() => {
        if (!wrapperRef.current || !fitAddonRef.current) return;

        const resizeObserver = new ResizeObserver(() => {
            // Ensure fit() is called when the container resizes (e.g., drawer opening)
            // requestAnimationFrame helps avoid "ResizeObserver loop limit exceeded"
            requestAnimationFrame(() => {
                fitAddonRef.current?.fit();
            });
        });

        resizeObserver.observe(wrapperRef.current);

        return () => resizeObserver.disconnect();
    }, []); // Only run once on mount

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
            term.writeln('42    claw      20   0  800m 250m  20m S  12.5  4.2   1:23.45 python3 agent.py');
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
        <div className="h-full w-full bg-zinc-950 p-4 font-mono text-sm shadow-2xl overflow-hidden rounded-md border border-white/10">
            <div ref={wrapperRef} className="h-full w-full" />
        </div>
    );
}
