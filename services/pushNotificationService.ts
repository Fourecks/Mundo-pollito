import { PushNotificationPreferences, NotificationEventType } from '../types';
import { supabase } from '../supabaseClient';

export const DEFAULT_PUSH_PREFERENCES: PushNotificationPreferences = {
  taskReminders: true,
  pendingPayments: true,
  projects: true,
  habits: true,
  dailySummary: true,
  channelMentions: true,
  projectMembers: true,
  frequency: 'instant',
  dailyDigestHour: 9,
  leadTimeMinutes: 30,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  weekendNotifications: true,
};

export interface PushNotificationPayload {
  title: string;
  message: string;
  eventType?: NotificationEventType;
  url?: string;
  data?: Record<string, any>;
}

/**
 * Synchronize user notification preferences with OneSignal Tags.
 * OneSignal Web SDK v16 uses OneSignal.User.addTags({ ... })
 */
export async function syncPreferencesToOneSignal(
  preferences: PushNotificationPreferences
): Promise<{ success: boolean; tags: Record<string, string>; error?: string }> {
  const merged = { ...DEFAULT_PUSH_PREFERENCES, ...preferences };
  const tags: Record<string, string> = {
    notify_task_reminders: merged.taskReminders ? 'true' : 'false',
    notify_pending_payments: merged.pendingPayments ? 'true' : 'false',
    notify_projects: merged.projects ? 'true' : 'false',
    notify_habits: merged.habits ? 'true' : 'false',
    notify_daily_summary: merged.dailySummary ? 'true' : 'false',
    notify_channel_mentions: merged.channelMentions ? 'true' : 'false',
    notify_project_members: merged.projectMembers ? 'true' : 'false',
    push_frequency: merged.frequency || 'instant',
    daily_digest_hour: String(merged.dailyDigestHour ?? 9),
    lead_time_minutes: String(merged.leadTimeMinutes ?? 30),
    quiet_hours_enabled: merged.quietHoursEnabled ? 'true' : 'false',
    quiet_hours_start: merged.quietHoursStart || '22:00',
    quiet_hours_end: merged.quietHoursEnd || '07:00',
    weekend_notifications: merged.weekendNotifications ? 'true' : 'false',
    updated_at: new Date().toISOString(),
  };

  try {
    const OneSignal = (window as any).OneSignal;
    if (OneSignal?.User) {
      if (typeof OneSignal.User.addTags === 'function') {
        await OneSignal.User.addTags(tags);
      } else if (typeof OneSignal.User.addTag === 'function') {
        for (const [key, value] of Object.entries(tags)) {
          await OneSignal.User.addTag(key, value);
        }
      }
      return { success: true, tags };
    }
    return { success: true, tags };
  } catch (err: any) {
    console.debug('OneSignal tag synchronization note:', err?.message || err);
    return { success: false, tags, error: err?.message || 'Error al sincronizar con OneSignal' };
  }
}

/**
 * Read active tags from OneSignal User if available.
 */
export async function getOneSignalUserTags(): Promise<Record<string, string> | null> {
  try {
    const OneSignal = (window as any).OneSignal;
    if (OneSignal?.User && typeof OneSignal.User.getTags === 'function') {
      return await OneSignal.User.getTags();
    }
  } catch (err) {
    console.debug('Could not get OneSignal user tags:', err);
  }
  return null;
}

/**
 * Check if current time falls within user's Quiet Hours (No Molestar).
 */
export function isWithinQuietHours(preferences?: PushNotificationPreferences): boolean {
  if (!preferences?.quietHoursEnabled) return false;
  const start = preferences.quietHoursStart || '22:00';
  const end = preferences.quietHoursEnd || '07:00';

  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();

  const [sHour, sMin] = start.split(':').map(Number);
  const [eHour, eMin] = end.split(':').map(Number);
  const startMin = (sHour || 0) * 60 + (sMin || 0);
  const endMin = (eHour || 0) * 60 + (eMin || 0);

  if (startMin > endMin) {
    // Overnight quiet hours, e.g. 22:00 to 07:00
    return currentMin >= startMin || currentMin < endMin;
  } else {
    // Same day quiet hours, e.g. 13:00 to 15:00
    return currentMin >= startMin && currentMin < endMin;
  }
}

/**
 * Check if a specific notification type is allowed based on user preferences.
 */
