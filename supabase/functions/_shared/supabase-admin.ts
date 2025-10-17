
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Deno is available in the Supabase Edge Functions environment.
declare const Deno: any;

// This Supabase client uses the Service Role Key, which bypasses all RLS policies.
// It should only be used in server-side Edge Functions and never exposed to the client.
// Make sure to set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your function's environment variables.
export const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
