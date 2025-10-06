// config.ts
// This file is a fallback for environment variables when running in an editor
// that doesn't support them. In a production environment (like Render),
// these values should be set as secure environment variables.
//
// ⚠️ IMPORTANT: Do not commit this file with real secrets to a public repository.
// This is intended for local development/preview environments only.

export const config = {
  // --- Google Drive ---
  // To get a client ID, follow the Google Drive API documentation:
  // https://developers.google.com/drive/api/v3/quickstart/js
  // Ensure your Authorized JavaScript origins include the URL of this editor.
  GOOGLE_CLIENT_ID: "601258936098-roqd1oa5o3gav2s8aekqgpreuaoenknk.apps.googleusercontent.com",

  // --- Gemini API ---
  // Get your API key from Google AI Studio: https://aistudio.google.com/app/apikey
  API_KEY: "AIzaSyAsdRj75qRu1qITQ7qKeURgIrahT92JGcg",

  // --- Supabase ---
  // Get your project URL and anon key from your Supabase project settings.
  SUPABASE_URL: "https://pbtdzkpympdfemnejpwj.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBidGR6a3B5bXBkZmVtbmVqcHdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MzYyMTYsImV4cCI6MjA3NTExMjIxNn0.VsHBuGnmV3T0hJ5sSO6vYlckONHO9IIQmTTjb_S_pBg",

  // --- Push Notifications ---
  // Generate VAPID keys using a library like `web-push`.
  // The public key is safe to expose on the client.
  VAPID_PUBLIC_KEY: "BPGS1Q5RvxzF71vMEb3gKolzNWG0NCme4gJbGKaC4q9j9UDt16-wQ27Y5uClL8eOvYjrwXPvBm3lQwX5M-X8qpw",
  // The private key MUST be kept secret on your server/edge function.
  VAPID_PRIVATE_KEY: "6xYn4T5yVAIuIFceWuk2y_hJ_l3YLdJTM6rV0w7hJLo"
};
