/**
 * Integration & CORS Management for External Media Players (YouTube & Spotify)
 * 
 * =========================================================================================
 * DOCUMENTACIÓN: LIMITACIONES DE CORS E INTEGRACIÓN EN ESTE ENTORNO DE SANDBOX / CLOUD RUN
 * =========================================================================================
 * 
 * 1. NATURALEZA DE LAS RESTRICCIONES DE CORS EN REPRODUCTORES EXTERNOS
 * -----------------------------------------------------------------------------------------
 * - CORS (Cross-Origin Resource Sharing) prohíbe solicitudes de red directas (fetch/XHR)
 *   desde una aplicación web hacia la API de Spotify (`api.spotify.com`) o YouTube Data API (`www.googleapis.com/youtube/v3`)
 *   a menos que se proporcione un Token de Autenticación de Usuario (OAuth 2.0) o una Clave de API registrada,
 *   así como orígenes de dominio permitidos registrados en las consolas de desarrollador de Spotify/Google.
 * - Sin embargo, los reproductores embebidos (iFrames) y las librerías SDK embebidas (YouTube IFrame Player API)
 *   utilizan la política de "Same-Origin via postMessage", permitiendo reproducir contenido sin violar CORS
 *   ya que el contenido de audio/video se procesa dentro del contexto aislado del iFrame de Spotify/YouTube.
 * 
 * 2. RESTRICCIONES Y CONFIGURACIONES EN AMBIENTES SANDBOXED / IFRAMES EMBEBIDOS
 * -----------------------------------------------------------------------------------------
 * - Origen Nulo o Variable (`window.location.origin === 'null'`):
 *   En entornos en los que la app se ejecuta dentro de un iFrame en blanco/sandboxed o contenedor con proxy
 *   inverso (como Cloud Run en AI Studio), `window.location.origin` puede retornar `'null'` o un origen dinámico.
 *   Si se pasa `origin: 'null'` explícitamente a la API de YouTube `YT.Player`, YouTube rechazará el mensaje
 *   con un error de origen no coincidente o bloqueará el postMessage por seguridad.
 *   
 * - Parámetro `enablejsapi=1` y `origin`:
 *   Para controlar el reproductor de YouTube mediante código (play, pause, seek, volume), es obligatorio
 *   habilitar `enablejsapi: 1`. El parámetro `origin` solo debe pasarse cuando `window.location.origin` sea un
 *   origen HTTP/HTTPS válido. Si es `'null'`, debe omitirse o limpiarse para evitar errores de seguridad CORS.
 * 
 * 3. LIMITACIONES ESPECÍFICAS DE SPOTIFY EMBED WIDGETS
 * -----------------------------------------------------------------------------------------
 * - Formato del ID de Recurso:
 *   Los widgets embebidos de Spotify (`open.spotify.com/embed/{type}/{id}`) requieren IDs de Spotify
 *   válidos (ejemplo: `37i9dQZF1DXcBWIGoYBM5M` para una lista de reproducción). Si se envía un ID interno
 *   numérico de la base de datos (ejemplo: `3`), Spotify devolverá error 404 o página en blanco.
 * - Restricciones de Reproducción Anónima vs Autenticada:
 *   Los usuarios sin sesión activa en Spotify en su navegador escucharán un fragmento de prueba de 30 segundos.
 *   Para escuchar canciones o playlists completas, el navegador debe contar con la sesión activa de Spotify o
 *   utilizar el Spotify Web Playback SDK con autenticación OAuth PKCE.
 * 
 * 4. ERRORES DE INSERTABILIDAD EN YOUTUBE (Restricciones del Propietario)
 * -----------------------------------------------------------------------------------------
 * - Código de Error 101 / 150:
 *   Ocurre cuando el creador del video de YouTube o la discográfica prohíbe explícitamente que el video
 *   se reproduzca fuera del dominio `youtube.com` (inserción desactivada).
 * - Solución Implementada: Capturar el evento `onError` del SDK de YouTube y notificar al usuario
 *   con un fallback limpio o pasar automáticamente a la siguiente canción en la lista de reproducción.
 * 
 * =========================================================================================
 */

export interface MediaResolutionResult {
  platform: 'youtube' | 'spotify' | 'unknown';
  type: 'video' | 'playlist' | 'track' | 'album';
  sourceId: string;
  embedUrl: string;
}

/**
 * Valida y obtiene la URL de origen segura para la API de YouTube.
 * Evita pasar orígenes 'null' que causan bloqueos de postMessage y CORS.
 */
export function getSafeYouTubeOrigin(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const origin = window.location.origin;
  if (!origin || origin === 'null' || origin === 'about:blank') {
    return undefined;
  }
  return origin;
}

/**
 * Mapea códigos de error nativos del SDK de YouTube a mensajes explicativos
 */
export function parseYouTubeError(errorCode: number): string {
  switch (errorCode) {
    case 2:
      return 'Parámetro de ID de video de YouTube no válido.';
    case 5:
      return 'Error con el reproductor HTML5 de YouTube.';
    case 100:
      return 'El video de YouTube no fue encontrado o es privado.';
    case 101:
    case 150:
      return 'El propietario del video no permite reproducirlo en sitios externos.';
    default:
      return `Error al reproducir video en YouTube (Código ${errorCode}).`;
  }
}

/**
 * Parsea y resuelve links de YouTube o Spotify hacia IDs utilizables por los SDKs e iFrames
 */
export function parseMediaUrl(input: string): MediaResolutionResult {
  const cleanInput = input.trim();

  // Check Spotify
  if (cleanInput.includes('spotify.com') || cleanInput.startsWith('spotify:')) {
    let type: 'playlist' | 'track' | 'album' = 'playlist';
    if (cleanInput.includes('/track/') || cleanInput.includes(':track:')) type = 'track';
    else if (cleanInput.includes('/album/') || cleanInput.includes(':album:')) type = 'album';

    let sourceId = cleanInput;
    const match = cleanInput.match(/(?:playlist|track|album)[\/:]([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      sourceId = match[1];
    } else {
      sourceId = cleanInput.split('?')[0].split('/').pop() || cleanInput;
    }

    return {
      platform: 'spotify',
      type,
      sourceId,
      embedUrl: `https://open.spotify.com/embed/${type}/${sourceId}?utm_source=generator`
    };
  }

  // Check YouTube
  let videoId = cleanInput;
  const ytMatch = cleanInput.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    videoId = ytMatch[1];
  }

  return {
    platform: 'youtube',
    type: 'video',
    sourceId: videoId,
    embedUrl: `https://www.youtube.com/embed/${videoId}?enablejsapi=1`
  };
}

/**
 * Atributos de seguridad recomendados para colocar en iFrames de reproductores de audio/video externos.
 */
export const EMBED_SECURITY_ATTRIBUTES = {
  allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
  loading: 'lazy' as const,
  referrerPolicy: 'no-referrer-when-downgrade' as const
};
