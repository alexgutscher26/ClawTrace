// Test script to verify pro user heartbeat interval
// This script tests that pro users get 60-second intervals

const baseUrl = 'http://localhost:3000';

async function testProHeartbeatInterval() {
    console.log('🧪 Testing Pro User Heartbeat Interval\n');

    // Step 1: Get an agent ID (you'll need to replace this with an actual agent ID)
    const agentId = '74d8ec78-6410-4495-b8a0-1234567890ab'; // Replace with actual agent ID
    const agentSecret = 'test-secret'; // Replace with actual secret

    // Step 2: Fetch the install script
    console.log('1️⃣  Fetching install script for agent:', agentId);
    const scriptUrl = `${baseUrl}/api/install-agent-ps?agent_id=${agentId}&agent_secret=${agentSecret}`;

    try {
        const response = await fetch(scriptUrl);
        const scriptContent = await response.text();

        // Step 3: Check if the interval is set correctly
        const intervalMatch = scriptContent.match(/\$Interval = (\d+)/);

        if (intervalMatch) {
            const interval = parseInt(intervalMatch[1]);
            console.log(`\n✅ Found interval: ${interval} seconds`);

            if (interval === 60) {
                console.log('✅ SUCCESS: Pro user has 1-minute heartbeat interval!');
            } else if (interval === 300) {
                console.log('⚠️  WARNING: User appears to be on free tier (5-minute interval)');
            } else {
                console.log(`⚠️  UNEXPECTED: Interval is ${interval} seconds`);
            }
        } else {
            console.log('❌ ERROR: Could not find interval in script');
        }

        // Step 4: Show a snippet of the script
        console.log('\n📄 Script snippet:');
        const lines = scriptContent.split('\n');
        const relevantLines = lines.filter(line => line.includes('Interval') || line.includes('interval'));
        relevantLines.slice(0, 5).forEach(line => console.log('   ', line.trim()));

    } catch (error) {
        console.error('❌ Error fetching script:', error.message);
    }
}

testProHeartbeatInterval().catch(console.error);
