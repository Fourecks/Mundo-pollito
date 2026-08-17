import { supabase } from './supabaseClient';

async function getSchema() {
  // Try calling a select on common tables
  const tables = ['todos', 'profiles', 'notes', 'playlists', 'folders', 'habits', 'projects'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    console.log(`Table "${t}":`, error ? error.message : (data.length > 0 ? Object.keys(data[0]) : 'empty table'));
  }
}
getSchema();
