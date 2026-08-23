import { supabase } from './supabaseClient';
async function run() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  console.log(error);
}
run();
