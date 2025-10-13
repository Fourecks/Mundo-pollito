// ---------------------------------------------------------------------------
// DEPRECATED FUNCTION
// ---------------------------------------------------------------------------
// This function ('send-test-notification') is no longer in use.
// Test notifications are now sent directly from the client-side application
// using OneSignal's `sendSelfNotification` method.
//
// You can safely DELETE this function from your Supabase project dashboard.
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
