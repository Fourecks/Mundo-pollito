import { Todo } from '../types';

const NOTION_SETTINGS_KEY = 'pollito_notion_settings';
const NOTION_BASE_URL = 'https://api.notion.com/v1';
const CORS_PROXY = 'https://corsproxy.io/?';

export interface NotionSettings {
  enabled: boolean;
  token: string;
  databaseId: string;
  autoSync: boolean;
  completedProperty?: string;
  priorityProperty?: string;
  dateProperty?: string;
  databaseName?: string;
}

export interface NotionPageItem {
  id: string;
  title: string;
  url: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate: string | null;
  notes?: string;
}

export class NotionService {

  /**
   * Get saved Notion integration settings
   */
  static getSettings(): NotionSettings {
    try {
      const data = localStorage.getItem(NOTION_SETTINGS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error loading Notion settings:', e);
    }
    return {
      enabled: false,
      token: '',
      databaseId: '',
      autoSync: false,
      completedProperty: 'Completada',
      priorityProperty: 'Prioridad',
      dateProperty: 'Fecha',
    };
  }

  /**
   * Save Notion integration settings
   */
  static saveSettings(settings: NotionSettings): void {
    try {
      localStorage.setItem(NOTION_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving Notion settings:', e);
    }
  }

  /**
   * Helper to make authorized Notion requests through CORS proxy
   */
  private static async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const settings = this.getSettings();
    if (!settings.token) {
      throw new Error('Notion token is missing. Please configure Notion integration.');
    }

    const url = `${CORS_PROXY}${NOTION_BASE_URL}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${settings.token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.message || `HTTP error! status: ${response.status}`;
      throw new Error(errMsg);
    }

    return response.json();
  }

  /**
   * Test connection and retrieve database properties to verify integration
   */
  static async testConnection(token: string, databaseId: string): Promise<{ success: boolean; properties: string[]; titleProp: string }> {
    const url = `${CORS_PROXY}${NOTION_BASE_URL}/databases/${databaseId}`;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, { headers });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `No se pudo conectar a la base de datos de Notion (${response.status})`);
    }

    const data = await response.json();
    const properties = Object.keys(data.properties || {});
    
    // Find the title property
    let titleProp = '';
    for (const key of properties) {
      if (data.properties[key].type === 'title') {
        titleProp = key;
        break;
      }
    }

    return {
      success: true,
      properties,
      titleProp,
    };
  }

  /**
   * List all databases the Notion integration token has access to
   */
  static async fetchUserDatabases(token: string): Promise<Array<{ id: string; title: string; icon?: string | null }>> {
    const url = `${CORS_PROXY}${NOTION_BASE_URL}/search`;
    const headers = {
      'Authorization': `Bearer ${token.trim()}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filter: {
          value: 'database',
          property: 'object',
        },
        page_size: 50,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `No se pudieron obtener las bases de datos de Notion (${response.status})`);
    }

    const data = await response.json();
    const results = data.results || [];

