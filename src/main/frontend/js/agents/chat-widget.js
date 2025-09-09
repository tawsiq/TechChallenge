// Floating chat widget with agent orchestrator
// Adds a small assistant bubble to any page that includes this file.

(function () {
  if (document.querySelector('.ai-chat')) return; // idempotent

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  // Container
  const shell = el('div', 'ai-chat');
  const toggle = el('button', 'ai-chat__toggle', '💬');
  const panel = el('div', 'ai-chat__panel');
  const header = el('div', 'ai-chat__header', '<strong>Assistant</strong>');
  const log = el('div', 'ai-chat__log');
  const form = el('form', 'ai-chat__form');
  const input = el('input', 'ai-chat__input');
  input.type = 'text';
  input.placeholder = 'Ask me anything…';
  const send = el('button', 'ai-chat__send', 'Send');
  send.type = 'submit';

  form.append(input, send);
  panel.append(header, log, form);
  shell.append(toggle, panel);
  document.body.appendChild(shell);

  // Basic styles if dedicated CSS is missing
  if (!document.querySelector('#ai-chat-inline-style')) {
    const s = document.createElement('style');
    s.id = 'ai-chat-inline-style';
    s.textContent = `
      .ai-chat{position:fixed;bottom:16px;right:16px;z-index:2147483647;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif}
      .ai-chat__toggle{width:48px;height:48px;border-radius:50%;border:none;background:#2563eb;color:#fff;box-shadow:0 6px 16px rgba(0,0,0,.2);cursor:pointer}
      .ai-chat__panel{display:none;width:320px;height:420px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.18);overflow:hidden}
      .ai-chat--open .ai-chat__panel{display:flex;flex-direction:column}
      .ai-chat__header{padding:10px 12px;background:#111827;color:#fff}
      .ai-chat__log{flex:1;overflow:auto;padding:12px;background:#f9fafb}
      .ai-chat__row{display:flex;gap:8px;margin:8px 0}
      .ai-chat__row--bot{justify-content:flex-start}
      .ai-chat__row--me{justify-content:flex-end}
      .ai-chat__bubble{max-width:78%;padding:8px 10px;border-radius:12px;line-height:1.35}
      .ai-chat__row--bot .ai-chat__bubble{background:#e5e7eb}
      .ai-chat__row--me .ai-chat__bubble{background:#2563eb;color:#fff}
      .ai-chat__form{display:flex;gap:8px;padding:10px;border-top:1px solid #e5e7eb}
      .ai-chat__input{flex:1;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px}
      .ai-chat__send{padding:8px 12px;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer}
      .ai-chat__typing{font-size:12px;color:#6b7280;padding:0 12px}
    `;
    document.head.appendChild(s);
  }

  // Engine
  const AIOrchestrator = window.AI && window.AI.Orchestrator;
  const BNFAgent = window.AI && window.AI.Agents && window.AI.Agents.BNFAgent;
  const engine = new (AIOrchestrator || function(){})({
    providers: [
      new (BNFAgent || function(){}) (async () => {
        try {
          const res = await fetch('data/bnf.json');
          if (!res.ok) throw new Error('no bnf');
          return res.json();
        } catch {
          return null;
        }
      })
    ],
    context: { awaiting: null }
  });

  function addRow(kind, text) {
    const row = el('div', `ai-chat__row ai-chat__row--${kind}`);
    const b = el('div', 'ai-chat__bubble');
    b.textContent = text;
    row.appendChild(b);
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  let typingTimer = null;
  function setTyping(on) {
    let t = panel.querySelector('.ai-chat__typing');
    if (on) {
      if (!t) {
        t = el('div', 'ai-chat__typing', 'Assistant is typing…');
        panel.insertBefore(t, form);
      }
    } else if (t) {
      t.remove();
    }
  }

  toggle.addEventListener('click', () => {
    shell.classList.toggle('ai-chat--open');
    if (shell.classList.contains('ai-chat--open')) input.focus();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addRow('me', text);

    // If check form asks for duration, set context
    const durInput = document.getElementById('ww_howlong');
    if (durInput && !durInput.value) {
      engine?.setContext({ awaiting: 'duration' });
    }

    setTyping(true);
    clearTimeout(typingTimer);
    typingTimer = setTimeout(async () => {
      try {
        const reply = await engine?.handle(text);
        addRow('bot', reply || '');
      } catch {
        addRow('bot', 'Something went wrong.');
      } finally {
        setTyping(false);
      }
    }, 250);
  });

  // Initial greeting
  setTimeout(() => addRow('bot', 'Hello! I’m here to help with symptoms, durations, and basic medicine lookups.'), 150);
})();

