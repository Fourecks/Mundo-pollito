import { createClient } from '@supabase/supabase-js';
import { config } from './config';
import * as fs from 'fs';
import * as path from 'path';

const url = config.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (process.env as any).SUPABASE_SERVICE_KEY || '';

console.log('Service key available:', !!serviceKey);

if (serviceKey) {
  const adminClient = createClient(url, serviceKey);
  async function run() {
    console.log('Creating bucket "public" with admin client...');
    const { data, error } = await adminClient.storage.createBucket('public', { public: true });
    console.log('Create bucket result:', { data, error: error?.message });

    const outlookPath = path.resolve('components/icons/outlook.jpg');
    const notionPath = path.resolve('components/icons/notion.jpg');

    if (fs.existsSync(outlookPath)) {
      const { error: upErr } = await adminClient.storage
        .from('public')
        .upload('outlook.jpg', fs.readFileSync(outlookPath), { upsert: true, contentType: 'image/jpeg' });
      console.log('Outlook upload:', upErr ? upErr.message : 'SUCCESS');
    }

    if (fs.existsSync(notionPath)) {
      const { error: upErr } = await adminClient.storage
        .from('public')
        .upload('notion.jpg', fs.readFileSync(notionPath), { upsert: true, contentType: 'image/jpeg' });
      console.log('Notion upload:', upErr ? upErr.message : 'SUCCESS');
    }

    const { data: { publicUrl: url1 } } = adminClient.storage.from('public').getPublicUrl('outlook.jpg');
    const { data: { publicUrl: url2 } } = adminClient.storage.from('public').getPublicUrl('notion.jpg');
    console.log('Public URLs:', { url1, url2 });
  }
  run();
} else {
  console.log('No service role key found.');
}
