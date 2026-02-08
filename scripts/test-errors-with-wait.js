// Wait for rate limit to reset, then send error heartbeats
const baseUrl = 'http://localhost:3000';
const agentId = '79a68826-b5af-49a3-b9db-6c322c858f17';
const agentSecret = '4721c562-21eb-4b65-ae77-dcd6ec94f710';

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendErrorHeartbeats() {
    console.log('⏳ Waiting 60 seconds for rate limit to reset...\n');
    await wait(60000);

    console.log('🧪 Testing errors_count increment\n');

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

    // Send 1 healthy heartbeat
    console.log('1️⃣  Sending HEALTHY heartbeat (should NOT increment errors_count)...');
    const healthyRes = await fetch(`${baseUrl}/api/heartbeat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            agent_id: agentId,
            status: 'healthy',
            metrics: { cpu_usage: 40, memory_usage: 50, uptime_hours: 10, latency_ms: 100 }
        })
    });

    if (healthyRes.ok) {
        console.log('   ✅ Sent\n');
    } else {
        console.error('   ❌ Failed:', await healthyRes.text());
    }

    await wait(2000);

    // Send 2 error heartbeats
    console.log('2️⃣  Sending ERROR heartbeat #1 (SHOULD increment errors_count)...');
    const errorRes1 = await fetch(`${baseUrl}/api/heartbeat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            agent_id: agentId,
            status: 'error',
            metrics: { cpu_usage: 45, memory_usage: 55, uptime_hours: 10, latency_ms: 0 }
        })
    });

    if (errorRes1.ok) {
        console.log('   ✅ Sent\n');
    } else {
        console.error('   ❌ Failed:', await errorRes1.text());
    }

    await wait(2000);

    console.log('3️⃣  Sending ERROR heartbeat #2 (SHOULD increment errors_count again)...');
    const errorRes2 = await fetch(`${baseUrl}/api/heartbeat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            agent_id: agentId,
            status: 'error',
            metrics: { cpu_usage: 50, memory_usage: 60, uptime_hours: 10, latency_ms: 0 }
        })
    });

    if (errorRes2.ok) {
        console.log('   ✅ Sent\n');
    } else {
        console.error('   ❌ Failed:', await errorRes2.text());
    }

    await wait(1000);

    console.log('✅ Test complete!');
    console.log('   Expected: errors_count increased by 2');
    console.log('   Run: node scripts/check-errors-count.js to verify');
}

sendErrorHeartbeats().catch(console.error);
