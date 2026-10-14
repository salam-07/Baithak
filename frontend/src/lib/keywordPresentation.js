// Keep labels, script direction and fallback language consistent across keyword surfaces.
export function keywordText(values, locale, fallback = '') {
  const language = [locale, 'en', 'roman', 'pa'].find(key => values?.[key]?.trim());
  return {
    text: values?.[language] || fallback,
    lang: language === 'pa' ? 'pa-Arab' : language === 'roman' ? 'pa-Latn' : 'en',
    dir: language === 'pa' ? 'rtl' : 'ltr',
    language,
  };
}

export function keywordSlug(name) {
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 59).replace(/-$/, '');
}

export function keywordPreview(text, limit = 240) {
  if (text.length <= limit) return text;
  const excerpt = text.slice(0, limit);
  const boundary = excerpt.lastIndexOf(' ');
  return excerpt.slice(0, boundary > limit / 2 ? boundary : limit).trimEnd() + '…';
}