    return results.map((db: any) => {
      let title = 'Base de datos sin título';
      if (db.title && Array.isArray(db.title) && db.title.length > 0) {
        title = db.title.map((t: any) => t.plain_text).join('') || title;
      }
      return {
        id: db.id,
        title,
        icon: db.icon?.emoji || null,
      };
    });
  }

  /**
   * Fetch pages from the Notion database
   */
  static async fetchDatabasePages(): Promise<NotionPageItem[]> {
    const settings = this.getSettings();
    if (!settings.enabled || !settings.databaseId) return [];

    const response = await this.request(`/databases/${settings.databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify({
        page_size: 100,
      }),
    });

    const results = response.results || [];
    const items: NotionPageItem[] = [];

    // Detect title property
    let titleKey = 'Name';
    if (results.length > 0 && results[0].properties) {
      const firstProps = results[0].properties;
      const foundTitleKey = Object.keys(firstProps).find(k => firstProps[k].type === 'title');
      if (foundTitleKey) titleKey = foundTitleKey;
    }

    // Map config properties or fallback
    const completedKey = settings.completedProperty || 'Completada';
    const priorityKey = settings.priorityProperty || 'Prioridad';
    const dateKey = settings.dateProperty || 'Fecha';

    for (const page of results) {
      const props = page.properties;
      if (!props) continue;

      // Title parsing
      const titleObj = props[titleKey];
      const title = titleObj?.title?.map((t: any) => t.plain_text).join('') || 'Sin título';

      // Completed parsing (Checkbox or Status)
      let completed = false;
      const compObj = props[completedKey];
      if (compObj) {
        if (compObj.type === 'checkbox') {
          completed = compObj.checkbox || false;
        } else if (compObj.type === 'status') {
          completed = compObj.status?.name === 'Done' || compObj.status?.name === 'Completada' || compObj.status?.name === 'Archived';
        }
      } else {
        // Try other common name mappings
        const fallbackCompKey = Object.keys(props).find(k => k.toLowerCase() === 'done' || k.toLowerCase() === 'completed' || k.toLowerCase() === 'completado');
        if (fallbackCompKey && props[fallbackCompKey].type === 'checkbox') {
          completed = props[fallbackCompKey].checkbox || false;
        }
      }

      // Priority parsing
      let priority: 'low' | 'medium' | 'high' = 'medium';
      const prioObj = props[priorityKey];
      if (prioObj) {
        const val = prioObj.select?.name?.toLowerCase() || prioObj.multi_select?.[0]?.name?.toLowerCase() || '';
        if (val.includes('alta') || val.includes('high') || val.includes('urgente')) {
          priority = 'high';
        } else if (val.includes('baja') || val.includes('low')) {
          priority = 'low';
        }
      }

      // Due date parsing
      let dueDate: string | null = null;
      const dateObj = props[dateKey];
      if (dateObj?.date?.start) {
        dueDate = dateObj.date.start; // YYYY-MM-DD
      }

      items.push({
        id: page.id,
        title,
        url: page.url,
        completed,
        priority,
        dueDate,
      });
    }

    return items;
  }

  /**
   * Helper to format a Todo into Notion properties payload
   */
  private static buildPageProperties(todo: Todo, titleKey: string, settings: NotionSettings) {
    const completedKey = settings.completedProperty || 'Completada';
    const priorityKey = settings.priorityProperty || 'Prioridad';
    const dateKey = settings.dateProperty || 'Fecha';

    const properties: any = {
      [titleKey]: {
        title: [
          {
            text: {
              content: todo.text,
            },
          },
        ],
      },
      [completedKey]: {
        checkbox: todo.completed,
      },
      [priorityKey]: {
        select: {
          name: todo.priority === 'high' ? 'Alta' : todo.priority === 'low' ? 'Baja' : 'Media',
        },
      },
    };

    if (todo.due_date) {
      properties[dateKey] = {
        date: {
          start: todo.due_date,
        },
      };
    } else {
      properties[dateKey] = null;
    }

    return properties;
  }

  /**
   * Insert a local task into Notion database
   */
  static async insertPage(todo: Todo): Promise<{ id: string; url: string } | null> {
    const settings = this.getSettings();
    if (!settings.enabled || !settings.databaseId) return null;

    try {
      // Find title key from settings or test connection
      let titleKey = 'Name';
      try {
        const conn = await this.testConnection(settings.token, settings.databaseId);
        titleKey = conn.titleProp || 'Name';
      } catch (err) {
        console.warn('Failed connection test while inserting, using default title Name key.', err);
      }

      const properties = this.buildPageProperties(todo, titleKey, settings);

      const response = await this.request('/pages', {
        method: 'POST',
        body: JSON.stringify({
          parent: { database_id: settings.databaseId },
          properties,
        }),
      });

      return {
        id: response.id,
        url: response.url,
      };
    } catch (e) {
      console.error('Error inserting page to Notion:', e);
      return null;
    }
  }

  /**
   * Update an existing Notion page
   */
  static async updatePage(todo: Todo): Promise<boolean> {
    const settings = this.getSettings();
    if (!settings.enabled || !todo.notion_page_id) return false;

    try {
      let titleKey = 'Name';
      try {
        const conn = await this.testConnection(settings.token, settings.databaseId);
        titleKey = conn.titleProp || 'Name';
      } catch (err) {}

      const properties = this.buildPageProperties(todo, titleKey, settings);

      await this.request(`/pages/${todo.notion_page_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          properties,
        }),
      });

      return true;
    } catch (e) {
      console.error(`Error updating Notion page ${todo.notion_page_id}:`, e);
      return false;
    }
  }

  /**
   * Delete/Archive a Notion page
   */
  static async deletePage(notionPageId: string): Promise<boolean> {
    const settings = this.getSettings();
    if (!settings.enabled || !notionPageId) return false;

    try {
      await this.request(`/pages/${notionPageId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          archived: true,
        }),
      });
      return true;
    } catch (e) {
      console.error(`Error deleting Notion page ${notionPageId}:`, e);
      return false;
    }
  }

  /**
   * Get block children and format them as readable HTML/Text notes
   */
  static async getPageNotes(notionPageId: string): Promise<string> {
    const settings = this.getSettings();
    if (!settings.enabled || !notionPageId) return '';

    try {
      const response = await this.request(`/blocks/${notionPageId}/children?page_size=100`);
      const blocks = response.results || [];
      
      let notesText = '';
      for (const block of blocks) {
        const type = block.type;
        const blockContent = block[type];
        if (!blockContent || !blockContent.rich_text) continue;

        const text = blockContent.rich_text.map((t: any) => t.plain_text).join('');
        if (!text) continue;

        switch (type) {
          case 'paragraph':
            notesText += `${text}\n\n`;
            break;
          case 'heading_1':
            notesText += `# ${text}\n\n`;
            break;
          case 'heading_2':
            notesText += `## ${text}\n\n`;
            break;
          case 'heading_3':
            notesText += `### ${text}\n\n`;
            break;
          case 'bulleted_list_item':
            notesText += `• ${text}\n`;
            break;
          case 'numbered_list_item':
            notesText += `1. ${text}\n`;
            break;
          case 'to_do':
            notesText += `[${blockContent.checked ? 'x' : ' '}] ${text}\n`;
            break;
          case 'quote':
            notesText += `> ${text}\n\n`;
            break;
          case 'code':
            notesText += `\`\`\`\n${text}\n\`\`\`\n\n`;
            break;
          default:
            notesText += `${text}\n`;
        }
      }

      return notesText.trim();
    } catch (e) {
      console.error(`Error fetching block notes for page ${notionPageId}:`, e);
      return 'No se pudieron cargar las notas desde Notion.';
    }
  }

  /**
   * Search workspace pages that the integration has access to (for quick import)
   */
  static async searchWorkspacePages(query: string): Promise<any[]> {
    const settings = this.getSettings();
    if (!settings.enabled || !settings.token) return [];

    try {
      const response = await this.request('/search', {
        method: 'POST',
        body: JSON.stringify({
          query,
          filter: {
            property: 'object',
            value: 'page',
          },
          page_size: 15,
        }),
      });

      const results = response.results || [];
      return results.map((page: any) => {
        // Parse title from page properties
        let title = 'Sin título';
        if (page.properties) {
          const titleKey = Object.keys(page.properties).find(k => page.properties[k].type === 'title');
          if (titleKey) {
            title = page.properties[titleKey].title?.map((t: any) => t.plain_text).join('') || 'Sin título';
          }
        }
        return {
          id: page.id,
          title,
          url: page.url,
          last_edited_time: page.last_edited_time,
        };
      });
    } catch (e) {
      console.error('Error searching Notion workspace:', e);
      return [];
    }
  }
}
