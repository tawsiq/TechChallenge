/* Chat orchestrator with lightweight, local “agents”:
   - triageAgent: classify condition from free text
   - wwhamAgent: fill Who/What/How long/Action/Medication via dialogue
   - safetyAgent: check red flags & cautions per condition
   - adviceAgent: produce a summary; then call Engine.evaluate to align with results page
   Later, swap to real LLM endpoints by replacing respond() and agent calls.
*/

const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('input');
const formEl = document.getElementById('composer');
const restartEl = document.getElementById('restart');

// ---------- UI helpers ----------
function addMsg(role, text, options = {}) {
  const row = document.createElement('div');
  row.className = `msg ${role}`;
  const avatar = role === 'bot' ? '<div class="avatar" aria-hidden="true"></div>' : '';
  row.innerHTML = role === 'bot'
    ? `${avatar}<div class="bubble">${text}</div>`
    : `<div class="bubble">${text}</div>`;
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return row;
}
function addTyping() {
  const row = document.createElement('div');
  row.className = 'msg bot';
  row.innerHTML = `<div class="avatar" aria-hidden="true"></div>
                   <div class="bubble"><span class="typing"><span></span><span></span><span></span></span></div>`;
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return row;
}
function replaceTyping(row, html) {
  row.querySelector('.bubble').innerHTML = html;
}

// ---------- Very small NLU ----------
const keywords = {
  headache: /(headache|migraine|throbbing head|tension)/i,
  hayfever: /(hay\s?fever|allerg|sneez|itchy nose|runny nose|rhinitis|pollen)/i,
  indigestion: /(heartburn|indigestion|acid|reflux|burning (in|behind) (my )?chest)/i,
  diarrhoea: /(diarrh(o|h)ea|loose stools|runs)/i,
  sorethroat: /(sore throat|hurts to swallow|throat pain|pharyng)/i,
};
function classifyCondition(text){
  for (const k of Object.keys(keywords)) if (keywords[k].test(text)) return k;
  return null;
}
function extractDuration(text){
  const m = text.match(/(\b\d+\s*(hour|day|week)s?\b)|(<\s*24\s*hours)/i);
  if (!m) return null;
  if (/hour/i.test(m[0]) || /<\s*24/i.test(m[0])) return '< 24 hours';
  if (/day/i.test(m[0])) {
    const n = parseInt(m[0]);
    if (!isNaN(n)) {
      if (n <= 3) return '1–3 days';
      if (n <= 7) return '4–7 days';
      return '> 7 days';
    }
  }
  if (/week/i.test(m[0])) return '> 7 days';
  return null;
}
function mentions(text, re){ return re.test(text); }

// ---------- Conversation state ----------
const state = {
  step: 'greet',
  who: null,
  duration: null,
  what: '',
  action: '',
  meds: '',
  condition: null,
  answers: {}, // condition-specific
  flags: [],
  cautions: []
};

// ---------- Agents (local heuristics) ----------
const triageAgent = {
  next(text){
    // Capture free-form description
    if (text) state.what = state.what ? state.what + ' ' + text : text;

    // Try to classify condition & duration from free text
    if (!state.condition) state.condition = classifyCondition(text || '') || state.condition;
    if (!state.duration) state.duration = extractDuration(text || '') || state.duration;

    // Ask WWHAM pieces that are missing
    if (!state.who) return 'who';
    if (!state.duration) return 'howlong';
    if (!state.condition) return 'condition';
    return 'safety';
  }
};

