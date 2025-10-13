// ---------------------------------------------------------------------------
// DEPRECATED FUNCTION
// ---------------------------------------------------------------------------
// This function ('send-reminders') is no longer in use due to a persistent
// and unresolvable error within the Supabase Deno runtime environment
// (TypeError: Object prototype may only be an Object or null).
//
// All reminder logic has been moved to the client-side (see App.tsx), which
// now calls a new, simpler proxy function named 'send-notification'.
//
// You can and should DELETE this function ('send-reminders') and its
// associated Cron Job from your Supabase project dashboard to prevent
// further errors in your logs.
// ---------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async () => {
  const message = "This function is deprecated and should be deleted.";
  console.warn(message);
  return new Response(
    JSON.stringify({ message }),
    { status: 410, headers: { "Content-Type": "application/json" } }
  );
});
