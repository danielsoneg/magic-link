import * as cheerio from 'cheerio';

// URL path patterns that indicate login links
const LOGIN_PATH_PATTERNS = [
  /\/login/i,
  /\/auth/i,
  /\/verify/i,
  /\/magic/i,
  /\/signin/i,
  /\/sign-in/i,
  /\/confirm/i,
  /\/sso/i,
  /\/callback/i,
  /\/authenticate/i,
  /\/access/i,
];

// Query parameter patterns that indicate authentication tokens
const TOKEN_PARAM_PATTERNS = [
  /^token$/i,
  /^code$/i,
  /^key$/i,
  /^t$/i,
  /^k$/i,
  /^otp$/i,
  /^magic$/i,
  /^auth$/i,
  /^session$/i,
  /^ticket$/i,
];

// Patterns to exclude
const EXCLUDE_PATTERNS = [
  /unsubscribe/i,
  /opt-out/i,
  /optout/i,
  /preferences/i,
  /privacy/i,
  /terms/i,
  /legal/i,
  /policy/i,
  /facebook\.com/i,
  /twitter\.com/i,
  /linkedin\.com/i,
  /instagram\.com/i,
  /support/i,
  /help/i,
  /faq/i,
  /mailto:/i,
  /tel:/i,
];

// Check if a string looks like a random token (base64, UUID, hex, etc.)
function looksLikeToken(str: string): boolean {
  // UUID pattern
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return true;
  }
  // Long alphanumeric (base64-like or hex)
  if (/^[A-Za-z0-9_-]{20,}$/.test(str)) {
    return true;
  }
  // Long hex string
  if (/^[0-9a-f]{32,}$/i.test(str)) {
    return true;
  }
  return false;
}

interface ScoredLink {
  url: string;
  score: number;
  reasons: string[];
}

function scoreLink(url: string, isButton: boolean, position: number): ScoredLink | null {
  try {
    const parsed = new URL(url);
    const reasons: string[] = [];
    let score = 0;

    // Exclude non-http(s) links
    if (!parsed.protocol.startsWith('http')) {
      return null;
    }

    // Check exclusions
    for (const pattern of EXCLUDE_PATTERNS) {
      if (pattern.test(url)) {
        return null;
      }
    }

    // Check path patterns
    for (const pattern of LOGIN_PATH_PATTERNS) {
      if (pattern.test(parsed.pathname)) {
        score += 10;
        reasons.push(`path matches ${pattern}`);
        break;
      }
    }

    // Check query parameters for token-like values
    for (const [key, value] of parsed.searchParams) {
      for (const pattern of TOKEN_PARAM_PATTERNS) {
        if (pattern.test(key)) {
          score += 15;
          reasons.push(`has token param: ${key}`);
          break;
        }
      }
      if (looksLikeToken(value)) {
        score += 10;
        reasons.push(`param ${key} looks like token`);
      }
    }

    // Check path segments for token-like values
    const pathSegments = parsed.pathname.split('/').filter(Boolean);
    for (const segment of pathSegments) {
      if (looksLikeToken(segment)) {
        score += 8;
        reasons.push('path has token-like segment');
        break;
      }
    }

    // Button bonus
    if (isButton) {
      score += 5;
      reasons.push('in button/prominent element');
    }

    // Position bonus (first links are often the main CTA)
    if (position < 3) {
      score += 3 - position;
      reasons.push(`early position: ${position}`);
    }

    return { url, score, reasons };
  } catch {
    return null;
  }
}

export function extractMagicLink(html: string): string | null {
  const $ = cheerio.load(html);
  const scoredLinks: ScoredLink[] = [];

  // Find all links
  $('a[href]').each((index, element) => {
    const href = $(element).attr('href');
    if (!href) return;

    // Check if it's in a button-like element
    const isButton =
      $(element).hasClass('button') ||
      $(element).hasClass('btn') ||
      $(element).css('display') === 'inline-block' ||
      $(element).parents('table').length > 0; // Email buttons often in tables

    const scored = scoreLink(href, isButton, index);
    if (scored && scored.score > 0) {
      scoredLinks.push(scored);
    }
  });

  // Sort by score descending
  scoredLinks.sort((a, b) => b.score - a.score);

  if (scoredLinks.length > 0) {
    return scoredLinks[0].url;
  }

  // Fallback: find any link with a long random-looking segment
  let fallbackLink: string | null = null;
  $('a[href]').each((_, element) => {
    if (fallbackLink) return;

    const href = $(element).attr('href');
    if (!href) return;

    try {
      const parsed = new URL(href);
      if (!parsed.protocol.startsWith('http')) return;

      // Check exclusions
      for (const pattern of EXCLUDE_PATTERNS) {
        if (pattern.test(href)) return;
      }

      // Check for any token-like value
      const pathSegments = parsed.pathname.split('/').filter(Boolean);
      for (const segment of pathSegments) {
        if (looksLikeToken(segment)) {
          fallbackLink = href;
          return;
        }
      }

      for (const value of parsed.searchParams.values()) {
        if (looksLikeToken(value)) {
          fallbackLink = href;
          return;
        }
      }
    } catch {
      // Invalid URL, skip
    }
  });

  return fallbackLink;
}

// Subject patterns that indicate login emails
const LOGIN_SUBJECT_PATTERNS = [
  /sign\s*in/i,
  /log\s*in/i,
  /login/i,
  /verify/i,
  /verification/i,
  /magic\s*link/i,
  /secure\s*link/i,
  /confirm/i,
  /confirmation/i,
  /one[- ]?time/i,
  /access\s*link/i,
  /authentication/i,
  /security\s*code/i,
];

// Sender domain patterns that indicate auth emails
const AUTH_SENDER_PATTERNS = [
  /auth/i,
  /login/i,
  /account/i,
  /mail/i,
  /noreply/i,
  /no-reply/i,
  /notify/i,
  /notification/i,
];

export function isLoginEmail(subject: string, fromAddress: string): boolean {
  // Check subject
  for (const pattern of LOGIN_SUBJECT_PATTERNS) {
    if (pattern.test(subject)) {
      return true;
    }
  }

  // Check sender
  const senderLocalPart = fromAddress.split('@')[0];
  for (const pattern of AUTH_SENDER_PATTERNS) {
    if (pattern.test(senderLocalPart)) {
      return true;
    }
  }

  return false;
}
