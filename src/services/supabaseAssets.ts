import { supabase } from '../../supabaseClient';

const outlookDefault = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=100';
const notionDefault = 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=100';

const iconCache: { [key: string]: string } = {
  outlook: outlookDefault,
  notion: notionDefault,
};

export async function fetchIconFromSupabase(iconName: 'outlook' | 'notion'): Promise<string> {
  try {
    const { data: { publicUrl } } = supabase.storage.from('public').getPublicUrl(`${iconName}.jpg`);
    if (publicUrl) {
      return publicUrl;
    }
  } catch (err) {
    console.error('Error fetching icon from Supabase:', err);
  }
  return iconName === 'outlook' ? outlookDefault : notionDefault;
}
