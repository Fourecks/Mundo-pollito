import { supabase } from './supabaseClient';
async function run() {
  const { data, error } = await supabase.rpc('get_users');
  console.log(error);
}
run();