export function isEventNotificationAllowed(
  eventType: NotificationEventType,
  preferences?: PushNotificationPreferences
): boolean {
  const current = { ...DEFAULT_PUSH_PREFERENCES, ...preferences };

  // Check Quiet Hours (unless it's a test or urgent event)
  if (eventType !== 'test' && isWithinQuietHours(current)) {
    return false;
  }

  // Check Weekend filter
  if (eventType !== 'test' && current.weekendNotifications === false) {
    const day = new Date().getDay();
    if (day === 0 || day === 6) {
      return false; // Sunday or Saturday
    }
  }

  // Check Category Flags
  switch (eventType) {
    case 'taskReminders':
      return !!current.taskReminders;
    case 'pendingPayments':
      return !!current.pendingPayments;
    case 'projects':
      return !!current.projects;
    case 'habits':
      return !!current.habits;
    case 'dailySummary':
      return !!current.dailySummary;
    case 'channelMentions':
      return !!current.channelMentions;
    case 'projectMembers':
      return !!current.projectMembers;
    case 'general':
    case 'test':
    default:
      return true;
  }
}

/**
 * Send a push notification through Supabase Edge Function (OneSignal)
 * with event-type filtering and local fallback.
 */
export async function sendPushNotification(
  payload: PushNotificationPayload,
  preferences?: PushNotificationPreferences
): Promise<{ sent: boolean; reason?: string }> {
  const { title, message, eventType = 'general' } = payload;

  // Check event preference
  if (!isEventNotificationAllowed(eventType, preferences)) {
    return { sent: false, reason: `Notificaciones de ${eventType} desactivadas o en horario de descanso` };
  }

  try {
    const { error } = await supabase.functions.invoke('send-pushalert-notification', {
      body: {
        title,
        message,
        event_type: eventType,
        url: payload.url || window.location.href,
        data: payload.data || {},
      },
    });

    if (error) {
      console.debug('Supabase push notification invoke note:', error.message);
    }

    // Also trigger browser Notification API if available & permitted as immediate feedback
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico',
        });
      } catch (notifErr) {
        // Safe ignore in restricted iframe
      }
    }

    return { sent: true };
  } catch (err: any) {
    console.debug('Push notification send notice:', err?.message || err);
    return { sent: false, reason: err?.message || 'Error al enviar notificación' };
  }
}

/**
 * Trigger an instant sample notification for the requested event type.
 */
export async function sendSampleNotificationForEvent(
  eventType: NotificationEventType,
  preferences?: PushNotificationPreferences
): Promise<{ sent: boolean; title: string; message: string; reason?: string }> {
  let title = '¡Notificación de Prueba! 🔔';
  let message = 'Tus notificaciones de OneSignal están configuradas correctamente.';

  const leadMin = preferences?.leadTimeMinutes || 30;
  const leadLabel = leadMin >= 1440 ? '1 día' : leadMin >= 60 ? `${leadMin / 60} hora(s)` : `${leadMin} minutos`;

  switch (eventType) {
    case 'taskReminders':
      title = '⏰ Recordatorio de Tarea Pendiente';
      message = `Tu tarea "Entregar reporte financiero" vence en ${leadLabel}.`;
      break;
    case 'pendingPayments':
      title = '💳 Alerta de Pago / Cuota Pendiente';
      message = 'Tienes 1 cuota de préstamo y la tarjeta de crédito con vencimiento cercano.';
      break;
    case 'projects':
      title = '📁 Actualización de Proyecto';
      message = 'Se ha completado el hito "Lanzamiento Beta" en el proyecto Rediseño Web.';
      break;
    case 'habits':
      title = '⚡ Recordatorio de Hábito Diario';
      message = '¡Mantén tu racha activa! Recuerda completar tu hábito "Meditar 10 minutos".';
      break;
    case 'dailySummary':
      title = '📊 Resumen Diario de Actividades';
      message = 'Hoy tienes 4 tareas programadas y 1 pago pendiente de procesar.';
      break;
    case 'channelMentions':
      title = '💬 @Mención en Chat de Equipo';
      message = 'Carlos te mencionó: "@tu_usuario ¿podemos revisar la presentación hoy?"';
      break;
    case 'projectMembers':
      title = '👥 Nuevo Colaborador en Proyecto';
      message = 'Ana Gómez aceptó la invitación al proyecto "Plan Estratégico".';
      break;
    case 'general':
    case 'test':
    default:
      title = '🔔 Notificación de Prueba OneSignal';
      message = '¡Tus preferencias de notificación están activadas y sincronizadas!';
      break;
  }

  const result = await sendPushNotification({ title, message, eventType }, preferences);
  return { ...result, title, message };
}
