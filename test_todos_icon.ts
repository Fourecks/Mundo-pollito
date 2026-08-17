import { supabase } from './supabaseClient';
import * as fs from 'fs';
import * as path from 'path';

async function testTodosIcon() {
  const outlookPath = path.resolve('components/icons/outlook.jpg');
  const notionPath = path.resolve('components/icons/notion.jpg');

  const outlookBase64 = fs.existsSync(outlookPath) ? `data:image/jpeg;base64,${fs.readFileSync(outlookPath).toString('base64')}` : '';
  const notionBase64 = fs.existsSync(notionPath) ? `data:image/jpeg;base64,${fs.readFileSync(notionPath).toString('base64')}` : '';

  // Delete existing system asset todos first if any
  await supabase.from('todos').delete().like('title', '__SYSTEM_ASSET_%');

  const { data, error } = await supabase.from('todos').insert([
    { title: '__SYSTEM_ASSET_OUTLOOK_ICON__', description: outlookBase64, completed: true },
    { title: '__SYSTEM_ASSET_NOTION_ICON__', description: notionBase64, completed: true }
  ]).select();

  console.log('Todos insert result:', { data: data ? data.length : 0, error: error?.message });
}

testTodosIcon();
