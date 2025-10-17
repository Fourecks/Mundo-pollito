// This function is deprecated and can be safely deleted from your Supabase project.
// Test notifications are now sent directly from the client via the OneSignal SDK.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(() => new Response("Deprecated", { status: 410 }));
