// supabase/functions/_shared/onesignal.ts

declare const Deno: any;

export async function sendOneSignalNotification(userId: string, title: string, message: string) {
  const ONE_SIGNAL_APP_ID = Deno.env.get('ONE_SIGNAL_APP_ID');
  const ONE_SIGNAL_REST_API_KEY = Deno.env.get('ONE_SIGNAL_REST_API_KEY');

  if (!ONE_SIGNAL_APP_ID || !ONE_SIGNAL_REST_API_KEY) {
    console.error("OneSignal secrets are not set in environment variables.");
    return false; // Don't throw, just fail this one notification
  }
  
  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${ONE_SIGNAL_REST_API_KEY}`
    },
    body: JSON.stringify({
      app_id: ONE_SIGNAL_APP_ID,
      include_external_user_ids: [userId],
      headings: { en: title },
      contents: { en: message },
      subtitle: { en: "" }, // Explicitly set subtitle to empty
      web_url: Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.onrender.com') || 'https://pollito-productivo.onrender.com',
      chrome_web_icon: "https://pbtdzkpympdfemnejpwj.supabase.co/storage/v1/object/public/Sonido-ambiente/pollito-icon-192.png",
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error(`OneSignal API Error for user ${userId}:`, errorData);
    return false;
  }
  
  return true;
}