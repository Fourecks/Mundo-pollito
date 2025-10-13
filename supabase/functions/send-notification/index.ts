// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore
import { corsHeaders } from '../_shared/cors.ts';

// FIX: Declare Deno to provide type definition for the Deno runtime environment.
declare const Deno: any;

/*
-- ⚠️ SETUP INSTRUCTIONS (PLEASE READ CAREFULLY) ⚠️
--
-- This is a new, simpler function that acts as a proxy to OneSignal.
-- It is called by the client application every minute to send reminders.
--
-- 1. DEPLOY THIS FUNCTION:
--    Make sure this function is deployed to your Supabase project under the name `send-notification`.
--
-- 2. VERIFY SECRETS:
--    - Go to your Supabase project -> Edge Functions -> "send-notification" function -> "Secrets" tab.
--    - MAKE SURE you have these exact secrets:
--      - `ONESIGNAL_APP_ID` -> Value: [Your OneSignal App ID]
--      - `ONESIGNAL_REST_API_KEY` -> Value: [Your OneSignal REST API Key]
--
-- 3. CLEAN UP OLD FUNCTIONS:
--    - You can now safely DELETE the old 'send-reminders' function and its Cron Job.
--    - You can also delete 'hello-world' and 'send-test-notification' if they exist.
--
*/


console.log("Loading 'send-notification' function...");

/**
 * Safely decodes a Base64URL string, which is used in JWTs.
 * This is more robust than a simple atob() as it handles URL-safe characters
 * and potential UTF-8 characters in the payload.
 * @param str The Base64URL encoded string.
 * @returns The decoded string.
 */
function decodeBase64Url(str: string): string {
  // Replace URL-safe characters with standard Base64 characters
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Pad with '=' signs if necessary
  while (base64.length % 4) {
    base64 += '=';
  }
  try {
    const decodedData = atob(base64);
    // Handle potential UTF-8 characters
    return decodeURIComponent(
      Array.prototype.map.call(decodedData, function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')
    );
  } catch (e) {
    console.error("Failed to decode Base64URL string:", e);
    throw new Error("Invalid Base64URL string");
  }
}


serve(async (req: Request) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { heading, content } = await req.json();

    // The user's JWT is automatically passed in the Authorization header
    // when the function is invoked from an authenticated client.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    
    // We don't need to verify the token ourselves; Supabase gateway does that.
    // We just need to extract the user ID (sub claim) from the token payload.
    const token = authHeader.replace('Bearer ', '');
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = JSON.parse(decodeBase64Url(tokenParts[1]));
    const userId = payload.sub;

    if (!userId) {
      throw new Error('Could not extract user ID from token');
    }

    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error("OneSignal credentials are not set in function secrets.");
    }
    
    const notification = {
      app_id: ONESIGNAL_APP_ID,
      include_external_user_ids: [userId],
      channel_for_external_user_ids: "push",
      headings: { "es": heading },
      contents: { "es": content },
      large_icon: 'https://pbtdzkpympdfemnejpwj.supabase.co/storage/v1/object/public/Sonido-ambiente/pollito_icon.png',
      language: "es"
    };

    const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notification),
    });

    if (!oneSignalResponse.ok) {
        const errorBody = await oneSignalResponse.json();
        console.error("OneSignal API Error:", errorBody);
        throw new Error(`OneSignal API request failed: ${JSON.stringify(errorBody)}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error('Error in send-notification function:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});