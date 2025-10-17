import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- INLINED SHARED CODE ---

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

declare const Deno: any;

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface NotificationPayload {
  title: string;
  body: string;
  userIds: string[];
}

async function sendNotification(payload: NotificationPayload): Promise<void> {
  const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
  const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    throw new Error("OneSignal secrets (ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY) are not configured.");
  }

  const notification = {
    app_id: ONESIGNAL_APP_ID,
    contents: { en: payload.body },
    headings: { en: payload.title },
    include_external_user_ids: payload.userIds,
  };

  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify(notification),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("OneSignal API Error:", errorData);
    throw new Error(`Failed to send notification: ${errorData.errors?.join(', ') || 'Unknown error'}`);
  }
}

const verses = [
  { text: "Pero los que esperan en Jehová recobrarán las fuerzas. Se elevarán con alas como las águilas.", citation: "Isaías 40:31" },
  { text: "Porque yo, Jehová tu Dios, tengo agarrada tu mano derecha y te digo: ‘No tengas miedo. Yo te ayudaré’.", citation: "Isaías 41:13" },
  { text: "Puedo hacer todas las cosas gracias a aquel que me da las fuerzas.", citation: "Filipenses 4:13" },
  { text: "Échenle todas sus inquietudes, porque él se preocupa por ustedes.", citation: "1 Pedro 5:7" },
  { text: "Confía en Jehová con todo tu corazón y no te apoyes en tu propio entendimiento.", citation: "Proverbios 3:5" },
  { text: "Jehová es mi pastor. Nada me faltará.", citation: "Salmo 23:1" },
  { text: "El que aguanta hasta el fin es el que será salvado.", citation: "Mateo 24:13" },
  { text: "No tengas miedo, porque estoy contigo. No te angusties, porque yo soy tu Dios. Yo te daré fuerzas. Sí, yo te ayudaré. Con mi mano derecha de justicia, de veras te sostendré.", citation: "Isaías 41:10" },
  { text: "Tírale tu carga a Jehová, y él te sostendrá. Jamás permitirá que el justo caiga.", citation: "Salmo 55:22" },
  { text: "Jehová está cerca de los que tienen el corazón destrozado; salva a los que están hundidos en el desánimo.", citation: "Salmo 34:18" },
  { text: "Jehová es mi luz y mi salvación. ¿De quién tendré miedo? Jehová es la fortaleza de mi vida. ¿A quién le tendré pavor?", citation: "Salmo 27:1" },
  { text: "¿No te he ordenado yo? Sé valiente y fuerte. No te asustes ni te aterrorices, porque Jehová tu Dios está contigo vayas donde vayas.", citation: "Josué 1:9" },
  { text: "Vengan a mí, todos los que están cansados y agobiados, y yo los haré descansar.", citation: "Mateo 11:28" },
  { text: "Jehová es bueno, una fortaleza en el día de la angustia. Él se preocupa por los que se refugian en él.", citation: "Nahúm 1:7" },
  { text: "Cuando las preocupaciones me abrumaban, tú me consolabas y me tranquilizabas.", citation: "Salmo 94:19" },
  { text: "Porque estoy convencido de que ni la muerte, ni la vida, ni ángeles, ni gobiernos [...] podrá separarnos del amor de Dios.", citation: "Romanos 8:38, 39" },
  { text: "Jehová es el que va delante de ti. Él seguirá contigo. No te fallará ni te abandonará. No tengas miedo ni te aterrorices.", citation: "Deuteronomio 31:8" },
  { text: "El nombre de Jehová es una torre fuerte. El justo corre a ella y se le da protección.", citation: "Proverbios 18:10" },
  { text: "Mi ayuda viene de Jehová, el que hizo el cielo y la tierra.", citation: "Salmo 121:2" },
  { text: "Dios es nuestro refugio y nuestra fuerza, una ayuda que es fácil de encontrar en tiempos de angustia.", citation: "Salmo 46:1" },
  { text: "‘Porque sé muy bien lo que tengo en mente para ustedes’, afirma Jehová. ‘Quiero que tengan paz, no calamidad. Quiero darles un futuro y una esperanza’.", citation: "Jeremías 29:11" }
];

// --- ORIGINAL FUNCTION LOGIC ---

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const currentUTCHour = new Date().getUTCHours();

    const { data: settings, error } = await supabaseAdmin
      .from('site_settings')
      .select('user_id')
      .eq('daily_encouragement_utc_hour', currentUTCHour);
    
    if (error) throw error;

    if (!settings || settings.length === 0) {
      return new Response(JSON.stringify({ message: `No users scheduled for UTC hour ${currentUTCHour}.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const userIds = settings.map(s => s.user_id);
    const verse = verses[Math.floor(Math.random() * verses.length)];

    await sendNotification({
      userIds,
      title: 'Tu Dosis de Ánimo Diario 💌',
      body: `"${verse.text}" - ${verse.citation}`,
    });
    
    return new Response(JSON.stringify({ success: true, usersNotified: userIds.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Error in daily-encouragement cron function:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
