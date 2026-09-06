/**
 * Utility functions to sanitize, normalize, and clean rich text, HTML snippets,
 * and pasted content (such as Bible verses from JW.ORG, Word documents, web articles, etc.)
 */

// Decode HTML entities safely
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  if (typeof document === 'undefined') {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }
  const txt = document.createElement('textarea');
  txt.innerHTML = text;
  return txt.value;
}

/**
 * Checks if a string contains raw or escaped HTML tag markers
 */
export function hasHtmlTags(str: string): boolean {
  if (!str) return false;
  return /<[a-z][\s\S]*>/i.test(str) || /&lt;[a-z][\s\S]*&gt;/i.test(str);
}

/**
 * Converts any dirty or raw HTML (like copied JW.org Bible verses, Web articles, etc.)
 * into clean, standard semantic HTML suitable for the note editor.
 * Removes intrusive scripts and dangerous tags while safely preserving user typography,
 * font-family, font-size, colors, highlights, tables, checklists, and callouts.
 */
export function sanitizeAndCleanHtml(input: string): string {
  if (!input) return '';
  
  let raw = input;
  
  // If the content is escaped HTML (e.g. &lt;span class="verseNum"...), unescape it first
  if (raw.includes('&lt;') && raw.includes('&gt;') && !raw.includes('<')) {
    raw = decodeHtmlEntities(raw);
  }

  if (typeof document === 'undefined') {
    // Fallback cleanup for server/build environments
    return raw
      .replace(/<span\b[^>]*class=["']verseNum["'][^>]*>(?:<a\b[^>]*>)?([\s\S]*?)(?:<\/a>)?<\/span>/gi, '<b>$1</b>')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, 'text/html');
    const body = doc.body;

    // 1. Remove dangerous or non-content elements
    const removeElements = body.querySelectorAll('script, meta, link, iframe, object, embed, form');
    removeElements.forEach(el => el.remove());

    // 2. Handle verse numbers or specific anchor tags (e.g. from JW.org or online Bible tools)
    const verseNumSpans = body.querySelectorAll('span.verseNum, .verseNum, .v, .verse-number');
    verseNumSpans.forEach(span => {
      const text = span.textContent?.trim() || '';
      if (text) {
        const strong = doc.createElement('b');
        strong.textContent = `${text} `;
        span.parentNode?.replaceChild(strong, span);
      } else {
        span.remove();
      }
    });

    // 3. Remove internal anchor targets (e.g. <a data-anchor="#v47013005">5 </a> or class="jsHighlightOnly")
    const anchors = body.querySelectorAll('a');
    anchors.forEach(a => {
      const href = a.getAttribute('href');
      const isInternalAnchor = !href || href.startsWith('#') || a.hasAttribute('data-anchor') || a.classList.contains('jsHighlightOnly');
      if (isInternalAnchor) {
        // Replace with text content
        const textNode = doc.createTextNode(a.textContent || '');
        a.parentNode?.replaceChild(textNode, a);
      } else {
        // Keep external link attributes safe
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      }
    });

    // 4. Clean only unneeded empty spans without attributes
    const emptySpans = body.querySelectorAll('span:not([style]):not([class]):not([id])');
    emptySpans.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
      }
    });

    let cleaned = body.innerHTML.trim();

    // Clean multiple empty paragraphs or breaklines
    cleaned = cleaned.replace(/(<br\s*\/?>\s*){4,}/gi, '<br><br><br>');
    return cleaned || raw;
  } catch {
    return raw;
  }
}

/**
 * Strips all HTML tags and produces pure, clean plain text.
 * Perfect for Quick Notes, note previews, titles, and plain textareas.
 */
export function cleanToPlainText(input: string): string {
  if (!input) return '';

  let text = input;

  // Multi-pass unescape to handle single or double HTML entity encoding (e.g. &lt;span... or &amp;lt;span...)
  for (let i = 0; i < 3; i++) {
    if (text.includes('&lt;') || text.includes('&gt;') || text.includes('&amp;') || text.includes('&quot;') || text.includes('&#')) {
      text = decodeHtmlEntities(text);
    } else {
      break;
    }
  }

  // Handle verse number tags specifically to preserve the number with a space
  text = text.replace(/<span\b[^>]*class=["']verseNum["'][^>]*>(?:<a\b[^>]*>)?([\s\S]*?)(?:<\/a>)?<\/span>/gi, '$1 ');

  if (typeof document !== 'undefined') {
    try {
      const div = document.createElement('div');
      // Convert block tags and breaks to newlines before parsing so lines don't collide
      const prepped = text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|h[1-6]|li|tr|blockquote|pre)>/gi, '\n');
      div.innerHTML = prepped;
      const parsedText = div.textContent || div.innerText || '';
      return parsedText
        .replace(/<[^>]*>/g, '') // remove any residual angle-bracket fragments
        .replace(/&nbsp;/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    } catch {
      // fallback to regex below
    }
  }

  // Fallback regex cleanup
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote|pre)>/gi, '\n')
    .replace(/<[^>]+>/g, '') // strip all tags
    .replace(/<[^>]*$/g, '') // remove trailing broken tag
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Enhanced markdown or HTML converter for Note editor content.
 * Gracefully handles legacy markdown, plain text, and dirty HTML snippet pastes.
 */
export function normalizeNoteContentForEditor(str: string): string {
  if (!str) return '';

  // If it has HTML tags or escaped HTML tags
  if (/<[a-z][\s\S]*>/i.test(str) || /&lt;[a-z][\s\S]*&gt;/i.test(str)) {
    return sanitizeAndCleanHtml(str);
  }

  // Otherwise convert markdown formatting to clean visual HTML
  let html = str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  html = html.replace(/\*(.*?)\*/g, '<i>$1</i>');
  html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
  html = html.replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/\n/g, '<br>');

  return html;
}
console.log(cleanToPlainText('<h1>Mi titulo</h1>'));
