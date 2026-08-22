import { supabase } from './supabaseClient';
async function get() {
    const { data, error } = await supabase.from('projects').insert([{ user_id: '00000000-0000-0000-0000-000000000000' }]).select();
    console.log(error);
}
get();
