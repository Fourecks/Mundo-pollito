import { supabase } from './supabaseClient';
import * as fs from 'fs';
import * as path from 'path';

async function testQuickNotesTable() {
  const outlookPath = path.resolve('components/icons/outlook.jpg');
  const notionPath = path.resolve('components/icons/notion.jpg');

  const outlookBase64 = fs.existsSync(outlookPath) ? `data:image/jpeg;base64,${fs.readFileSync(outlookPath).toString('base64')}` : '';
  const notionBase64 = fs.existsSync(notionPath) ? `data:image/jpeg;base64,${fs.readFileSync(notionPath).toString('base64')}` : '';

  const { data, error } = await supabase.from('quick_notes').insert([
    { title: '__SYSTEM_ASSET_OUTLOOK_ICON__', content: outlookBase64 },
    { title: '__SYSTEM_ASSET_NOTION_ICON__', content: notionBase64 }
  ]).select();

  console.log('Quick notes insert result:', { data: data ? data.length : 0, error: error?.message });
}

testQuickNotesTable();
