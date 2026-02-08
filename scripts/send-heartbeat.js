// Quick test: Send one heartbeat and verify increment
const baseUrl = 'http://localhost:3000';
const agentId = '79a68826-b5af-49a3-b9db-6c322c858f17';
const agentSecret = '4721c562-21eb-4b65-ae77-dcd6ec94f710';

async function sendOneHeartbeat() {
    console.log('🚀 Sending single heartbeat to test increment...\n');

    // Handshake
    const handshakeRes = await fetch(`${baseUrl}/api/agents/handshake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, agent_secret: agentSecret })
    });

    if (!handshakeRes.ok) {
        console.error('❌ Handshake failed');
        return;
    }

    const { token } = await handshakeRes.json();
    console.log('✅ Handshake successful\n');

    // Send heartbeat
    const heartbeatRes = await fetch(`${baseUrl}/api/heartbeat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            agent_id: agentId,
            status: 'healthy',
            metrics: {
                cpu_usage: 50,
                memory_usage: 60,
                uptime_hours: 12,
                latency_ms: 150
            }
        })
    });

    if (heartbeatRes.ok) {
        const result = await heartbeatRes.json();
        console.log('✅ Heartbeat sent successfully!');
        console.log('   Response:', result);
        console.log('\n💡 Run: node scripts/check-tasks-completed.js to verify the increment');
    } else {
        console.error('❌ Heartbeat failed:', await heartbeatRes.text());
    }
}

sendOneHeartbeat().catch(console.error);
