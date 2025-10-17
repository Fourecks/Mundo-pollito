import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

declare const Deno: any;

// CORS headers to allow requests from any origin.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight request.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { title, body } = await req.json();

    // 1. Securely verify the JWT to get the user ID.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const token = authHeader.replace('Bearer ', '');
    const jwtSecret = Deno.env.get('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error("Secret 'JWT_SECRET' is not set in the Supabase function.");
    }
    
    // Import the key for HMAC-SHA256 verification.
    const key = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(jwtSecret),
        { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const payload = await verify(token, key);
    const userId = payload.sub;

    if (!userId) throw new Error('Could not extract user ID from token');

    // 2. Get OneSignal credentials from environment variables (secrets).
    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error("OneSignal App ID or REST API Key is not configured in the function secrets.");
    }

    // 3. Prepare the notification payload for the OneSignal REST API.
    const notification = {
      app_id: ONESIGNAL_APP_ID,
      contents: { en: body },
      headings: { en: title },
      // Target the notification to the specific user who made the request.
      include_external_user_ids: [userId]
    };

    // 4. Send the request to OneSignal's API.
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
        },
        body: JSON.stringify(notification)
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("OneSignal API Error:", errorData);
        throw new Error(`Failed to send notification via OneSignal: ${errorData.errors.join(', ')}`);
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error('Critical error in send-notification function:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});