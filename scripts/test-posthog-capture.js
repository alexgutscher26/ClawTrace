const https = require('https');

const data = JSON.stringify({
    api_key: 'phc_xZla6yspwE3ejSz5szt8bSJ4pHj12vyEVckGf1FC9Qr',
    event: 'my_custom_event',
    properties: {
        distinct_id: 'test_user_node',
        property: 'value',
        test_context: 'node_test_script',
        timestamp: new Date().toISOString()
    }
});

const options = {
    hostname: 'us.i.posthog.com',
    port: 443,
    path: '/capture/',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
