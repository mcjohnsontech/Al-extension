/**
 * content/extractors/readability.js
 *
 * A lightweight Readability-style content extractor.
 * Scores candidate elements by text density, link density,
 * and tag semantics to find the most content-rich node.
 *
 * Inspired by Mozilla's Readability algorithm (simplified).
 */

/** Tags that are almost never meaningful content. */
const UNLIKELY_ROLES = /banner|combinedsearch|comment|community|disqus|extra|foot|header|menu|remark|rss|shoutbox|sidebar|sponsor|ad-break|agegate|pagination|pager|popup|tweet|twitter/i;
const UNLIKELY_TAGS  = /^(ASIDE|FOOTER|HEADER|NAV|FORM|FIGURE|SCRIPT|STYLE|NOSCRIPT)$/;

/** Content-rich tag bonus scores. */
const TAG_SCORES = {
  ARTICLE: 10,
  SECTION: 5,
  DIV:     0,
  BLOCKQUOTE: 3,
  P:       3,
  TD:      3,
  PRE:     3,
};

/**
 * Calculate a readability score for a given element.
 * @param {Element} el
 * @returns {number}
 */
function scoreElement(el) {
  let score = TAG_SCORES[el.tagName] ?? 0;

  // Class/id bonus for content-y names
  const classId = `${el.className} ${el.id}`.toLowerCase();
  if (/article|body|content|entry|hentry|main|page|post|text|story|blog/i.test(classId)) {
    score += 25;
  }
  if (UNLIKELY_ROLES.test(classId)) {
    score -= 25;
  }

  // Text density: reward elements with lots of characters per child
  const text = el.innerText || '';
  const commas = (text.match(/,/g) || []).length;
  score += Math.min(Math.floor(text.length / 100), 3);
  score += commas;

  // Link density penalty
  const links = el.querySelectorAll('a');
  const linkText = Array.from(links).reduce((s, a) => s + (a.innerText || '').length, 0);
  const linkDensity = text.length ? linkText / text.length : 1;
  if (linkDensity > 0.5) score -= 10;

  return score;
}

/**
 * Attempt to find the main content element using scoring.
 * @returns {Element|null}
 */
export function findMainContent() {
  // Fast path: semantic elements
  const semantic = document.querySelector('article, [role="main"], main');
  if (semantic && (semantic.innerText || '').length > 200) {
    return semantic;
  }

  // Score all block-level candidates
  const candidates = Array.from(
    document.querySelectorAll('div, article, section, td')
  ).filter((el) => {
    if (UNLIKELY_TAGS.test(el.tagName)) return false;
    const text = (el.innerText || '').trim();
    return text.length > 100;
  });

  let best = null;
  let bestScore = -Infinity;

  for (const el of candidates) {
    const score = scoreElement(el);
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }

  return best;
}
