// IMPORTANT: This function path is kept for compatibility, but the logic is now for OneSignal.
// It sends a push notification to a specific user via the OneSignal REST API.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    // 1. Create a Supabase client with the user's auth context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // 2. Get the user from the token using the Supabase client
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('User not authenticated.');
    const userId = user.id;

    // 3. Get notification content from the request body
    const { title, message } = await req.json();
    if (!title || !message) {
      throw new Error("Request body must contain 'title' and 'message'.");
    }
    
    // 4. Get OneSignal secrets from environment variables
    const ONE_SIGNAL_APP_ID = Deno.env.get('ONE_SIGNAL_APP_ID');
    const ONE_SIGNAL_REST_API_KEY = Deno.env.get('ONE_SIGNAL_REST_API_KEY');
    if (!ONE_SIGNAL_APP_ID || !ONE_SIGNAL_REST_API_KEY) {
      throw new Error("OneSignal secrets (ONE_SIGNAL_APP_ID, ONE_SIGNAL_REST_API_KEY) are not set.");
    }

    // 5. Prepare and send the request to the OneSignal API
    const oneSignalPayload = {
      app_id: ONE_SIGNAL_APP_ID,
      include_external_user_ids: [userId],
      headings: { en: title },
      contents: { en: message },
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
    console.error('Critical error in send-pushalert-notification function:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});