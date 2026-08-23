import { supabase } from './supabaseClient';
async function run() {
  const { data, error } = await supabase.from('user_profiles').select('*').limit(1);
  console.log(error);
}
run();
