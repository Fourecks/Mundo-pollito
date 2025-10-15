import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// FIX: Switched to Deno-native web-push library to resolve compatibility issues.
import * as webpush from 'https://deno.land/x/web_push@0.2.1/mod.ts';

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// These should be set as secrets in your Supabase project settings
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_SUBJECT = 'mailto:example@example.com'; // It's good practice to set a contact email

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

function decodeBase64Url(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  try {
    const decodedData = atob(base64);
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { title, body } = await req.json();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const token = authHeader.replace('Bearer ', '');
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) throw new Error('Invalid JWT format');
    
    const payload = JSON.parse(decodeBase64Url(tokenParts[1]));
    const userId = payload.sub;
    if (!userId) throw new Error('Could not extract user ID from token');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );
    
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription_data')
      .eq('user_id', userId);

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`);
      return new Response(JSON.stringify({ message: "No subscriptions found" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const notificationPayload = JSON.stringify({ title, body });

    const sendPromises = subscriptions.map(sub =>
      webpush.sendNotification(sub.subscription_data, notificationPayload)
        .catch(err => {
          // The Deno-native library uses `err.status`, which matches this code.
          console.error(`Failed to send notification. Status: ${err.status}, Message: ${err.message}`);
          if (err.status === 404 || err.status === 410) {
            console.log("Subscription is expired or invalid. Deleting from DB.");
            return supabaseAdmin
              .from('push_subscriptions')
              .delete()
              .eq('subscription_data->>endpoint', sub.subscription_data.endpoint);
          }
        })
    );
    
    await Promise.all(sendPromises);

    return new Response(JSON.stringify({ success: true, sent_to: subscriptions.length }), {
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