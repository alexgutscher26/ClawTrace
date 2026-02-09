require('dotenv').config();

async function testWebhook() {
    const userId = '95deb4a0-8032-4cef-b441-e6e089f0095c';

    // Payload simulating Lemon Squeezy 'subscription_created' event
    const payload = {
        meta: {
            event_name: 'subscription_created',
            custom_data: {
                user_id: userId,
                plan: 'pro'
            }
        },
        data: {
            id: 'sub_test_' + Date.now(),
            type: 'subscriptions',
            attributes: {
                store_id: 12345,
                customer_id: 67890,
                order_id: 11111,
                order_item_id: 22222,
                product_id: 33333,
                variant_id: 44444,
                product_name: 'Fleet Pro',
                variant_name: 'Monthly',
                user_name: 'Test User',
                user_email: 'test@example.com',
                status: 'active',
                renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                ends_at: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        }
    };

    console.log('Sending webhook payload to local server...');
    try {
        const response = await fetch('http://localhost:3000/api/webhooks/lemonsqueezy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        console.log('Response status:', response.status);
        console.log('Response body:', text);
    } catch (error) {
        console.error('Error sending webhook:', error);
    }
}

testWebhook();
