import { supabase } from './supabaseClient';
import * as fs from 'fs';
import * as path from 'path';

async function setupSupabaseAssets() {
  try {
    const outlookPath = path.resolve('components/icons/outlook.jpg');
    const notionPath = path.resolve('components/icons/notion.jpg');

    const outlookBase64 = fs.existsSync(outlookPath) ? `data:image/jpeg;base64,${fs.readFileSync(outlookPath).toString('base64')}` : '';
    const notionBase64 = fs.existsSync(notionPath) ? `data:image/jpeg;base64,${fs.readFileSync(notionPath).toString('base64')}` : '';

    console.log('Upserting icons into Supabase table "app_assets"...');

    // Try inserting into app_assets table
    const { error } = await supabase
      .from('app_assets')
      .upsert([
        { key: 'outlook_icon', value: outlookBase64, updated_at: new Date().toISOString() },
        { key: 'notion_icon', value: notionBase64, updated_at: new Date().toISOString() }
      ], { onConflict: 'key' });

    if (error) {
      console.error('Error upserting to app_assets (table might need to be created in Supabase SQL editor):', error.message);
    } else {
      console.log('Icons successfully saved to Supabase table "app_assets"!');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

setupSupabaseAssets();
