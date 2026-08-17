import { supabase } from './supabaseClient';
import * as fs from 'fs';
import * as path from 'path';

async function uploadIcons() {
  try {
    console.log('Checking Supabase storage buckets...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }

    console.log('Existing buckets:', buckets.map(b => b.name));

    // Find or create bucket named 'public' or 'assets' or 'icons'
    let bucketName = 'public';
    const targetBucket = buckets.find(b => b.name === 'public' || b.name === 'assets' || b.name === 'icons');
    if (targetBucket) {
      bucketName = targetBucket.name;
    } else {
      console.log('Creating bucket "public"...');
      const { data, error } = await supabase.storage.createBucket('public', { public: true });
      if (error) {
        console.error('Error creating bucket:', error);
        bucketName = buckets[0]?.name || 'public';
      } else {
        bucketName = 'public';
      }
    }

    console.log(`Using bucket: ${bucketName}`);

    const outlookPath = path.resolve('components/icons/outlook.jpg');
    const notionPath = path.resolve('components/icons/notion.jpg');

    if (fs.existsSync(outlookPath)) {
      const outlookBuffer = fs.readFileSync(outlookPath);
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload('outlook.jpg', outlookBuffer, { upsert: true, contentType: 'image/jpeg' });
      if (error) {
        console.error('Error uploading outlook.jpg:', error);
      } else {
        const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl('outlook.jpg');
        console.log('Outlook uploaded successfully! Public URL:', publicUrl);
      }
    }

    if (fs.existsSync(notionPath)) {
      const notionBuffer = fs.readFileSync(notionPath);
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload('notion.jpg', notionBuffer, { upsert: true, contentType: 'image/jpeg' });
      if (error) {
        console.error('Error uploading notion.jpg:', error);
      } else {
        const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl('notion.jpg');
        console.log('Notion uploaded successfully! Public URL:', publicUrl);
      }
    }

  } catch (err) {
    console.error('Exception during upload:', err);
  }
}

uploadIcons();
