// Test script to verify errors_count increments when status is 'error'
const baseUrl = 'http://localhost:3000';
const agentId = '79a68826-b5af-49a3-b9db-6c322c858f17';
const agentSecret = '4721c562-21eb-4b65-ae77-dcd6ec94f710';

async function testErrorsCount() {
    console.log('🧪 Testing errors_count increment on error status\n');

    // Step 1: Perform handshake
    console.log('1️⃣  Performing handshake...');
    const handshakeRes = await fetch(`${baseUrl}/api/agents/handshake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, agent_secret: agentSecret })
    });

    if (!handshakeRes.ok) {
        console.error('❌ Handshake failed:', await handshakeRes.text());
        return;
    }

    const { token } = await handshakeRes.json();
    console.log('✅ Handshake successful\n');

    // Step 2: Send healthy heartbeat
    console.log('2️⃣  Sending HEALTHY heartbeat...');
    const healthyRes = await fetch(`${baseUrl}/api/heartbeat`, {
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
                uptime_hours: 10,
                latency_ms: 100
            }
        })
    });

    if (healthyRes.ok) {
        console.log('   ✅ Healthy heartbeat sent (errors_count should NOT increment)\n');
    } else {
        console.error('   ❌ Failed:', await healthyRes.text());
        return;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Send ERROR heartbeat
    console.log('3️⃣  Sending ERROR heartbeat...');
    const errorRes = await fetch(`${baseUrl}/api/heartbeat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            agent_id: agentId,
            status: 'error',  // ← This should increment errors_count
            metrics: {
                cpu_usage: 45,
                memory_usage: 55,
                uptime_hours: 10,
                latency_ms: 0  // Gateway probe failed
            }
        })
    });

    if (errorRes.ok) {
        console.log('   ✅ Error heartbeat sent (errors_count SHOULD increment)\n');
    } else {
        console.error('   ❌ Failed:', await errorRes.text());
        return;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Send another ERROR heartbeat
    console.log('4️⃣  Sending ANOTHER ERROR heartbeat...');
    const errorRes2 = await fetch(`${baseUrl}/api/heartbeat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            agent_id: agentId,
            status: 'error',  // ← This should increment errors_count again
            metrics: {
                cpu_usage: 50,
                memory_usage: 60,
                uptime_hours: 10,
                latency_ms: 0
            }
        })
    });

    if (errorRes2.ok) {
        console.log('   ✅ Second error heartbeat sent (errors_count should increment again)\n');
    } else {
        console.error('   ❌ Failed:', await errorRes2.text());
        return;
    }

    console.log('5️⃣  Verification:');
    console.log('   Run: node scripts/check-errors-count.js');
    console.log('   Expected: errors_count should have increased by 2');
}

testErrorsCount().catch(console.error);
