import { supabase } from './supabaseClient';
async function get() {
    const { data, error } = await supabase.from('projects').select('*').limit(1);
    console.log(error ? error : data);
}
get();
