import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import * as webpush from 'https://deno.land/x/web_push@0.2.1/mod.ts';
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Manejar la solicitud de pre-vuelo (preflight) de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { title, body } = await req.json();

    // 1. Verificar de forma segura el token JWT para obtener el ID de usuario
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Falta la cabecera de Authorization');

    const token = authHeader.replace('Bearer ', '');
    const jwtSecret = Deno.env.get('JWT_SECRET'); // Usamos el nuevo nombre del secreto
    if (!jwtSecret) {
      throw new Error("El secreto 'JWT_SECRET' no está configurado en la función de Supabase.");
    }
    
    const key = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(jwtSecret),
        { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const payload = await verify(token, key);
    const userId = payload.sub;

    if (!userId) throw new Error('No se pudo extraer el ID de usuario del token');

    // 2. Obtener las credenciales de Supabase y las claves VAPID de los secretos
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        throw new Error("Las VAPID keys no están configuradas en los secretos de la función.");
    }

    // 3. Configurar los detalles de VAPID para la librería web-push
    webpush.setVapidDetails('mailto:example@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    // 4. Obtener las suscripciones push del usuario desde la base de datos
    const response = await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?select=subscription_data&user_id=eq.${userId}`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error al obtener suscripciones: ${errorData.message}`);
    }
    
    const subscriptions = await response.json();

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "No se encontraron suscripciones" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const notificationPayload = JSON.stringify({ title, body });

    // 5. Enviar las notificaciones y manejar suscripciones expiradas
    const deleteEndpoint = async (endpoint: string) => {
        const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?subscription_data->>endpoint=eq.${encodeURIComponent(endpoint)}`, {
            method: 'DELETE',
            headers: {
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`,
            }
        });
        if (!deleteResponse.ok) {
            console.error(`Fallo al eliminar la suscripción expirada para el endpoint: ${endpoint}`);
        }
    };

    const sendPromises = subscriptions.map((sub: { subscription_data: any }) =>
      webpush.sendNotification(sub.subscription_data, notificationPayload)
        .catch(err => {
          console.error(`Fallo al enviar notificación. Estado: ${err.status}, Mensaje: ${err.message}`);
          if (err.status === 404 || err.status === 410) {
            console.log("Suscripción expirada o inválida. Eliminando de la BD.");
            return deleteEndpoint(sub.subscription_data.endpoint);
          }
        })
    );
    
    await Promise.all(sendPromises);

    return new Response(JSON.stringify({ success: true, sent_to: subscriptions.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error('Error crítico en la función send-notification:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
