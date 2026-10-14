export function textFor(story, preference) {
  return story.texts?.find(text => text.language === preference.language && text.script === preference.script) || story.texts?.find(text => text.isOriginal) || story.texts?.[0];
}
export function scriptProps(text) {
  return { dir: text?.script === 'shahmukhi' ? 'rtl' : 'ltr', lang: text?.script === 'shahmukhi' ? 'pa-Arab' : text?.language === 'pa' ? 'pa-Latn' : 'en' };
}

