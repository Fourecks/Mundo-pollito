// FIX: Declare Deno global to resolve TypeScript errors in non-Deno environments.
declare const Deno: any;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import webpush from 'https://deno.land/x/webpush@0.2.0/mod.ts';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;

// Initialize web-push
webpush.setVapidDetails(
  'mailto:example@example.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
);

serve(async (_req) => {
  try {
    // Create a Supabase client with the service_role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1. Find tasks that are due for a reminder
    // We check for tasks in a small window (e.g., next minute) to avoid missing any
    const now = new Date();
    const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000);
    const todayDateString = now.toISOString().split('T')[0];

    const { data: todos, error: todosError } = await supabaseAdmin
      .from('todos')
      .select('*')
      .eq('due_date', todayDateString)
      .eq('completed', false)
      .eq('notification_sent', false)
      .gt('reminder_offset', 0)
      .neq('start_time', null);

    if (todosError) throw todosError;

    const notificationsToSend = [];
    const sentTodoIds = new Set();

    for (const todo of todos) {
      const startTime = new Date(`${todo.due_date}T${todo.start_time}`);
      const reminderTime = new Date(startTime.getTime() - todo.reminder_offset * 60 * 1000);

      // Check if the reminder time is within our cron window
      if (reminderTime >= now && reminderTime < oneMinuteFromNow) {
        // 2. Find the user's push subscription
        const { data: subscriptions, error: subsError } = await supabaseAdmin
          .from('push_subscriptions')
          .select('subscription')
          .eq('user_id', todo.user_id);

        if (subsError) {
          console.error(`Error fetching subscriptions for user ${todo.user_id}:`, subsError);
          continue; // Skip to next todo
        }

        // 3. Prepare to send notifications
        for (const { subscription } of subscriptions) {
          if (subscription && subscription.endpoint) {
            const payload = JSON.stringify({
              title: 'Recordatorio de Tarea',
              body: `¡Es hora de empezar: "${todo.text}"!`,
              tag: `todo-${todo.id}`
            });
            notificationsToSend.push({ subscription, payload, todoId: todo.id });
            sentTodoIds.add(todo.id);
          }
        }
      }
    }

    if (notificationsToSend.length === 0) {
      return new Response(JSON.stringify({ message: "No reminders to send." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 4. Send all notifications
    const sendPromises = notificationsToSend.map(async ({ subscription, payload, todoId }) => {
      try {
        await webpush.sendNotification(subscription, payload);
      } catch (error) {
        console.error(`Error sending notification for todo ${todoId}:`, error);
        // If subscription is expired or invalid, delete it from the database
        if (error.statusCode === 410) {
          console.log(`Subscription for endpoint ${subscription.endpoint} is gone. Deleting.`);
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('subscription->>endpoint', subscription.endpoint);
        }
      }
    });
    
    await Promise.all(sendPromises);

    // 5. Mark todos as having had their notification sent
    if (sentTodoIds.size > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('todos')
        .update({ notification_sent: true })
        .in('id', Array.from(sentTodoIds));
      if (updateError) throw updateError;
    }

    return new Response(JSON.stringify({ message: `Sent ${notificationsToSend.length} reminders.` }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error('Function error:', err);
    return new Response(String(err?.message ?? err), { status: 500 });
  }
});

/* 
To deploy and schedule this function:
1. Make sure you have the Supabase CLI installed.
2. Run `supabase functions deploy send-reminders --no-verify-jwt`
3. Set the required secrets in your Supabase project dashboard (or via CLI):
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - VAPID_PUBLIC_KEY
   - VAPID_PRIVATE_KEY
4. Schedule the function to run every minute using a cron job. In `supabase/config.toml`, add:
   [functions.send-reminders]
   schedule = "* * * * *"
   This requires deploying your project settings: `supabase link` and `supabase start` or `supabase deploy`.
*/