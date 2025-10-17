// This function is deprecated and can be safely deleted from your Supabase project.
// It was used for initial testing and is no longer needed.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(() => new Response("Deprecated", { status: 410 }));
