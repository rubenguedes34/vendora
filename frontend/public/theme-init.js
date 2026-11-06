// Mirrors ThemeService so the saved mode/palette is applied before first paint (no light flash).
try {
  var m = localStorage.getItem('vendora-mode'),
    t = localStorage.getItem('vendora-theme');
  var dark =
    m === 'dark' || (m === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-mode', dark ? 'dark' : 'light');
  if (t === 'teal' || t === 'indigo' || t === 'rose')
    document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
