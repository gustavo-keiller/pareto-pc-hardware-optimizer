const MAX_IMPORT_CHARS = 16000;
const HASH_PREFIX = '#import=';

/**
 * Encodes scraped or copied store listing text into ParetoPC's `#import=` URL hash (`[DATA-08]`).
 */
export function encodeImportHashPayload(rawText: string): string {
  const trimmed = rawText.trim().slice(0, MAX_IMPORT_CHARS);
  if (!trimmed) return '';
  return `${HASH_PREFIX}${encodeURIComponent(trimmed)}`;
}

/**
 * Safely decodes an `#import=...` URL hash or full URL back into raw listing text.
 */
export function decodeImportHashPayload(hashOrUrl: string): string | null {
  if (!hashOrUrl) return null;
  const idx = hashOrUrl.indexOf(HASH_PREFIX);
  if (idx === -1) return null;

  const encoded = hashOrUrl.slice(idx + HASH_PREFIX.length);
  if (!encoded) return null;

  try {
    const decoded = decodeURIComponent(encoded).trim();
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}

/**
 * Generates a zero-install `javascript:` bookmarklet (`[DATA-08]`) that grabs selected text
 * or visible store product listings from KaBuM!, Pichau, TerabyteShop, Amazon, or Newegg
 * and launches ParetoPC with `#import=...`.
 */
export function buildStoreImportBookmarklet(
  appOrigin = 'https://paretopc.com',
): string {
  const cleanOrigin = appOrigin.replace(/\/+$/, '');
  const snippet = [
    'javascript:(function(){',
    "var sel=(window.getSelection?window.getSelection().toString():'').trim();",
    'var txt=sel;',
    'if(!txt){',
    'var nodes=document.querySelectorAll(\'article,.productCard,[data-testid*="product"],[data-component-type="s-search-result"],.item-cell,h1\');',
    'var parts=[];',
    'for(var i=0;i<nodes.length&&i<25;i++){',
    'var t=(nodes[i].innerText||"").replace(/\\s+/g," ").trim();',
    'if(t.length>15){parts.push(t);}',
    '}',
    'txt=parts.length?parts.join("\\n\\n"):(document.body?document.body.innerText.slice(0,8000):"");',
    '}',
    'var payload=(document.title||"")+"\\n"+location.href+"\\n"+txt;',
    'if(payload.trim().length<10){alert("Select store product text first, then click Import to ParetoPC.");return;}',
    `window.open("${cleanOrigin}/#import="+encodeURIComponent(payload.slice(0,${MAX_IMPORT_CHARS})),"_blank","noopener");`,
    '})();',
  ].join('');
  return snippet;
}

/**
 * Reads and consumes `#import=...` from `window.location.hash` on mount without leaving stale URL fragments.
 */
export function consumeLocationImportHash(
  onImportText: (rawText: string) => void,
): boolean {
  if (typeof window === 'undefined' || !window.location.hash) return false;
  const decoded = decodeImportHashPayload(window.location.hash);
  if (!decoded) return false;

  onImportText(decoded);
  try {
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}`,
    );
  } catch {
    // Ignore history restrictions in sandboxed environments
  }
  return true;
}
