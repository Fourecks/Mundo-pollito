// Accede a la función createClient desde el objeto global `supabase` 
// que se carga a través de la etiqueta <script> en index.html.
const { createClient } = window.supabase;

const supabaseUrl = 'https://pbtdzkpympdfemnejpwj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBidGR6a3B5bXBkZmVtbmVqcHdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MzYyMTYsImV4cCI6MjA3NTExMjIxNn0.VsHBuGnmV3T0hJ5sSO6vYlckONHO9IIQmTTjb_S_pBg';

// Crea y exporta el cliente de Supabase.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
