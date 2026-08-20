import { supabase } from './supabaseClient';
async function test() {
  const { data, error } = await supabase.from('projects').insert([{ 
    name: 'Test', 
    user_id: crypto.randomUUID(),
  }]).select('*');
  console.log(error);
  if (data) { console.log(Object.keys(data[0])); await supabase.from('projects').delete().eq('id', data[0].id); }
}
test();
