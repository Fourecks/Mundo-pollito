import { supabase } from './supabaseClient';
async function run() {
  const { data, error } = await supabase.from('profiles').select().limit(1);
  console.log('Error:', error);
}
run();
