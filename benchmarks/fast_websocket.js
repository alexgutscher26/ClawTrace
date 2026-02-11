import { serve } from 'bun';

// 1. Start WebSocket Server
const server = serve({
    port: 4001,
    fetch(req, server) {
        // upgrade the request to a WebSocket
        if (server.upgrade(req)) {
            return; // do not return a Response
        }
        return new Response("Upgrade failed", { status: 500 });
    },
    websocket: {
        message(ws, message) {
            // Echo back immediately to measure RTT
            ws.send(message);
        },
        open(ws) {
            // console.log('Client connected');
        },
        close(ws) {
            // console.log('Client disconnected');
        }
    },
});

console.log(`WebSocket server listening on port ${server.port}`);

// 2. Client Benchmark
const client = new WebSocket(`ws://localhost:${server.port}`);

client.onopen = async () => {
    console.log('Client connected to server. Starting benchmark...');
    const iterations = 1000;
    const times = [];
    let count = 0;

    // Promisify the send-receive cycle
    const ping = () => new Promise(resolve => {
        const start = performance.now();
        client.onmessage = () => {
            const end = performance.now();
            resolve(end - start);
            // remove listener for next iteration or just overwrite it
        };
        client.send('ping');
    });

    for (let i = 0; i < iterations; i++) {
        try {
            const rtt = await ping();
            times.push(rtt);
        } catch (e) {
            console.error('Ping failed', e);
        }
    }

    if (times.length === 0) {
        console.log('No measurements taken.');
        process.exit(1);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);

    console.log(`\nWebSocket Results (${iterations} msgs):`);
    console.log(`Avg RTT: ${avg.toFixed(4)}ms`);
    console.log(`Min RTT: ${min.toFixed(4)}ms`);

    if (avg <= 0.2) {
        console.log(`SUCCESS: WebSocket RTT is under 0.2ms!`);
    } else {
        console.log(`CLOSE: WebSocket RTT is ${avg.toFixed(4)}ms`);
    }

    client.close();
    setTimeout(() => process.exit(0), 100);

};
