// Send a heartbeat and verify uptime gets calculated correctly
const baseUrl = 'http://localhost:3000';
const agentId = '79a68826-b5af-49a3-b9db-6c322c858f17';
const agentSecret = '4721c562-21eb-4b65-ae77-dcd6ec94f710';

async function testUptimeCalculation() {
    console.log('🧪 Testing uptime_hours calculation\n');

    // Wait for rate limit
    console.log('⏳ Waiting 60 seconds for rate limit to reset...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    console.log('');

    // Handshake
    console.log('1️⃣  Performing handshake...');
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

    // Send heartbeat with machine uptime (should be overridden)
    console.log('2️⃣  Sending heartbeat with machine uptime_hours: 999...');
    console.log('   (This should be IGNORED and calculated from agent creation time)\n');

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
                cpu_usage: 40,
                memory_usage: 50,
                uptime_hours: 999,  // ← This should be OVERRIDDEN
                latency_ms: 100
            }
        })
    });

    if (heartbeatRes.ok) {
        console.log('✅ Heartbeat sent successfully\n');
    } else {
        console.error('❌ Heartbeat failed:', await heartbeatRes.text());
        return;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('3️⃣  Verification:');
    console.log('   Run: node scripts/check-uptime.js');
    console.log('   Expected: uptime_hours should be calculated from creation time (NOT 999)');
}

testUptimeCalculation().catch(console.error);
