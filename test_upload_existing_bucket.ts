import { supabase } from './supabaseClient';
import * as fs from 'fs';
import * as path from 'path';

async function testUpload() {
  const bucketsToTry = ['public', 'assets', 'icons', 'images', 'media', 'files', 'storage'];
  const outlookPath = path.resolve('components/icons/outlook.jpg');
  const outlookBuffer = fs.readFileSync(outlookPath);

  for (const bucket of bucketsToTry) {
    console.log(`Trying bucket: ${bucket}...`);
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload('outlook.jpg', outlookBuffer, { upsert: true, contentType: 'image/jpeg' });

    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl('outlook.jpg');
      console.log(`SUCCESS! Bucket "${bucket}" worked! Public URL:`, publicUrl);
      return;
    } else {
      console.log(`Bucket "${bucket}" failed:`, error.message);
    }
  }
}

testUpload();
