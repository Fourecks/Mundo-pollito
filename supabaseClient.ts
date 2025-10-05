import { config } from './config';

// Accede a la función createClient desde el objeto global `supabase` 
// que se carga a través de la etiqueta <script> en index.html.
const { createClient } = window.supabase;

// This logic will try to read Render's env vars first, and if they don't exist,
// it will fall back to the values from the config file for the Gemini editor.
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || config.SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || config.SUPABASE_ANON_KEY;


if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('TU_VALOR_AQUI')) {
  const errorMessage = 'Error: Las variables de entorno de Supabase no están configuradas correctamente. Revisa tu configuración en Render o el archivo `config.ts` para el editor.';
  
  // Display error on the screen
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
  errorDiv.innerText = errorMessage;
  document.body.prepend(errorDiv);
  
  // Throw an error to stop execution
  throw new Error(errorMessage);
}


// Crea y exporta el cliente de Supabase.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
