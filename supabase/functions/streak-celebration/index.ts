// supabase/functions/streak-celebration/index.ts

// ⚠️ INSTRUCCIONES DE DESPLIEGUE
// 1. **MODIFICACIÓN DE LA BASE DE DATOS (IMPORTANTE):**
//    Antes de desplegar, añade una nueva columna a tu tabla `profiles`:
//    - Ve a tu panel de Supabase -> Table Editor -> `profiles`.
//    - Haz clic en "Add column".
//    - Nombre: `last_streak_celebration`
//    - Tipo: `int8` (o `integer`)
//    - Valor por defecto (Default Value): `0`
//    - Desmarca "Is Nullable" (debe tener un valor).
//    - Guarda los cambios.
//
// 2. Despliega esta función con el indicador `--no-verify-jwt`:
//    supabase functions deploy streak-celebration --no-verify-jwt
//
// 3. Programa un cron job para que se ejecute una vez al día. Una buena hora es a las 2 AM UTC.
//    Schedule: 0 2 * * *
//    Function: streak-celebration

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';
import { sendOneSignalNotification } from '../_shared/onesignal.ts';

const CELEBRATION_MILESTONES = [3, 5, 7, 10, 14, 21, 30, 50, 75, 100];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Get all users and their profiles
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, last_streak_celebration');

    if (profileError) throw profileError;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No user profiles found." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // 2. Get the latest timezone offset for every user
    const { data: allTimezonedTodos, error: todosFetchError } = await supabaseAdmin
      .from('todos')
      .select('user_id, timezone_offset, created_at')
      .not('timezone_offset', 'is', null);

    if (todosFetchError) throw todosFetchError;

    const latestUserOffsets = allTimezonedTodos.reduce((acc, todo) => {
      if (!acc[todo.user_id] || new Date(todo.created_at) > new Date(acc[todo.user_id].created_at)) {
        acc[todo.user_id] = { offset: todo.timezone_offset, created_at: todo.created_at };
      }
      return acc;
    }, {} as Record<string, { offset: number; created_at: string }>);


    let notificationsSent = 0;

    // 3. Process each user
    for (const profile of profiles) {
      const userId = profile.id;
      const lastCelebratedStreak = profile.last_streak_celebration || 0;
      const userOffset = latestUserOffsets[userId]?.offset ?? 0; // Default to UTC if no offset found

      // Calculate streak
      let currentStreak = 0;
      // Loop backwards for up to 100 days (max milestone)
      for (let i = 1; i <= 100; i++) {
        const now = new Date();
        // Get "yesterday", "day before yesterday", etc. in the user's timezone
        const userLocalTime = new Date(now.getTime() - userOffset * 60 * 1000);
        userLocalTime.setUTCDate(userLocalTime.getUTCDate() - i);
        const dateKey = userLocalTime.toISOString().split('T')[0];
        
        const { data: tasks, error: taskError } = await supabaseAdmin
          .from('todos')
          .select('completed')
          .eq('user_id', userId)
          .eq('due_date', dateKey);

        if (taskError) {
          console.error(`Error fetching tasks for user ${userId} on ${dateKey}:`, taskError);
          // Stop calculating streak for this user if there's a DB error
          break;
        }

        if (!tasks || tasks.length === 0) {
          // No tasks for this day, streak continues.
          continue;
        }

        if (tasks.every(task => task.completed)) {
          currentStreak++;
        } else {
          // Incomplete tasks found, streak is broken.
          break;
        }
      }

      // 4. Check for celebration and update profile
      const achievedMilestone = CELEBRATION_MILESTONES.filter(m => currentStreak >= m).pop() || 0;

      if (achievedMilestone > lastCelebratedStreak) {
        // Send notification!
        const title = `¡Racha de ${achievedMilestone} días! 🎉`;
        const message = `¡Eres imparable! Llevas ${achievedMilestone} días seguidos completando todo. ¡Sigue así, pollito campeón!`;
        await sendOneSignalNotification(userId, title, message);
        notificationsSent++;

        // Update profile
        await supabaseAdmin
          .from('profiles')
          .update({ last_streak_celebration: achievedMilestone })
          .eq('id', userId);

      } else if (currentStreak < lastCelebratedStreak && lastCelebratedStreak > 0) {
        // Streak was broken, reset the celebration counter
        await supabaseAdmin
          .from('profiles')
          .update({ last_streak_celebration: 0 })
          .eq('id', userId);
      }
    }

    return new Response(JSON.stringify({ message: `Streak check complete. Sent ${notificationsSent} celebration notifications.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error("Error in streak-celebration function:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
