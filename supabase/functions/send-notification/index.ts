import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import * as webpush from 'https://deno.land/x/web_push@0.2.1/mod.ts';

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Estas deben ser configuradas como secrets en tu proyecto de Supabase
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_SUBJECT = 'mailto:example@example.com'; // Es buena práctica configurar un email de contacto

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
    console.error("Fallo al decodificar la cadena Base64URL:", e);
    throw new Error("Cadena Base64URL inválida");
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { title, body } = await req.json();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Falta la cabecera de Authorization');

    const token = authHeader.replace('Bearer ', '');
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) throw new Error('Formato de JWT inválido');
    
    const payload = JSON.parse(decodeBase64Url(tokenParts[1]));
    const userId = payload.sub;
    if (!userId) throw new Error('No se pudo extraer el ID de usuario del token');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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
      console.log(`No se encontraron suscripciones push para el usuario ${userId}`);
      return new Response(JSON.stringify({ message: "No se encontraron suscripciones" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const notificationPayload = JSON.stringify({ title, body });

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