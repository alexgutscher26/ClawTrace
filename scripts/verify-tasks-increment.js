// Test script to verify tasks_completed increments correctly
const baseUrl = 'http://localhost:3000';
const agentId = '79a68826-b5af-49a3-b9db-6c322c858f17';
const agentSecret = '4721c562-21eb-4b65-ae77-dcd6ec94f710';

async function testTasksCompletedIncrement() {
    console.log('🧪 Testing tasks_completed increment on heartbeat\n');

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
    console.log('✅ Handshake successful, got token\n');

    // Step 2: Get current tasks_completed
    console.log('2️⃣  Fetching current agent state...');
    const agentRes = await fetch(`${baseUrl}/api/agents/${agentId}`, {
        headers: { 'Authorization': `Bearer ${process.env.USER_TOKEN || 'your-user-token'}` }
    });

    let initialCount = 0;
    if (agentRes.ok) {
        const { agent } = await agentRes.json();
        initialCount = agent.metrics_json?.tasks_completed || 0;
        console.log(`   Current tasks_completed: ${initialCount}\n`);
    } else {
        console.log('   (Could not fetch - will check after heartbeats)\n');
    }

    // Step 3: Send 3 heartbeats
    console.log('3️⃣  Sending 3 heartbeats...');
    for (let i = 1; i <= 3; i++) {
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
                    cpu_usage: 40 + i,
                    memory_usage: 50 + i,
                    uptime_hours: 10,
                    latency_ms: 100 + i * 10
                }
            })
        });

        if (heartbeatRes.ok) {
            console.log(`   ✅ Heartbeat ${i}/3 sent successfully`);
        } else {
            console.error(`   ❌ Heartbeat ${i}/3 failed:`, await heartbeatRes.text());
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n4️⃣  Verifying tasks_completed incremented...');

    // Wait a bit for DB to update
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Fetch agent again to verify
    const finalRes = await fetch(`${baseUrl}/api/agents/${agentId}`, {
        headers: { 'Authorization': `Bearer ${process.env.USER_TOKEN || 'your-user-token'}` }
    });

    if (finalRes.ok) {
        const { agent } = await finalRes.json();
        const finalCount = agent.metrics_json?.tasks_completed || 0;
        const increment = finalCount - initialCount;

        console.log(`   Initial: ${initialCount}`);
        console.log(`   Final:   ${finalCount}`);
        console.log(`   Increment: +${increment}\n`);

        if (increment === 3) {
            console.log('✅ SUCCESS! tasks_completed incremented correctly (+3)');
        } else {
            console.log(`❌ FAILED! Expected +3, got +${increment}`);
        }
    } else {
        console.log('⚠️  Could not verify final count (auth required)');
        console.log('   Check the dashboard manually to verify tasks_completed increased by 3');
    }
}

testTasksCompletedIncrement().catch(console.error);
