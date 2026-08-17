import { supabase } from './supabaseClient';

async function testInsert() {
  const { data, error } = await supabase.from('profiles').insert({}).select();
  console.log('Insert empty result:', { data, error: error?.message });
}
testInsert();
