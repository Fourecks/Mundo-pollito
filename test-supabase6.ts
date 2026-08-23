import { supabase } from './supabaseClient';
async function run() {
  const { data, error } = await supabase.rpc('search_users', { search_term: 'a' });
  console.log(error);
}
run();
