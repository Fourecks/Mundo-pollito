// IMPORTANT: This function path is kept for compatibility, but the logic is now for OneSignal.
// It sends a push notification to a specific user via the OneSignal REST API.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

declare const Deno: any;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { title, body } = await req.json();

    // 1. Verify JWT to get user ID
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');
    const token = authHeader.replace('Bearer ', '');
    // FIX: Use 'JWT_SECRET' to match the user's Supabase secrets configuration.
    const jwtSecret = Deno.env.get('JWT_SECRET'); 
    if (!jwtSecret) throw new Error("Supabase secret 'JWT_SECRET' is not set.");
    
    const key = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(jwtSecret),
        { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const payload = await verify(token, key);
    const userId = payload.sub;
    if (!userId) throw new Error('Could not extract user ID from token');

    // 2. Get OneSignal secrets from environment variables
    const ONE_SIGNAL_APP_ID = Deno.env.get('ONE_SIGNAL_APP_ID');
    const ONE_SIGNAL_REST_API_KEY = Deno.env.get('ONE_SIGNAL_REST_API_KEY');
    if (!ONE_SIGNAL_APP_ID || !ONE_SIGNAL_REST_API_KEY) {
      throw new Error("OneSignal secrets (ONE_SIGNAL_APP_ID, ONE_SIGNAL_REST_API_KEY) are not set.");
    }

    // 3. Prepare and send the request to OneSignal API, targeting the external user ID
    const oneSignalPayload = {
      app_id: ONE_SIGNAL_APP_ID,
      include_external_user_ids: [userId], // This is the recommended method from the guide
      headings: { en: title },
      contents: { en: body },
      web_url: Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.onrender.com') || 'https://pollito-productivo.onrender.com',
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${ONE_SIGNAL_REST_API_KEY}`
        },
        body: JSON.stringify(oneSignalPayload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("OneSignal API Error:", errorData);
        throw new Error(`Failed to send notification via OneSignal: ${JSON.stringify(errorData.errors || errorData)}`);
    }
    
    const responseData = await response.json();

    return new Response(JSON.stringify({ success: true, oneSignalResponse: responseData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error('Critical error in send-onesignal-notification function:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});