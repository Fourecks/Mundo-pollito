import { supabase } from '../../supabaseClient';
import outlookDefault from '../../components/icons/outlook.jpg';
import notionDefault from '../../components/icons/notion.jpg';

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
