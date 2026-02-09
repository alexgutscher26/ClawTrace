const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifySubscription() {
    const userId = '95deb4a0-8032-4cef-b441-e6e089f0095c';

    console.log('Querying subscriptions for user:', userId);
    const { data: rows, error: selectError } = await supabase.from('subscriptions').select('*').eq('user_id', userId);
    if (selectError) {
        console.error('Select Error:', JSON.stringify(selectError, null, 2));
    } else {
        console.log('Row count:', rows.length);
        console.log('Rows:', JSON.stringify(rows, null, 2));
    }
}

verifySubscription();
