// supabase/functions/random-encouragement/index.ts

// ⚠️ DEPLOYMENT INSTRUCTION
// Deploy this function with the `--no-verify-jwt` flag to allow cron job execution.
// supabase functions deploy random-encouragement --no-verify-jwt
// Also, schedule this to run hourly. e.g., '0 * * * *'

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';
import { sendOneSignalNotification } from '../_shared/onesignal.ts';
import { encouragementMessages } from '../_shared/encouragement-messages.ts';

// Creates a deterministic "random" hour for a user on a given day.
const getDeterministicHour = (userId: string, dateStr: string): number => {
  const seed = userId + dateStr;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const randomValue = Math.abs(hash);
  // This produces an hour between 10 (10 AM) and 18 (6 PM) inclusive.
  return 10 + (randomValue % 9);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const nowUTC = new Date();

    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, timezone_offset, last_random_encouragement_sent_at');
    
    if (error) throw error;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No profiles found." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const notificationsToSend: { userId: string, dateKey: string }[] = [];
    
    for (const profile of profiles) {
      const userOffsetMinutes = profile.timezone_offset ?? 0;
      const userLocalTime = new Date(nowUTC.getTime() - userOffsetMinutes * 60 * 1000);
      const userLocalDateKey = userLocalTime.toISOString().split('T')[0];
      
      // Check if a notification has already been sent today for this user
      if (profile.last_random_encouragement_sent_at === userLocalDateKey) {
        continue;
      }
      
      const scheduledHour = getDeterministicHour(profile.id, userLocalDateKey);
      const currentLocalHour = userLocalTime.getUTCHours();
      
      if (currentLocalHour === scheduledHour) {
        notificationsToSend.push({ userId: profile.id, dateKey: userLocalDateKey });
      }
    }
    
    if (notificationsToSend.length === 0) {
      return new Response(JSON.stringify({ message: "No users to notify at this hour." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const notificationPromises = notificationsToSend.map(({ userId }) => {
        const message = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
        const title = 'Un mensajito para ti 🐥';
        return sendOneSignalNotification(userId, title, message);
    });

    const updatePromises = notificationsToSend.map(({ userId, dateKey }) => {
        return supabaseAdmin
            .from('profiles')
            .update({ last_random_encouragement_sent_at: dateKey })
            .eq('id', userId);
    });
    
    await Promise.all([...notificationPromises, ...updatePromises]);
    
    return new Response(JSON.stringify({ message: `Sent random encouragement to ${notificationsToSend.length} users.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error("Error in random-encouragement function:", err);
    return new Response(JSON.stringify({ error: err.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
