// Progressive UX enhancements for the app
// - Home CTA redirect
// - Minor accessibility improvements

(function(){
  // Deduplicate duplicate IDs for accessibility (runtime safety)
  document.addEventListener('DOMContentLoaded', () => {
    const dups = document.querySelectorAll('#start-check');
    if (dups.length > 1) {
      dups.forEach((el, idx) => {
        if (idx === 0) return;
        el.removeAttribute('id');
        if (!el.hasAttribute('data-action')) el.setAttribute('data-action','start-check');
      });
    }

    // If alerts panel exists, ensure it starts hidden
    const alerts = document.getElementById('alerts');
    if (alerts) alerts.hidden = true;
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#start-check, [data-action="start-check"]');
    if (!btn) return;
    e.preventDefault();
    try {
      window.location.href = 'check.html';
    } catch {
      // no-op
    }
  });

  // Ensure any numeric duration input is properly constrained
  const dur = document.getElementById('ww_howlong');
  if (dur) {
    dur.setAttribute('type','number');
    if (!dur.getAttribute('min')) dur.setAttribute('min','0');
    if (!dur.getAttribute('inputmode')) dur.setAttribute('inputmode','numeric');
  }

  // Move inline styles into a generated stylesheet on the check page
  (function moveInlineStyles(){
    const isCheck = /(^|\/)check\.html($|\?)/i.test(location.pathname) || document.getElementById('check-form');
    if (!isCheck) return;

    const styleTagId = 'moved-inline-styles';
    let styleTag = document.getElementById(styleTagId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleTagId;
      document.head.appendChild(styleTag);
    }
    const sheet = styleTag.sheet;

    const seen = new Map();
    const hash = (str) => {
      let h = 0; for (let i=0;i<str.length;i++){ h = (h<<5)-h + str.charCodeAt(i); h |= 0; }
      return 'inl-' + Math.abs(h).toString(36);
    };

    const elements = Array.from(document.querySelectorAll('[style]'));
    elements.forEach(el => {
      const css = el.getAttribute('style');
      if (!css) return;
      const key = css.trim().replace(/;\s*$/,'');
      let cls = seen.get(key);
      if (!cls) {
        cls = hash(key);
        try { 
          sheet.insertRule(`.${cls}{${key}}`, sheet.cssRules.length); 
        } catch {
          // Ignore CSS rule insertion errors
        }
        seen.set(key, cls);
      }
      el.classList.add(cls);
      el.removeAttribute('style');
    });
  })();
})();