const wwhamAgent = {
  ask(slot){
    if (slot === 'who') {
      return "Who is this for? (adult, teen 13–17, child 5–12, toddler 1–4, infant <1, pregnant, breastfeeding)";
    }
    if (slot === 'howlong') {
      return "How long has this been going on? (< 24 hours, 1–3 days, 4–7 days, > 7 days, or recurrent)";
    }
    if (slot === 'condition') {
      return "Got it. What’s the main problem in one word? (headache, hay fever, heartburn, diarrhoea, sore throat)";
    }
  },
  fill(slot, text){
    text = text.trim().toLowerCase();
    if (slot === 'who') {
      state.who = /adult|teen|child|toddler|infant|pregnant|breastfeeding/.test(text) ? text : null;
      return !!state.who;
    }
    if (slot === 'howlong') {
      const map = {
        '< 24 hours':'< 24 hours','<24 hours':'< 24 hours',
        '1-3 days':'1–3 days','1–3 days':'1–3 days','1 to 3 days':'1–3 days',
        '4-7 days':'4–7 days','4–7 days':'4–7 days','4 to 7 days':'4–7 days',
        '> 7 days':'> 7 days','more than 7 days':'> 7 days','over a week':'> 7 days','recurrent':'Recurrent / frequent'
      };
      state.duration = map[text] || extractDuration(text) || null;
      return !!state.duration;
    }
    if (slot === 'condition') {
      const cond = classifyCondition(text) || (text.includes('hay') ? 'hayfever' : null);
      state.condition = cond;
      return !!state.condition;
    }
  }
};

const safetyAgent = {
  ask(){
    switch (state.condition) {
      case 'headache':
        return "Quick safety check: sudden ‘worst ever’ headache, recent head injury, or any weakness/confusion/vision problems?";
      case 'hayfever':
        return "Any pregnancy/breastfeeding, under 6 years, or conditions like liver/kidney/heart rhythm problems?";
      case 'indigestion':
        return "Any red flags: difficulty swallowing, vomiting blood/black stools, severe persistent pain, unexplained weight loss?";
      case 'diarrhoea':
        return "Any blood in stool, high fever, severe pain, dehydration signs, or symptoms > 7 days? Is this for a child under 12?";
      case 'sorethroat':
        return "Very high temperature/shivering, dehydration, weakened immunity, symptoms > 1 week, or under 5 years?";
      default:
        return "Tell me if there are any worrying symptoms (bleeding, severe pain, very unwell) or special situations (pregnancy/young child).";
    }
  },
  evaluate(text){
    const t = text.toLowerCase();
    const yesLike = /(yes|yep|yeah|y|there is|there are|i do)/.test(t);

    // crude flagging by condition
    if (state.condition === 'headache' &&
        (mentions(t,/worst|thunderclap|head injury|fall|weak|confus|vision|stiff neck/))) {
      state.flags.push('Headache red flags — seek urgent advice (pharmacist/GP/111).');
    }
    if (state.condition === 'indigestion' &&
        (mentions(t,/swallow|vomit(ing)? blood|black stool|severe|weight loss/))) {
      state.flags.push('Indigestion red flags — speak to a GP.');
    }
    if (state.condition === 'diarrhoea') {
      if (mentions(t,/blood|black stool|fever|dehydrat|>?\s*7\s*days|week/)) {
        state.flags.push('Diarrhoea red flags — seek medical advice (111/GP).');
      }
      if (mentions(t,/child|kid|under\s*12|12\s*years?/)) {
        state.cautions.push('Under 12: avoid loperamide; ask a pharmacist.');
      }
    }
    if (state.condition === 'sorethroat' &&
        (mentions(t,/very high temp|shiver|dehydrat|weakened immune|>?\s*1\s*week/))) {
      state.flags.push('Sore throat red flags — pharmacist/GP review advised.');
    }
    if (state.condition === 'hayfever' &&
        (mentions(t,/pregnan|breastfeed|liver|kidney|heart rhythm|arrhythmia/))) {
      state.cautions.push('Check suitability and dosing with a pharmacist.');
    }
  }
};

const adviceAgent = {
  summarise(){
    // Hand off to the simple rules engine (kept non-branded)
    const payload = {
      condition: state.condition,
      who: state.who,
      howlong: state.duration,
      what: state.what,
      action: state.action,
      meds: state.meds,
      answers: {} // we’re not building the whole step-3 matrix here
    };
    const res = window.Engine?.evaluate ? window.Engine.evaluate(payload) : { title:'General', advice:[], selfCare:[], cautions:[], flags:[] };
    // merge flags/cautions picked by safetyAgent
    res.flags = Array.from(new Set([...(res.flags||[]), ...state.flags]));
    res.cautions = Array.from(new Set([...(res.cautions||[]), ...state.cautions]));
    return res;
  }
};

