import { supabase } from './supabaseClient';

async function checkTables() {
  const { data, error } = await supabase.from('todos').select('*').limit(1);
  console.log('todos table test:', { data, error: error?.message });

  const { data: profiles, error: err2 } = await supabase.from('profiles').select('*').limit(1);
  console.log('profiles table test:', { profiles, error: err2?.message });
}

checkTables();
