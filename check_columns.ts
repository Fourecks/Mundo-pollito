import { supabase } from './supabaseClient';

async function checkColumns() {
  const { data, error } = await supabase.from('todos').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Todos columns:', Object.keys(data[0]));
  } else {
    // Insert with minimal valid fields or inspect error
    const { error: insErr } = await supabase.from('todos').insert({ title: 'test' }).select();
    console.log('Insert test:', insErr?.message);
  }
}
checkColumns();
