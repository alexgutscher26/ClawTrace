const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSubscription() {
    const userId = '95deb4a0-8032-4cef-b441-e6e089f0095c'; // Using the ID from previous step

    console.log('Attempting to upsert subscription...');
    const { data, error } = await supabase.from('subscriptions').upsert({
        user_id: userId,
        plan: 'pro',
        status: 'active',
        lemon_subscription_id: 'test_sub_id_' + Date.now(),
        lemon_customer_id: 'test_cust_id',
        variant_id: '1291188',
        current_period_end: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }).select();

    if (error) {
        console.error('Upsert Error:', JSON.stringify(error, null, 2));
    } else {
        // console.log('Upsert Success. Data:', data);
    }

    console.log('Querying subscriptions for user...');
    const { data: rows, error: selectError } = await supabase.from('subscriptions').select('*').eq('user_id', userId);
    if (selectError) {
        console.error('Select Error:', JSON.stringify(selectError, null, 2));
    } else {
        console.log('Row count:', rows.length);
        console.log('Rows:', JSON.stringify(rows, null, 2));
    }
}

testSubscription();
