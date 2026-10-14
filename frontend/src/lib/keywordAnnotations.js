export function annotationsFor(story, text) {
  return story?.annotations?.find(item => item.language === text?.language && item.script === text?.script) ?? {};
}
