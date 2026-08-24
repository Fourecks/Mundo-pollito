import { Todo, GoogleCalendarEvent, GoogleCalendar, CalendarIntegrationAccount } from '../types';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// Storage keys
const CALENDAR_ACCOUNTS_KEY = 'pollito_calendar_accounts';
const ACTIVE_CALENDAR_PROVIDER_KEY = 'pollito_active_calendar_provider';

// Microsoft Graph API endpoints
const MS_GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export class CalendarSyncService {
  /**
   * Save calendar account to local storage
   */
  static saveAccount(account: CalendarIntegrationAccount): void {
    try {
      const accounts = this.getSavedAccounts();
      const index = accounts.findIndex(a => a.provider === account.provider);
      if (index >= 0) {
        accounts[index] = account;
      } else {
        accounts.push(account);
      }
      localStorage.setItem(CALENDAR_ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.error('Error saving calendar account:', e);
    }
  }

  /**
   * Get all saved calendar accounts
   */
  static getSavedAccounts(): CalendarIntegrationAccount[] {
    try {
      const data = localStorage.getItem(CALENDAR_ACCOUNTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error loading calendar accounts:', e);
      return [];
    }
  }

  /**
   * Get account by provider
   */
  static getAccount(provider: 'google' | 'outlook'): CalendarIntegrationAccount | null {
    const accounts = this.getSavedAccounts();
    return accounts.find(a => a.provider === provider) || null;
  }

  /**
   * Remove account by provider
   */
  static removeAccount(provider: 'google' | 'outlook'): void {
    try {
      const accounts = this.getSavedAccounts().filter(a => a.provider !== provider);
      localStorage.setItem(CALENDAR_ACCOUNTS_KEY, JSON.stringify(accounts));
      if (this.getActiveProvider() === provider) {
        localStorage.removeItem(ACTIVE_CALENDAR_PROVIDER_KEY);
      }
    } catch (e) {
      console.error('Error removing calendar account:', e);
    }
  }

  /**
   * Set active calendar provider
   */
  static setActiveProvider(provider: 'google' | 'outlook' | 'none'): void {
    localStorage.setItem(ACTIVE_CALENDAR_PROVIDER_KEY, provider);
  }

  /**
   * Get active calendar provider
   */
  static getActiveProvider(): 'google' | 'outlook' | 'none' {
    return (localStorage.getItem(ACTIVE_CALENDAR_PROVIDER_KEY) as 'google' | 'outlook' | 'none') || 'none';
  }

  // ==========================================
  // GOOGLE CALENDAR API INTEGRATION
  // ==========================================

  /**
   * Insert event into Google Calendar
   */
  static async insertGoogleEvent(
    todo: Todo,
    token: string,
    calendarId: string = 'primary'
  ): Promise<{ id: string; htmlLink?: string } | null> {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const startDateStr = todo.due_date || todayStr;
      const endDateStr = todo.end_date || startDateStr;

      let eventResource: any;

      if (todo.start_time) {
        const startDateTime = `${startDateStr}T${todo.start_time}:00`;
        let endDateTime = `${endDateStr}T${todo.end_time || todo.start_time}:00`;
        
        if (!todo.end_time || todo.end_time === todo.start_time) {
          const [h, m] = todo.start_time.split(':').map(Number);
          const endD = new Date(`${startDateStr}T${todo.start_time}:00`);
          endD.setMinutes(endD.getMinutes() + 30);
          const endHours = String(endD.getHours()).padStart(2, '0');
          const endMins = String(endD.getMinutes()).padStart(2, '0');
          endDateTime = `${startDateStr}T${endHours}:${endMins}:00`;
        }

        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

        eventResource = {
          summary: todo.text,
          description: `🐥 Creado desde Pollito Productivo\n${todo.notes ? '\nNotas: ' + todo.notes : ''}\nPrioridad: ${todo.priority}`,
          start: {
            dateTime: new Date(startDateTime).toISOString(),
            timeZone,
          },
          end: {
            dateTime: new Date(endDateTime).toISOString(),
            timeZone,
          },
        };
      } else {
        const nextDay = new Date(`${endDateStr}T00:00:00`);
        nextDay.setDate(nextDay.getDate() + 1);
        const endDayStr = nextDay.toISOString().split('T')[0];

        eventResource = {
          summary: todo.text,
          description: `🐥 Creado desde Pollito Productivo\n${todo.notes ? '\nNotas: ' + todo.notes : ''}\nPrioridad: ${todo.priority}`,
          start: {
            date: startDateStr,
          },
          end: {
            date: endDayStr,
          },
        };
      }

      // Try GAPI first if available
      if (window.gapi && window.gapi.client && window.gapi.client.calendar) {
        const response = await window.gapi.client.calendar.events.insert({
          calendarId: calendarId || 'primary',
          resource: eventResource,
        });
        if (response?.result?.id) {
          return {
            id: response.result.id,
            htmlLink: response.result.htmlLink,
          };
        }
      }

      // Fallback to direct REST API
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId || 'primary')}/events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventResource),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Failed to create Google Calendar event:', err);
        if (res.status === 403) {
          alert('Error 403 (Permiso Denegado) en Google Calendar.\n\nPosibles causas:\n1. No has habilitado la "Google Calendar API" en tu Google Cloud Console.\n2. Al iniciar sesión, no marcaste la casilla para darle permisos de calendario a la app.');
        }
        return null;
      }

      const data = await res.json();
      return {
        id: data.id,
        htmlLink: data.htmlLink,
      };
    } catch (error) {
      console.error('Error inserting Google Calendar event:', error);
      return null;
    }
  }

  /**
   * Update event in Google Calendar
   */
  static async updateGoogleEvent(
    todo: Todo,
    token: string,
    eventId: string,
    calendarId: string = 'primary'
  ): Promise<boolean | { id: string; htmlLink?: string }> {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const startDateStr = todo.due_date || todayStr;
      const endDateStr = todo.end_date || startDateStr;

      let eventResource: any;

      if (todo.start_time) {
        let startDateTime = `${startDateStr}T${todo.start_time}:00`;
        let endDateTime = `${endDateStr}T${todo.end_time || todo.start_time}:00`;
        if (!todo.end_time) {
          const endD = new Date(startDateTime);
          endD.setMinutes(endD.getMinutes() + 30);
          const endHours = String(endD.getHours()).padStart(2, '0');
          const endMins = String(endD.getMinutes()).padStart(2, '0');
          endDateTime = `${startDateStr}T${endHours}:${endMins}:00`;
        }
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        eventResource = {
          summary: todo.text,
          description: todo.notes || '',
          start: { dateTime: startDateTime, timeZone },
          end: { dateTime: endDateTime, timeZone },
        };
      } else {
        const nextDayDate = new Date(`${endDateStr}T00:00:00`);
        nextDayDate.setDate(nextDayDate.getDate() + 1);
        const nextDayStr = nextDayDate.toISOString().split('T')[0];
        eventResource = {
          summary: todo.text,
          description: todo.notes || '',
          start: { date: startDateStr },
          end: { date: nextDayStr },
        };
      }

      if (window.gapi && window.gapi.client && window.gapi.client.calendar) {
        try {
          await window.gapi.client.calendar.events.update({
            calendarId: calendarId || 'primary',
            eventId: eventId,
            resource: eventResource,
          });
          return true;
        } catch (gapiErr: any) {
          if (gapiErr?.result?.error?.code === 404 || gapiErr?.status === 404) {
            console.warn('Event not found in Google Calendar during update, recreating it...');
            const insertResult = await this.insertGoogleEvent(todo, token, calendarId);
            return insertResult || false;
          }
          throw gapiErr;
        }
      }

      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId || 'primary')}/events/${encodeURIComponent(eventId)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventResource),
      });

      if (!res.ok) {
        if (res.status === 404) {
          console.warn('Event not found in Google Calendar during update, recreating it...');
          const insertResult = await this.insertGoogleEvent(todo, token, calendarId);
          return insertResult || false;
        }
        console.error('Failed to update Google event:', await res.json().catch(() => ({})));
        return false;
      }
      return true;
    } catch (error: any) {
      if (error?.result?.error?.code === 404 || error?.status === 404) {
        console.warn('Event not found in Google Calendar during update, recreating it...');
        const insertResult = await this.insertGoogleEvent(todo, token, calendarId);
        return insertResult || false;
      }
      console.error('Error updating Google Calendar event:', error);
      return false;
    }
  }

  /**
   * Delete event from Google Calendar
   */
  static async deleteGoogleEvent(
    eventId: string,
    token: string,
    calendarId: string = 'primary'
  ): Promise<boolean> {
    try {
      if (window.gapi && window.gapi.client && window.gapi.client.calendar) {
        try {
          await window.gapi.client.calendar.events.delete({
            calendarId: calendarId || 'primary',
            eventId: eventId,
          });
          return true;
        } catch (gapiErr: any) {
          if (gapiErr?.result?.error?.code === 404 || gapiErr?.result?.error?.code === 410 || gapiErr?.status === 404 || gapiErr?.status === 410) {
            console.warn('Event already deleted or not found in Google Calendar');
            return true; // Already deleted
          }
          throw gapiErr;
        }
      }

      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId || 'primary')}/events/${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return res.ok || res.status === 404;
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      return false;
    }
  }

  /**
   * Fetch events from Google Calendar
   */
  static async fetchGoogleEvents(
    token: string,
    calendarId: string = 'primary',
    timeMin?: string,
    timeMax?: string
  ): Promise<GoogleCalendarEvent[]> {
    try {
      const now = new Date();
      const minDate = timeMin || new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();
      const maxDate = timeMax || new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();

      if (window.gapi && window.gapi.client && window.gapi.client.calendar) {
        const res = await window.gapi.client.calendar.events.list({
          calendarId: calendarId || 'primary',
          timeMin: minDate,
          timeMax: maxDate,
          showDeleted: false,
          singleEvents: true,
          orderBy: 'startTime',
        });
        const items = res?.result?.items || [];
        return items.map((item: any) => ({
          id: item.id,
          summary: item.summary || '(Sin título)',
          description: item.description,
          start: item.start || {},
          end: item.end || {},
          htmlLink: item.htmlLink || `https://calendar.google.com/calendar/event?eid=${item.id}`,
          provider: 'google',
          location: item.location,
        }));
      }

      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId || 'primary')}/events?timeMin=${encodeURIComponent(minDate)}&timeMax=${encodeURIComponent(maxDate)}&singleEvents=true&orderBy=startTime`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return [];
      const data = await res.json();
      return (data.items || []).map((item: any) => ({
        id: item.id,
        summary: item.summary || '(Sin título)',
        description: item.description,
        start: item.start || {},
        end: item.end || {},
        htmlLink: item.htmlLink || `https://calendar.google.com/calendar/event?eid=${item.id}`,
        provider: 'google',
        location: item.location,
      }));
    } catch (e) {
      console.error('Error fetching Google Calendar events:', e);
      return [];
    }
  }

  /**
   * Fetch list of user's Google Calendars
   */
  static async fetchGoogleCalendars(token: string): Promise<GoogleCalendar[]> {
    try {
      if (window.gapi && window.gapi.client && window.gapi.client.calendar) {
        const res = await window.gapi.client.calendar.calendarList.list();
        return res?.result?.items || [];
      }
      const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 403) {
          console.error('Error 403 fetching calendars. Make sure Google Calendar API is enabled and scopes are granted.');
        }
        return [];
      }
      const data = await res.json();
      return data.items || [];
    } catch (e) {
      console.error('Error fetching Google calendars:', e);
      return [];
    }
  }

  // ==========================================
  // OUTLOOK / MICROSOFT GRAPH INTEGRATION
  // ==========================================

  /**
   * Insert event into Outlook Calendar
   */
  static async insertOutlookEvent(
    todo: Todo,
    token: string,
    calendarId?: string
  ): Promise<{ id: string; htmlLink?: string } | null> {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const startDateStr = todo.due_date || todayStr;
      const endDateStr = todo.end_date || startDateStr;
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      let isAllDay = true;
      let startDateTime = `${startDateStr}T00:00:00`;
      
      // Microsoft Graph API requires all-day events to end at midnight of the following day
      const endDObj = new Date(`${endDateStr}T00:00:00`);
      endDObj.setDate(endDObj.getDate() + 1);
      const nextDayY = endDObj.getFullYear();
      const nextDayM = String(endDObj.getMonth() + 1).padStart(2, '0');
      const nextDayD = String(endDObj.getDate()).padStart(2, '0');
      let endDateTime = `${nextDayY}-${nextDayM}-${nextDayD}T00:00:00`;

      if (todo.start_time) {
        isAllDay = false;
        startDateTime = `${startDateStr}T${todo.start_time}:00`;
        if (todo.end_time && todo.end_time !== todo.start_time) {
          endDateTime = `${endDateStr}T${todo.end_time}:00`;
        } else {
          const endD = new Date(`${startDateStr}T${todo.start_time}:00`);
          endD.setMinutes(endD.getMinutes() + 30);
          const endHours = String(endD.getHours()).padStart(2, '0');
          const endMins = String(endD.getMinutes()).padStart(2, '0');
          endDateTime = `${startDateStr}T${endHours}:${endMins}:00`;
        }
      }

      const eventPayload = {
        subject: todo.text,
        body: {
          contentType: 'text',
          content: `🐥 Creado desde Pollito Productivo\n${todo.notes ? '\nNotas: ' + todo.notes : ''}\nPrioridad: ${todo.priority}`,
        },
        start: {
          dateTime: startDateTime,
          timeZone,
        },
        end: {
          dateTime: endDateTime,
          timeZone,
        },
        isAllDay,
      };

      const endpoint = calendarId && calendarId !== 'primary'
        ? `${MS_GRAPH_BASE}/me/calendars/${calendarId}/events`
        : `${MS_GRAPH_BASE}/me/events`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventPayload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Failed to create Outlook event:', errorData);
        alert(`Error al crear evento en Outlook:\n${errorData?.error?.message || 'Revisa la consola para más detalles.'}`);
        return null;
      }

      const data = await res.json();
      return {
        id: data.id,
        htmlLink: data.webLink || `https://outlook.live.com/calendar/0/deeplink/read/${data.id}`,
      };
    } catch (error) {
      console.error('Error inserting Outlook event:', error);
      return null;
    }
  }

  /**
   * Update event in Outlook Calendar
   */
  static async updateOutlookEvent(
    todo: Todo,
    token: string,
    eventId: string,
    calendarId: string = 'primary'
  ): Promise<boolean | { id: string; htmlLink?: string }> {
    try {
      const startDateStr = todo.due_date || new Date().toISOString().split('T')[0];
      const endDateStr = todo.end_date || startDateStr;
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      let isAllDay = true;
      let startDateTime = `${startDateStr}T00:00:00`;
      
      const endDObj = new Date(`${endDateStr}T00:00:00`);
      endDObj.setDate(endDObj.getDate() + 1);
      const nextDayY = endDObj.getFullYear();
      const nextDayM = String(endDObj.getMonth() + 1).padStart(2, '0');
      const nextDayD = String(endDObj.getDate()).padStart(2, '0');
      let endDateTime = `${nextDayY}-${nextDayM}-${nextDayD}T00:00:00`;

      if (todo.start_time) {
        isAllDay = false;
        startDateTime = `${startDateStr}T${todo.start_time}:00`;
        if (todo.end_time && todo.end_time !== todo.start_time) {
          endDateTime = `${endDateStr}T${todo.end_time}:00`;
        } else {
          const endD = new Date(`${startDateStr}T${todo.start_time}:00`);
          endD.setMinutes(endD.getMinutes() + 30);
          const endHours = String(endD.getHours()).padStart(2, '0');
          const endMins = String(endD.getMinutes()).padStart(2, '0');
          endDateTime = `${startDateStr}T${endHours}:${endMins}:00`;
        }
      }

      const eventResource = {
        subject: todo.text,
        body: {
          contentType: 'HTML',
          content: todo.notes || '',
        },
        start: { dateTime: startDateTime, timeZone },
        end: { dateTime: endDateTime, timeZone },
        isAllDay,
      };

      const url = calendarId === 'primary' || !calendarId
        ? `${MS_GRAPH_BASE}/me/events/${encodeURIComponent(eventId)}`
        : `${MS_GRAPH_BASE}/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;

      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventResource),
      });

      if (!res.ok) {
        if (res.status === 404) {
          console.warn('Event not found in Outlook during update, recreating it...');
          const insertResult = await this.insertOutlookEvent(todo, token, calendarId);
          return insertResult || false;
        }
        const errorData = await res.json().catch(() => ({}));
        console.error('Failed to update Outlook event:', errorData);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Error updating Outlook event:', e);
      return false;
    }
  }

  /**
   * Delete event from Outlook Calendar
   */
  static async deleteOutlookEvent(eventId: string, token: string): Promise<boolean> {
    try {
      const res = await fetch(`${MS_GRAPH_BASE}/me/events/${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok && res.status !== 404 && res.status !== 410) {
        console.error('Failed to delete Outlook event:', await res.json().catch(() => ({})));
        return false;
      }
      return true;
    } catch (e) {
      console.error('Error deleting Outlook event:', e);
      return false;
    }
  }

  /**
   * Fetch events from Outlook Calendar
   */
  static async fetchOutlookEvents(
    token: string,
    calendarId?: string,
    timeMin?: string,
    timeMax?: string
  ): Promise<GoogleCalendarEvent[]> {
    try {
      const now = new Date();
      const minDate = timeMin || new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();
      const maxDate = timeMax || new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();

      const endpoint = calendarId && calendarId !== 'primary'
        ? `${MS_GRAPH_BASE}/me/calendars/${calendarId}/calendarView?startDateTime=${encodeURIComponent(minDate)}&endDateTime=${encodeURIComponent(maxDate)}`
        : `${MS_GRAPH_BASE}/me/calendarView?startDateTime=${encodeURIComponent(minDate)}&endDateTime=${encodeURIComponent(maxDate)}`;

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return [];
      const data = await res.json();
      return (data.value || []).map((item: any) => ({
        id: item.id,
        summary: item.subject || '(Sin título)',
        description: item.bodyPreview || item.body?.content,
        start: {
          dateTime: item.isAllDay ? undefined : item.start?.dateTime,
          date: item.isAllDay ? item.start?.dateTime?.split('T')[0] : undefined,
        },
        end: {
          dateTime: item.isAllDay ? undefined : item.end?.dateTime,
          date: item.isAllDay ? item.end?.dateTime?.split('T')[0] : undefined,
        },
        htmlLink: item.webLink || `https://outlook.live.com/calendar/0/deeplink/read/${item.id}`,
        provider: 'outlook',
        location: item.location?.displayName,
      }));
    } catch (e) {
      console.error('Error fetching Outlook events:', e);
      return [];
    }
  }

  /**
   * Fetch Outlook calendars
   */
  static async fetchOutlookCalendars(token: string): Promise<GoogleCalendar[]> {
    try {
      const res = await fetch(`${MS_GRAPH_BASE}/me/calendars`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.value || []).map((cal: any) => ({
        id: cal.id,
        summary: cal.name,
        primary: cal.isDefaultCalendar,
        provider: 'outlook',
      }));
    } catch (e) {
      console.error('Error fetching Outlook calendars:', e);
      return [];
    }
  }

  /**
   * Authenticate Outlook with Microsoft OAuth Popup
   */
  static async connectOutlookAccount(clientId?: string): Promise<CalendarIntegrationAccount | null> {
    return new Promise((resolve) => {
      const msClientId = clientId || '425536a2-6c7e-47ef-9288-43cae78ffe31';
      const redirectUri = window.location.origin;
      const scopes = encodeURIComponent('openid profile email Calendars.ReadWrite offline_access');
      const authUrl = `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?client_id=${msClientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&prompt=select_account`;

      const popup = window.open(
        authUrl,
        'OutlookAuthPopup',
        'width=600,height=700,status=no,toolbar=no,menubar=no'
      );

      if (!popup) {
        alert('La ventana emergente fue bloqueada por el navegador. Por favor permite las ventanas emergentes para conectar Outlook.');
        resolve(null);
        return;
      }

      const interval = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(interval);
            resolve(null);
            return;
          }

          if (popup.location.href.includes('error=')) {
            const hash = popup.location.hash.substring(1) || popup.location.search.substring(1);
            const params = new URLSearchParams(hash);
            const error = params.get('error');
            const errorDesc = params.get('error_description');
            console.error('Outlook auth error:', error, errorDesc);
            popup.close();
            clearInterval(interval);
            alert(`Error de Outlook: ${errorDesc || error}`);
            resolve(null);
            return;
          }

          if (popup.location.href.includes('access_token=')) {
            const hash = popup.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const token = params.get('access_token');
            const expiresIn = Number(params.get('expires_in')) || 3600;

            popup.close();
            clearInterval(interval);

            if (token) {
              fetch(`${MS_GRAPH_BASE}/me`, {
                headers: { Authorization: `Bearer ${token}` },
              })
                .then(r => r.json())
                .then(user => {
                  const account: CalendarIntegrationAccount = {
                    provider: 'outlook',
                    email: user.userPrincipalName || user.mail || 'usuario@outlook.com',
                    name: user.displayName || 'Usuario Microsoft',
                    token,
                    expiresAt: Date.now() + expiresIn * 1000,
                    selectedCalendarId: 'primary',
                    selectedCalendarName: 'Calendario Principal',
                    autoSyncOnCreate: true,
                    connectedAt: new Date().toISOString(),
                  };
                  CalendarSyncService.saveAccount(account);
                  CalendarSyncService.setActiveProvider('outlook');
                  resolve(account);
                })
                .catch(() => {
                  const account: CalendarIntegrationAccount = {
                    provider: 'outlook',
                    email: 'cuenta@outlook.com',
                    token,
                    expiresAt: Date.now() + expiresIn * 1000,
                    selectedCalendarId: 'primary',
                    autoSyncOnCreate: true,
                    connectedAt: new Date().toISOString(),
                  };
                  CalendarSyncService.saveAccount(account);
                  CalendarSyncService.setActiveProvider('outlook');
                  resolve(account);
                });
            } else {
              resolve(null);
            }
          }
        } catch {
          // Cross-origin errors until redirect finishes
        }
      }, 500);
    });
  }

  /**
   * Connect with manual token or direct Demo Account
   */
  static connectWithDirectToken(token: string, email: string = 'usuario@outlook.com', name: string = 'Outlook Account'): CalendarIntegrationAccount {
    const account: CalendarIntegrationAccount = {
      provider: 'outlook',
      email,
      name,
      token,
      expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
      selectedCalendarId: 'primary',
      selectedCalendarName: 'Calendario Principal',
      autoSyncOnCreate: true,
      connectedAt: new Date().toISOString(),
    };
    CalendarSyncService.saveAccount(account);
    CalendarSyncService.setActiveProvider('outlook');
    return account;
  }

  // ==========================================
  // UNIVERSAL .ICS (ICAL / APPLE CALENDAR) EXPORT
  // ==========================================

  /**
   * Export tasks and events to standard iCal (.ics) format
   */
  static exportToICS(todos: Todo[], events: GoogleCalendarEvent[]): void {
    const formatDateToICS = (dateStr: string, timeStr?: string): string => {
      if (timeStr) {
        const [h, m] = timeStr.split(':');
        const [year, month, day] = dateStr.split('-');
        return `${year}${month}${day}T${h}${m}00`;
      }
      const [year, month, day] = dateStr.split('-');
      return `${year}${month}${day}`;
    };

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Pollito Productivo//Calendario v2.0//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Pollito Productivo Calendario',
      'X-WR-TIMEZONE:' + (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'),
    ];

    // Add todos as VEVENT
    todos.forEach((todo) => {
      if (!todo.due_date) return;
      const uid = `pollito_task_${todo.id}_${Date.now()}@pollitoproductivo.app`;
      const created = new Date(todo.created_at || Date.now()).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const isTimed = !!todo.start_time;
      const dtStart = formatDateToICS(todo.due_date, todo.start_time);
      const endDate = todo.end_date || todo.due_date;
      const dtEnd = formatDateToICS(endDate, todo.end_time || (todo.start_time ? todo.start_time : undefined));

      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:${uid}`);
      icsContent.push(`DTSTAMP:${created}`);
      if (isTimed) {
        icsContent.push(`DTSTART:${dtStart}`);
        icsContent.push(`DTEND:${dtEnd}`);
      } else {
        icsContent.push(`DTSTART;VALUE=DATE:${dtStart}`);
        icsContent.push(`DTEND;VALUE=DATE:${dtEnd}`);
      }
      icsContent.push(`SUMMARY:${todo.text.replace(/,/g, '\\,')}`);
      icsContent.push(`DESCRIPTION:${(todo.notes || '🐥 Tarea de Pollito Productivo').replace(/\n/g, '\\n')}`);
      icsContent.push(`STATUS:${todo.completed ? 'COMPLETED' : 'CONFIRMED'}`);
      icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pollito_calendario_${new Date().toISOString().split('T')[0]}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
