const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearSubscription() {
    const userId = '95deb4a0-8032-4cef-b441-e6e089f0095c';

    console.log('Clearing subscriptions for user:', userId);
    const { error: deleteError } = await supabase.from('subscriptions').delete().eq('user_id', userId);
    if (deleteError) {
        console.error('Delete Error:', JSON.stringify(deleteError, null, 2));
    } else {
        console.log('Subscription deleted successfully.');
    }
}

clearSubscription();
