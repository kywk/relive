// Run before first paint so a saved theme does not flash the default palette.
(() => {
  const key = 'relive-theme';
  const system = matchMedia('(prefers-color-scheme: dark)');
  const valid = value => ['light', 'dark'].includes(value) ? value : 'system';
  let preference = 'system';
  try { preference = valid(localStorage.getItem(key)); } catch {}
  function apply() {
    const theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#101e22' : '#f7f9f8');
    const select = document.querySelector('#theme-select');
    if (select) select.value = preference;
  }
  apply();
  system.addEventListener('change', apply);
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) { preference = valid(event.newValue); apply(); }
  });
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.querySelector('#theme-select').addEventListener('change', event => {
      preference = valid(event.target.value);
      try {
        if (preference === 'system') localStorage.removeItem(key);
        else localStorage.setItem(key, preference);
      } catch {}
      apply();
    });
  });
})();
