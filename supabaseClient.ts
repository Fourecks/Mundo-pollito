import { config } from './config';

// Accede a la función createClient desde el objeto global `supabase` 
// que se carga a través de la etiqueta <script> en index.html.
const { createClient } = window.supabase;

// This logic will try to read Render's env vars first, and if they don't exist,
// it will fall back to the Gemini editor's env vars (which don't have the VITE_ prefix),
// and finally to the local config file.
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (process.env as any).SUPABASE_URL || config.SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (process.env as any).SUPABASE_ANON_KEY || config.SUPABASE_ANON_KEY;


if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('YOUR_SUPABASE_URL')) {
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.width = '100%';
  errorDiv.style.padding = '1rem';
  errorDiv.style.backgroundColor = 'red';
  errorDiv.style.color = 'white';
  errorDiv.style.textAlign = 'center';
  errorDiv.style.zIndex = '99999';
  errorDiv.innerText = 'Error: Las variables de entorno de Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) no están configuradas. La aplicación no puede funcionar.';
  document.body.prepend(errorDiv);
  throw new Error("Supabase URL and Anon Key must be provided in environment variables or config.ts.");
}


// Crea y exporta el cliente de Supabase.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
