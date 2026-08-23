import { supabase } from './supabaseClient';
async function run() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  } else {
    // try to get columns
    const { data: cols } = await supabase.rpc('get_columns', { table_name: 'profiles' });
    console.log(cols);
  }
}
run();
