const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
    const email = `test-${Date.now()}@example.com`;
    const password = 'TestPassword123!';
    console.log(`Testing registration for ${email}...`);
    try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
            console.error('Registration failed with error:');
            console.error(JSON.stringify(error, null, 2));
        } else {
            console.log('Registration success:', data.user.id);
        }
    } catch (err) {
        console.error('Catch error:', err);
    }
}

test();