// ---------- Flow control ----------
function greet(){
  addMsg('bot', "Hi! Describe what’s going on, in your own words. I’ll ask a few follow-ups.");
  addMsg('bot', "You can also say things like “adult”, “pregnant”, “for my child”, or how long it’s been.");
  state.step = 'free';
}

function handleUser(text){
  addMsg('user', text);

  // AGENT: triage which slot to ask next
  const nextSlot = triageAgent.next(text);
  if (nextSlot === 'who') return botAsk(wwhamAgent.ask('who'), 'who');
  if (nextSlot === 'howlong') return botAsk(wwhamAgent.ask('howlong'), 'howlong');
  if (nextSlot === 'condition') return botAsk(wwhamAgent.ask('condition'), 'condition');

  // If we’re ready, ask safety questions
  if (nextSlot === 'safety') {
    state.step = 'safety';
    return botAsk(safetyAgent.ask(), 'safety');
  }
}

let pendingSlot = null;
function botAsk(prompt, slot){
  const t = addTyping();
  setTimeout(()=> replaceTyping(t, prompt), 400);
  pendingSlot = slot;
}

function handleSlotFill(text){
  const ok = wwhamAgent.fill(pendingSlot, text);
  if (!ok) {
    const t = addTyping();
    setTimeout(()=> replaceTyping(t, "Sorry, I didn’t catch that. " + wwhamAgent.ask(pendingSlot)), 350);
    return;
  }
  pendingSlot = null;
  // Continue the main flow
  handleUser(''); // pass empty to re-evaluate what’s next
}

function handleSafety(text){
  safetyAgent.evaluate(text);
  // Summarise + suggest next step
  const t = addTyping();
  setTimeout(()=>{
    const res = adviceAgent.summarise();
    const bullets = (arr)=> arr.map(x=>`• ${x}`).join('<br>');
    replaceTyping(t, `
      <strong>Summary so far</strong><br>
      Condition: ${state.condition || '-'}<br>
      Who: ${state.who || '-'}<br>
      Duration: ${state.duration || '-'}<br><br>
      <strong>Advice</strong><br>${bullets(res.advice)}<br><br>
      ${res.cautions?.length ? `<strong>Cautions</strong><br>${bullets(res.cautions)}<br><br>`:''}
      ${res.flags?.length ? `<strong>Important</strong><br>${bullets(res.flags)}<br><br>`:''}
      You can type more details, or <a href="results.html">view the Results page</a>.
    `);
    // Persist to results page
    sessionStorage.setItem('checkPayload', JSON.stringify({
      condition: state.condition, who: state.who, howlong: state.duration,
      what: state.what, action: state.action, meds: state.meds, answers: {}
    }));
    state.step = 'free'; // continue chatting if user wants
  }, 500);
}

// ---------- Events ----------
formEl.addEventListener('submit', (e)=>{
  e.preventDefault();
  const text = (inputEl.value || '').trim();
  if (!text) return;
  const slot = pendingSlot;
  inputEl.value = '';
    if (slot === 'safety') {
    pendingSlot = null;
    return handleSafety(text);
  }
  if (slot) return handleSlotFill(text);
  if (state.step === 'safety') return handleSafety(text);
  handleUser(text);
});

document.querySelectorAll('.chip').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    inputEl.value = btn.dataset.chip;
    formEl.dispatchEvent(new Event('submit'));
  });
});

restartEl.addEventListener('click', ()=>{
  // reset state
  Object.keys(state).forEach(k=>{
    if (Array.isArray(state[k])) state[k]=[];
    else state[k]=null;
  });
  state.step='greet'; state.answers={}; state.flags=[]; state.cautions=[]; state.what='';
  messagesEl.innerHTML='';
  greet();
});

// Start
greet();
