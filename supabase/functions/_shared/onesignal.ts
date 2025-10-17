
// This helper function encapsulates the logic for sending a notification via the OneSignal API.
// It retrieves the necessary secrets from the environment and constructs the API request.

interface NotificationPayload {
  title: string;
  body: string;
  userIds: string[];
}

// Deno is available in the Supabase Edge Functions environment.
declare const Deno: any;

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
  const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    throw new Error("OneSignal secrets (ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY) are not configured in the function's environment variables.");
  }

  // OneSignal requires the 'contents' and 'headings' to have an 'en' key, even if the text is in another language.
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
