require('dotenv').config();

async function testCheckout() {
    const LEMON_KEY = process.env.LEMON_SQUEEZY_API_KEY;
    const STORE_ID = process.env.LEMON_SQUEEZY_STORE_ID || '288152'; // Defaulting to the one we saw earlier if env is missing
    const VARIANT_ID = '1291188'; // Pro Monthly

    const payload = {
        data: {
            type: 'checkouts',
            attributes: {
                checkout_data: {
                    email: 'test@example.com',
                    custom: {
                        user_id: 'test_user_id',
                        plan: 'pro'
                    }
                },
                product_options: {
                    name: 'Fleet Pro',
                    description: 'Unlimited agents, alert channels, team collaboration',
                    redirect_url: 'http://localhost:3000/dashboard',
                }
            },
            relationships: {
                store: {
                    data: {
                        type: "stores",
                        id: String(STORE_ID)
                    }
                },
                variant: {
                    data: {
                        type: "variants",
                        id: String(VARIANT_ID)
                    }
                }
            }
        }
    };

    console.log('Sending payload:', JSON.stringify(payload, null, 2));

    try {
        const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LEMON_KEY}`,
                'Accept': 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json',
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Error Status:', response.status);
            console.error('Error Body:', JSON.stringify(data, null, 2));
        } else {
            console.log('Success! Checkout URL:', data.data.attributes.url);
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

testCheckout();
