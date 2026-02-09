const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function report() {
    console.log('--- USERS ---');
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) console.error(userError);
    const userMap = {};
    users.forEach(u => {
        userMap[u.id] = u.email;
        console.log(`ID: ${u.id} | Email: ${u.email}`);
    });

    console.log('\n--- SUBSCRIPTIONS TABLE ---');
    const { data: subs, error: subError } = await supabase.from('subscriptions').select('*');
    if (subError) console.error(subError);

    if (subs && subs.length > 0) {
        subs.forEach(s => {
            const email = userMap[s.user_id] || 'UNKNOWN_USER';
            console.log(`User: ${email} (${s.user_id}) | Plan: ${s.plan} | Status: ${s.status} | Variant: ${s.variant_id}`);
        });
    } else {
        console.log('No subscriptions found.');
    }
}

report();
