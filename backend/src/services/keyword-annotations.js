import { normalizeText } from '../utils/normalize.js';

// Offsets always refer to the original UTF-16 string, as used by JS slice.
// Fold each token separately so accents and combining marks cannot shift spans.
export function textTokens(text = '') {
  return [...text.matchAll(/[\p{L}\p{N}\p{M}]+/gu)].map(match => ({
    value: normalizeText(match[0]), start: match.index, end: match.index + match[0].length,
  })).filter(token => token.value);
}

export function buildMatcher(keywords = []) {
  const root = new Map();
  for (const keyword of keywords) {
    const id = String(keyword._id ?? keyword.id);
    const aliases = [...(keyword.aliases ?? []), ...Object.values(keyword.labels ?? {}), keyword.key?.replaceAll('-', ' ')];
    for (const alias of aliases.filter(Boolean)) {
      const tokens = textTokens(alias);
      if (!tokens.length) continue;
      let node = root;
      for (const token of tokens) {
        if (!node.has(token.value)) node.set(token.value, new Map());
        node = node.get(token.value);
      }
      if (!node.has(null)) node.set(null, new Set());
      node.get(null).add(id);
    }
  }
  return root;
}

export function annotateText(text = '', matcher, seen = new Set()) {
  const tokens = textTokens(text);
  const matches = [];
  const keywordIds = new Set();
  for (let i = 0; i < tokens.length; i++) {
    let node = matcher;
    for (let j = i; j < tokens.length; j++) {
      // A phrase can cross spaces or a hyphen, never a sentence or paragraph.
      if (j > i && !/^[\p{Zs}\t\-‐‑–]+$/u.test(text.slice(tokens[j - 1].end, tokens[j].start))) break;
      node = node.get(tokens[j].value);
      if (!node) break;
      for (const id of node.get(null) ?? []) {
        keywordIds.add(id);
        if (!seen.has(id)) matches.push({ start: tokens[i].start, end: tokens[j].end, id });
      }
    }
  }
  // Same-start longest matches first. Keep every meaning in an overlapping span.
  matches.sort((a, b) => a.start - b.start || b.end - a.end || a.id.localeCompare(b.id));
  const spans = [];
  for (const match of matches) {
    if (seen.has(match.id)) continue;
    seen.add(match.id);
    const last = spans.at(-1);
    if (last && match.start < last.end) {
      last.end = Math.max(last.end, match.end);
      last.keywordIds.push(match.id);
    } else spans.push({ start: match.start, end: match.end, keywordIds: [match.id] });
  }
  return { spans, keywordIds: [...keywordIds] };
}

export function annotateStory(texts, matcher) {
  const keywordIds = new Set();
  const annotations = texts.map(text => {
    // Each independently readable translation gets its own first occurrence.
    const seen = new Set();
    const title = annotateText(text.title, matcher, seen);
    const body = annotateText(text.body, matcher, seen);
    for (const id of [...title.keywordIds, ...body.keywordIds]) keywordIds.add(id);
    return { language: text.language, script: text.script, title: title.spans, body: body.spans };
  });
  return { annotations, keywordIds: [...keywordIds] };
}

/**
 * Spans for a feed card, which carries an excerpt and no body.
 *
 * The excerpt is annotated on its own rather than the body being annotated and the
 * offsets reused, because the two strings are not the same string: an excerpt ends in
 * an ellipsis at a cut the body knows nothing about, and a phrase straddling that cut
 * would produce a span reaching past the end of what the card can render.
 *
 * `title` is always empty, and that is a rendering fact rather than an omission: the
 * card draws its title inside its own button, and a keyword mark is itself a control,
 * so marking the title would nest one inside the other. Annotating the excerpt alone
 * also means a word the title already used is still marked where the card shows it,
 * which is not true of `annotateStory`, where the title has first claim on it.
 */
export function annotateExcerpts(texts = [], matcher) {
  const keywordIds = new Set();
  const annotations = texts.map(text => {
    const excerpt = annotateText(text?.excerpt ?? '', matcher);
    for (const id of excerpt.keywordIds) keywordIds.add(id);
    return { language: text?.language, script: text?.script, title: [], body: excerpt.spans };
  });
  return { annotations, keywordIds: [...keywordIds] };
}
