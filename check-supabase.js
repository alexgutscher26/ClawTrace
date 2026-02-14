import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Checking Supabase tables...');
  
  const tablesToCheck = ['fleets', 'agents', 'alert_channels', 'alert_configs', 'custom_policies', 'metrics'];
  
  for (const table of tablesToCheck) {
    const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log(`Table '${table}' status: ${error.code} - ${error.message}`);
    } else {
      console.log(`Table '${table}' exists. Count: ${data?.length !== undefined ? 'Accessible' : 'Unknown'}`); // head: true returns null data but count in count property if requested? 
      // Actually with head:true, count is in the 'count' property of response, data is null.
      // But let's just try to select 1 row.
    }
  }
  
  // Also check if we can query 'profiles' which should exist
  const { data: profiles, error: pError } = await supabase.from('profiles').select('id').limit(1);
  if (pError) {
     console.log('Profiles table error:', pError.message);
  } else {
     console.log('Profiles table exists.');
  }
}

checkTables();
