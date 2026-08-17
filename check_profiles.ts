import { supabase } from './supabaseClient';
import * as fs from 'fs';
import * as path from 'path';

async function checkProfiles() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  console.log('Profiles sample:', { data, error });

  const outlookPath = path.resolve('components/icons/outlook.jpg');
  const notionPath = path.resolve('components/icons/notion.jpg');

  const outlookBase64 = fs.existsSync(outlookPath) ? `data:image/jpeg;base64,${fs.readFileSync(outlookPath).toString('base64')}` : '';
  const notionBase64 = fs.existsSync(notionPath) ? `data:image/jpeg;base64,${fs.readFileSync(notionPath).toString('base64')}` : '';

  // Let's try inserting or updating in profiles or a custom table if possible
  // Or even better, let's create a Supabase Edge Function or check if we can insert into 'profiles'
}

checkProfiles();
