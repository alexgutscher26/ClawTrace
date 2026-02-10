const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data: users, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error('Error listing users:', error);
        return;
    }
    console.log('--- USERS IN SUPABASE ---');
    users.users.forEach(u => {
        console.log(`ID: ${u.id} | Email: ${u.email}`);
    });

    const { data: subs, error: subError } = await supabase.from('subscriptions').select('*');
    console.log('--- SUBSCRIPTIONS ---');
    console.log(subs || 'None');
    if (subError) console.error(subError);
}

check();
