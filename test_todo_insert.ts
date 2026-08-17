import { supabase } from './supabaseClient';

async function testTodoInsert() {
  const { data, error } = await supabase.from('todos').insert({ text: 'test_asset_icon', completed: true }).select();
  console.log('Todo insert test:', { data, error: error?.message });
}
testTodoInsert();
