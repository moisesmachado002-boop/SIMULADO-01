(() => {
  'use strict';
  if (window.__mentorNavCleanupV420) return;
  window.__mentorNavCleanupV420 = true;

  function clean() {
    const performance = document.querySelector('[data-v49-sub="performance"]');
    if (performance) {
      performance.querySelectorAll('[data-v418-history]').forEach(btn => btn.remove());
      const labels = new Set();
      [...performance.querySelectorAll('button')].forEach(btn => {
        const text = btn.textContent.trim();
        if (labels.has(text)) btn.remove();
        else labels.add(text);
      });
    }
  }

  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    clean();
    if (tries > 30) clearInterval(timer);
  }, 250);
})();