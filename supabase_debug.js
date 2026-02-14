import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debug() {
  console.log('--- DB DEBUG START ---');

  // 1. Check if public.profiles exists and its columns
  const { data: cols, error: colsErr } = await supabase.rpc('get_table_info', {
    t_name: 'profiles',
  });
  // If RPC is missing, try a direct query to information_schema via a temporary SQL rpc if possible
  // Since I don't know if get_table_info exists, I'll try to select 1 from public.profiles

  const { error: tableErr } = await supabase.from('profiles').select('*').limit(1);
  if (tableErr) {
    console.error('Error selecting from profiles:', tableErr.message);
  } else {
    console.log('✅ public.profiles table exists and is accessible.');
  }

  // 2. Check for trigger and function using a raw SQL bypass if user has one,
  // but usually we can't do raw SQL via the client unless there's an RPC.
  // Instead, let's try to manually insert a profile to see if it fails due to constraints.
  const testId = '00000000-0000-0000-0000-000000000000';
  const { error: insertErr } = await supabase.from('profiles').insert({
    id: testId,
    email: 'test@example.com',
    full_name: 'Debug Test',
  });

  if (insertErr) {
    if (insertErr.code === '23503') {
      console.error(
        '❌ Insert failed: Foreign key violation. This is expected if the ID is not in auth.users, but it proves the table exists.'
      );
    } else {
      console.error('❌ Insert failed with error:', insertErr.code, insertErr.message);
    }
  } else {
    console.log('✅ Manual insert succeeded (cleaned up now).');
    await supabase.from('profiles').delete().eq('id', testId);
  }

  console.log('--- DB DEBUG END ---');
}

debug();
