import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

declare const Deno: any;

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

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
    const jwtSecret = Deno.env.get('JWT_SECRET');
    if (!jwtSecret) throw new Error("Secret 'JWT_SECRET' is not set.");
    
    const key = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(jwtSecret),
        { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const payload = await verify(token, key);
    const userId = payload.sub;
    if (!userId) throw new Error('Could not extract user ID from token');

    // 2. Get the user's PushAlert subscriber ID from our database
    const { data: settings, error: dbError } = await supabaseAdmin
      .from('site_settings')
      .select('push_subscriber_id')
      .eq('user_id', userId)
      .single();

    if (dbError) throw dbError;
    if (!settings?.push_subscriber_id) {
      // It's possible the user hasn't subscribed yet, so we don't treat it as a critical error.
      console.warn(`User ${userId} does not have a PushAlert subscriber ID. Notification not sent.`);
      return new Response(JSON.stringify({ success: false, message: 'User not subscribed.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Not a server error
      });
    }
    const subscriberId = settings.push_subscriber_id;

    // 3. Get PushAlert REST API Key from secrets
    const PUSHALERT_API_KEY = Deno.env.get('PUSHALERT_API_KEY');
    if (!PUSHALERT_API_KEY) {
      throw new Error("Secret 'PUSHALERT_API_KEY' is not set.");
    }

    // 4. Prepare and send the request to PushAlert API
    const pushAlertPayload = {
      title: title,
      message: body,
      url: Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.onrender.com') || 'https://pollito-productivo.onrender.com',
      subscriber_ids: [subscriberId],
    };

    const response = await fetch('https://api.pushalert.co/rest/v1/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `api_key=${PUSHALERT_API_KEY}`
        },
        body: JSON.stringify(pushAlertPayload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("PushAlert API Error:", errorData);
        throw new Error(`Failed to send notification via PushAlert: ${errorData.message || 'Unknown error'}`);
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error('Critical error in send-pushalert-notification function:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
