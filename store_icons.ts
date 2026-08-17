import { supabase } from './supabaseClient';
import * as fs from 'fs';
import * as path from 'path';

async function storeIconsInProfiles() {
  const outlookPath = path.resolve('components/icons/outlook.jpg');
  const notionPath = path.resolve('components/icons/notion.jpg');

  const outlookBase64 = fs.existsSync(outlookPath) ? `data:image/jpeg;base64,${fs.readFileSync(outlookPath).toString('base64')}` : '';
  const notionBase64 = fs.existsSync(notionPath) ? `data:image/jpeg;base64,${fs.readFileSync(notionPath).toString('base64')}` : '';

  // Try upserting into profiles with an id or username or json column
  const { data, error } = await supabase.from('profiles').upsert([
    {
      id: '00000000-0000-0000-0000-000000000000',
      username: 'system_assets',
      avatar_url: outlookBase64,
      // If there's a settings or metadata column
    }
  ], { onConflict: 'id' });

  console.log('Profiles upsert result:', { data, error: error?.message });
}

storeIconsInProfiles();
