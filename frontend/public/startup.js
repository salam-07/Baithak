// A failed app bundle must not leave an endless animation with no way forward.
const splash = document.getElementById('startup-splash');
const timer = window.setTimeout(() => {
  const help = splash?.querySelector('.startup-help');
  if (help) help.hidden = false;
}, 10000);
splash?.querySelector('button')?.addEventListener('click', () => window.location.reload());
window.addEventListener('baithak:ready', () => window.clearTimeout(timer), { once: true });
