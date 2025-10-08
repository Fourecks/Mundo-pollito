// supabase/functions/send-test-notification/index.ts
// FIX: Declare Deno global to resolve TypeScript errors in non-Deno environments.
declare const Deno: any;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import webpush from 'https://deno.land/x/webpush@0.2.0/mod.ts';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;

webpush.setVapidDetails(
  'mailto:example@example.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Manejar solicitudes CORS preflight
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Crear un cliente de Supabase para obtener el usuario autenticado
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Usar el cliente admin para acceder a la tabla de suscripciones
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', user.id);

    if (subsError) throw subsError;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'No push subscriptions found for this user.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const payload = JSON.stringify({
      title: '🔔 Notificación de Prueba',
      body: '¡Pío, pío! Si ves esto, ¡las notificaciones funcionan!',
      tag: 'test-notification'
    });

    const sendPromises = subscriptions.map(({ subscription }) => {
      return webpush.sendNotification(subscription, payload).catch(async (error) => {
        console.error(`Error sending notification to ${subscription.endpoint}:`, error);
        if (error.statusCode === 410) { // Gone
          console.log('Subscription expired, deleting from DB.');
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('subscription->>endpoint', subscription.endpoint);
        }
      });
    });

    await Promise.all(sendPromises);

    return new Response(JSON.stringify({ message: `Test notification sent to ${subscriptions.length} device(s).` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error('Function error:', err);
    return new Response(String(err?.message ?? err), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500 
    });
  }
});

/*
To deploy this function:
1. Save this file as `supabase/functions/send-test-notification/index.ts`
2. Run `supabase functions deploy send-test-notification --no-verify-jwt`
3. Make sure the VAPID keys are set as secrets in your Supabase project.
*/