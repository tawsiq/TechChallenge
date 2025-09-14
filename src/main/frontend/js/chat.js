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
const llmToggleEl = document.getElementById('llm-toggle');
const subtitleEl = document.getElementById('chat-subtitle');

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

// Friendly conversational speak (keeps typing affordance)
function botSpeak(text, opts = {}){
  const t = addTyping();
  const delay = opts.delay ?? Math.min(1200 + (text.length*6), 2200);
  setTimeout(()=> replaceTyping(t, text), delay);
  return t;
}

// Suggestion chips management (make chat feel like a chatbot)
const quickRowEl = document.getElementById('quick-row');
const _defaultChipsHTML = quickRowEl ? quickRowEl.innerHTML : '';
function clearSuggestionChips(){ if(quickRowEl) quickRowEl.innerHTML = _defaultChipsHTML; bindChips(); }
function showSuggestionChips(list){
  if(!quickRowEl) return;
  quickRowEl.innerHTML = '';
  list.forEach(txt=>{
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'chip'; btn.dataset.chip = txt; btn.textContent = txt;
    quickRowEl.appendChild(btn);
  });
  bindChips();
}

function bindChips(){
  document.querySelectorAll('#quick-row .chip').forEach(btn=>{
    // remove existing to avoid double binding
    btn.replaceWith(btn.cloneNode(true));
  });
  document.querySelectorAll('#quick-row .chip').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      inputEl.value = btn.dataset.chip;
      formEl.dispatchEvent(new Event('submit'));
    });
  });
}

// ---------- Enhanced lightweight NLU (still heuristic) ----------
// Condition keyword + synonym bank
const CONDITION_SYNONYMS = {
  headache: ['headache','head pain','throbbing head','tension','pressure head','migraine-ish'],
  hayfever: ['hay fever','hayfever','allergy','allergic rhinitis','itchy nose','sneezing','pollen'],
  indigestion: ['heartburn','indigestion','acid reflux','acid','reflux','burning chest'],
  diarrhoea: ['diarrhoea','diarrhea','loose stools','runny stools','the runs','tummy bug'],
  sorethroat: ['sore throat','throat pain','hurts to swallow','painful swallow','pharyngitis','raw throat']
};

// Precompiled regex (broad) for quick hit
const CONDITION_REGEX = {
  headache: /(headache|throbbing head|tension)/i,
  hayfever: /(hay\s?fever|allerg|sneez|itchy nose|runny nose|rhinitis|pollen)/i,
  indigestion: /(heartburn|indigestion|acid|reflux|burning (in|behind) (my )?chest)/i,
  diarrhoea: /(diarrh(o|h)ea|loose stools|runs|tummy bug)/i,
  sorethroat: /(sore throat|hurts to swallow|throat pain|pharyng|raw throat)/i
};

// Simple Levenshtein distance for fuzzy token matching
function lev(a,b){
  a = a.toLowerCase(); b = b.toLowerCase();
  const dp = Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
  for(let i=0;i<=a.length;i++) dp[i][0]=i; for(let j=0;j<=b.length;j++) dp[0][j]=j;
  for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++){
    dp[i][j] = a[i-1]===b[j-1]? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  }
  return dp[a.length][b.length];
}

function classifyCondition(text){
  if(!text) return null;
  // Quick regex pass
  for(const k of Object.keys(CONDITION_REGEX)) if(CONDITION_REGEX[k].test(text)) return k;
  // Fuzzy pass on tokens
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  let best = {cond:null, score: Infinity};
  tokens.forEach(tok=>{
    for(const [cond, syns] of Object.entries(CONDITION_SYNONYMS)){
      for(const s of syns){
        const d = lev(tok.replace(/ing$/,'').slice(0,12), s.split(' ')[0]);
        if(d < best.score && d <= 2){ // allow small edit distance
          best = {cond, score:d};
        }
      }
    }
  });
  return best.cond;
}

// Richer duration extractor
function extractDuration(text){
  if(!text) return null;
  const t = text.toLowerCase();
  // explicit numbers
  const numMatch = t.match(/(\d+)\s*(hour|hr|day|week)s?/);
  if(numMatch){
    const n = parseInt(numMatch[1]);
    const unit = numMatch[2];
    if(/hour|hr/.test(unit) || (unit==='day' && n===0)) return '< 24 hours';
    if(unit.startsWith('day')){
      if(n<=3) return '1–3 days';
      if(n<=7) return '4–7 days';
      return '> 7 days';
    }
    if(unit.startsWith('week')) return '> 7 days';
  }
  if(/yesterday|since last night|last night/.test(t)) return '< 24 hours';
  if(/couple of days|few days|couple days/.test(t)) return '1–3 days';
  if(/(nearly|about|around) a week|5|6 days/.test(t)) return '4–7 days';
  if(/over a week|more than a week|two weeks|\b2 weeks|fortnight|months?/.test(t)) return '> 7 days';
  if(/recurrent|keeps? coming back|on and off/.test(t)) return 'Recurrent / frequent';
  if(/<\s*24\s*hours|less than a day|earlier today|today only/.test(t)) return '< 24 hours';
  return null;
}

// Negation-aware pattern test for safety flags
const NEGATION_WINDOW = 25; // chars
function isNegated(text, index){
  const window = text.slice(Math.max(0,index-NEGATION_WINDOW), index).toLowerCase();
  return /\b(no|not|without|never|denies|denied)\b/.test(window);
}
function mentions(text, re){
  const t = text.toLowerCase();
  let m;
  const source = re instanceof RegExp && !re.global ? new RegExp(re.source, re.flags + (re.flags.includes('g')?'':'g')) : re;
  while((m = source.exec(t))){
    if(!isNegated(t,m.index)) return true;
  }
  return false;
}

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
  // Added WWHAM extras: Action already taken & current Medication
  if (!state.action) return 'action';
  if (!state.meds) return 'meds';
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
    if (slot === 'action') {
      return "What have you already tried? (e.g., rest, fluids, paracetamol, antacid). If nothing, say 'none'.";
    }
    if (slot === 'meds') {
      return "What regular medicines or supplements are currently being taken? (e.g., ibuprofen, antihistamine). If none, say 'none'.";
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
    if (slot === 'action') {
      // store free-form actions tried
      if (['none','nothing','no'].includes(text)) state.action = 'none'; else state.action = text;
      return true;
    }
    if (slot === 'meds') {
      if (['none','nothing','no'].includes(text)) state.meds = 'none';
      else {
        // normalise comma / and separated list
        const list = text.split(/[,/;&]+| and /i).map(s=>s.trim()).filter(Boolean);
        state.meds = list.join(', ');
      }
      return true;
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
        (mentions(t,/swallow|vomit(ing)?\s*blood|black (stool|tarry)|severe|weight loss/))) {
      state.flags.push('Indigestion red flags — urgent medical assessment (call NHS 111 or GP; A&E if severe bleeding).');
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

    // Generic severe phrases irrespective of condition
    if (mentions(t, /(vomit(ing)?\s*blood|cough(ing)?\s*blood|severe chest pain|unconscious|collapse|no urine|stiff neck|non.?blanching rash)/)) {
      state.flags.push('Potential medical emergency — seek urgent medical help (call 999 / A&E).');
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
    
    // Extract just the medication names from the enhanced advice objects
    if (res.advice && Array.isArray(res.advice)) {
      res.advice = res.advice.map(med => med.name || 'Unknown medication');
    }
    
    // merge flags/cautions picked by safetyAgent
    res.flags = Array.from(new Set([...(res.flags||[]), ...state.flags]));
    res.cautions = Array.from(new Set([...(res.cautions||[]), ...state.cautions]));
    return res;
  }
};

// ---------- Flow control ----------
function greet(){
  // More chat-like greeting
  botSpeak("Hi — I'm Pharmabot. Tell me in your own words what's going on and I'll ask a few quick questions to help.");
  setTimeout(()=> botSpeak("You can say things like 'adult', 'pregnant', 'for my child', or how long it's been."), 900);
  clearSuggestionChips();
  state.step = 'free';
}

function handleUser(text){
  // Note: user message bubbles are now added only in the submit handler
  // to prevent duplicates (was previously rendered twice). When handleUser
  // is called internally with an empty string after slot fill we *don't*
  // want an empty bubble displayed.

  // AGENT: triage which slot to ask next
  const nextSlot = triageAgent.next(text);
  if (nextSlot === 'who') return botAsk(wwhamAgent.ask('who'), 'who');
  if (nextSlot === 'howlong') return botAsk(wwhamAgent.ask('howlong'), 'howlong');
  if (nextSlot === 'condition') return botAsk(wwhamAgent.ask('condition'), 'condition');
  // Newly added WWHAM extensions that were not previously surfaced causing the
  // flow to stall after "how long". These now continue the questioning.
  if (nextSlot === 'action') return botAsk(wwhamAgent.ask('action'), 'action');
  if (nextSlot === 'meds') return botAsk(wwhamAgent.ask('meds'), 'meds');

  // If we’re ready, ask safety questions
  if (nextSlot === 'safety') {
    state.step = 'safety';
    return botAsk(safetyAgent.ask(), 'safety');
  }
}

let pendingSlot = null;
function botAsk(prompt, slot){
  // Short conversational preface
  const prefaces = {
    who: "Okay — just one quick thing:",
    howlong: "Thanks — and how long has it been?",
    condition: "Got it — quick follow-up:",
    action: "Thanks — what have you already tried?",
    meds: "Any regular medicines to tell me about?",
    safety: "Just checking a few safety things..."
  };
  const pre = prefaces[slot] || '';
  const t = addTyping();
  setTimeout(()=> replaceTyping(t, `<strong>${pre}</strong><br>${prompt}`), 650);
  pendingSlot = slot;

  // show helpful chips based on slot to make it chatty
  if(slot === 'who') showSuggestionChips(['adult','teen 13–17','child 5–12','infant <1','pregnant','breastfeeding']);
  else if(slot === 'howlong') showSuggestionChips(['< 24 hours','1–3 days','4–7 days','> 7 days','recurrent']);
  else if(slot === 'condition') showSuggestionChips(['headache','hay fever','heartburn','diarrhoea','sore throat']);
  else if(slot === 'action') showSuggestionChips(['none','rest','fluids','paracetamol','antacid']);
  else if(slot === 'meds') showSuggestionChips(['none','ibuprofen','antihistamine','paracetamol']);
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

async function handleSafety(text){
  safetyAgent.evaluate(text);
  // Summarise + show medication advice directly
  // Prepare authoritative engine result and (optionally) a friendlier agent output before rendering
  const res = adviceAgent.summarise();
  const bullets = (arr)=> arr.map(x=>`• ${x}`).join('<br>');
  let medAdvice = '';
  let engResult = null;
  let result = null;
  let agentOut = null;
  try {
    engResult = window.Engine?.evaluate({
      condition: state.condition,
      who: state.who,
      what: state.what,
      duration: state.duration,
      meds: state.meds,
      answers: state.answers
    });
    result = engResult;
    if(window.LLMAgent){
      try {
        agentOut = await window.LLMAgent.respond({ payload: { condition: state.condition, who: state.who, howlong: state.duration, what: state.what, action: state.action, meds: state.meds }, engineResult: result });
      } catch(e){ console.warn('LLM respond failed', e); agentOut = null; }
    }
  } catch (error) {
    console.error('Error preparing engine/agent output:', error);
  }

  const t = addTyping();
  setTimeout(()=>{

  // Build medHtml using existing engine result as before (engine is authoritative),
  // but allow LLMAgent to produce a friendlier medHtml/textHtml for presentation.
  let rawMedHtml = '';
      if (result && result.advice?.length) {
        rawMedHtml = '<div class="med-summary"><h3>💊 Recommended Medications</h3>';
        result.advice.forEach((med) => {
          rawMedHtml += `<div class="med-card"><h4>${med.name}</h4>`;
          if (med.ingredient) rawMedHtml += `<p class="med-meta"><strong>Active ingredient:</strong> ${med.ingredient}</p>`;
          if (med.description) rawMedHtml += `<p class="med-meta"><em>${med.description}</em></p>`;
          if (med.dosage) rawMedHtml += `<p><strong>Dosage:</strong> ${med.dosage}</p>`;
          if (Array.isArray(med.rationale) && med.rationale.length) {
            rawMedHtml += `<details class="rationale"><summary>Why this appears suitable</summary><ul>`+
              med.rationale.map(r=>`<li>${r}</li>`).join('') + `</ul></details>`;
          }
          rawMedHtml += `</div>`;
        });
        if (result.generalTiming?.length) {
          rawMedHtml += `<h4 class="section info">⏰ When to Take</h4><ul>`;
          result.generalTiming.forEach(item => rawMedHtml += `<li>${item}</li>`);
          rawMedHtml += `</ul>`;
        }
        if (result.administration?.length) {
          rawMedHtml += `<h4 class="section info">📋 How to Take</h4><ul>`;
          result.administration.forEach(item => rawMedHtml += `<li>${item}</li>`);
          rawMedHtml += `</ul>`;
        }
        if (result.storage?.length) {
          rawMedHtml += `<h4 class="section info">🏠 Storage</h4><ul>`;
          result.storage.forEach(item => rawMedHtml += `<li>${item}</li>`);
          rawMedHtml += `</ul>`;
        }
        if (result.warnings?.length) {
          rawMedHtml += `<h4 class="section danger">⚠️ Important Warnings</h4><ul>`;
          result.warnings.forEach(item => rawMedHtml += `<li class="danger">${item}</li>`);
          rawMedHtml += `</ul>`;
        }
        if (result.selfCare?.length) {
          rawMedHtml += `<h4 class="section tip">🌿 Self-Care Tips</h4><ul>`;
          result.selfCare.forEach(item => rawMedHtml += `<li>${item}</li>`);
          rawMedHtml += `</ul>`;
        }
        // Append reasoning trace (collapsed)
        if (result.trace) {
          const optTrace = (result.trace.options||[]).map(o=>{
            return `<li><strong>${o.option}</strong>: ${o.included?'<span style="color:#059669">included</span>':'<span style="color:#dc2626">excluded</span>'}${o.reasons?.length?'<ul>'+o.reasons.map(r=>`<li>${r}</li>`).join('')+'</ul>':''}</li>`;
          }).join('');
          rawMedHtml += `<details class="trace"><summary>🔍 Reasoning trace</summary><div><p>${result.trace.steps.map(s=>`<div>• ${s}</div>`).join('')}</p><ul>${optTrace}</ul></div></details>`;
        }
        rawMedHtml += '</div>';
      }

      // Prefer the agent's medHtml for presentation when available, but always post-process
      // using the authoritative engineResult. Also prefer agent textHtml as the friendly
      // summary header when present.
      let agentMedInput = rawMedHtml;
      let agentSummaryHtml = null;
      if (window.LLMAgent) {
        agentSummaryHtml = (agentOut && agentOut.textHtml) ? agentOut.textHtml : null;
        if (window.LLMAgent.enabled && window.LLMAgent.enabled()) {
          agentMedInput = (agentOut && agentOut.medHtml) ? agentOut.medHtml : rawMedHtml;
        }
      }

      try {
        if(window.LLMAgent && window.LLMAgent.postProcess){
          medAdvice = window.LLMAgent.postProcess({ payload: { condition: state.condition, who: state.who, howlong: state.duration, what: state.what, action: state.action, meds: state.meds }, engineResult: result, medHtml: agentMedInput, state });
        } else {
          // fallback: if any flags, suppress meds
          const hasFlags = (result?.flags?.length || 0) > 0 || state.flags.length > 0;
          if(hasFlags){
            medAdvice = '<div class="med-summary"><h3>⚠️ Safety Priority</h3><p>Red flag symptoms detected. Do not start new OTC medicines until a healthcare professional reviews you. Seek urgent advice now (NHS 111, GP, or emergency services if severe bleeding, chest pain, collapse, or vomiting blood).</p>';
            if(result?.flags?.length) medAdvice += '<ul>' + result.flags.map(f=>`<li class="danger">${f}</li>`).join('') + '</ul>';
            medAdvice += '</div>';
          } else medAdvice = agentMedInput || '<div class="med-summary"><p>No OTC options identified; consult a pharmacist or GP.</p></div>';
        }
  } catch(e){ console.error('LLMAgent.postProcess failed', e); medAdvice = agentMedInput || ''; }
    
    // If the agent produced a friendly summary, use it; otherwise show the manual summary
    const summaryHtml = agentSummaryHtml || (`<strong>Summary</strong><br>Condition: ${state.condition || '-'}<br>Who: ${state.who || '-'}<br>Duration: ${state.duration || '-'}<br>Action taken: ${state.action || '-'}<br>Current meds: ${state.meds || '-'}<br><br>`);

    replaceTyping(t, `
      ${summaryHtml}

      ${medAdvice}

      ${res.cautions?.length ? `<h4 style="color: #d97706; margin: 12px 0 6px 0;">⚠️ Cautions</h4>${bullets(res.cautions)}<br><br>`:''}
      ${res.flags?.length ? `<h4 style="color: #dc2626; margin: 12px 0 6px 0;">🚨 Red Flags - Seek Medical Attention</h4>${bullets(res.flags)}<br><br>`:''}

      <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 12px; margin: 12px 0;">
        <p style="margin: 0; color: #0c4a6e;"><strong>Next Steps:</strong> You can ask me more questions or start a new consultation.</p>
      </div>
    `);
    
    // Persist state for any future reference
    sessionStorage.setItem('checkPayload', JSON.stringify({
      condition: state.condition, who: state.who, howlong: state.duration,
      what: state.what, action: state.action, meds: state.meds, answers: state.answers
    }));
    state.step = 'free'; // continue chatting if user wants
  }, 500);
}

// ---------- Events ----------
formEl.addEventListener('submit', (e)=>{
  e.preventDefault();
  const text = (inputEl.value || '').trim();
  if (!text) return;
  // Run NLU enrichment first
  try {
    if(window.NLU){
      const findings = window.NLU.analyze(text, state);
      if(findings.condition && !state.condition) state.condition = findings.condition;
      if(findings.who && !state.who) state.who = findings.who;
      if(findings.duration && !state.duration) state.duration = findings.duration;
      if(findings.action && !state.action) state.action = findings.action;
      if(findings.meds && !state.meds) state.meds = findings.meds;
      if(Array.isArray(findings.redFlags) && findings.redFlags.length){
        findings.redFlags.forEach(r=> state.flags.push(`Possible red flag phrase detected: ${r}`));
      }
    }
  } catch(err){ console.warn('NLU error', err); }
  const slot = pendingSlot;
  inputEl.value = '';
  // Always show what the user typed
  addMsg('user', text);
  if (slot === 'safety') {
    pendingSlot = null;
    return handleSafety(text);
  }
  if (slot) return handleSlotFill(text);
  if (state.step === 'safety') return handleSafety(text);
  handleUser(text);
});

// initialise suggestion chips binding
bindChips();

restartEl.addEventListener('click', ()=>{
  // reset state
  Object.keys(state).forEach(k=>{
    if (Array.isArray(state[k])) state[k]=[];
    else state[k]=null;
  });
  state.step='greet'; state.answers={}; state.flags=[]; state.cautions=[]; state.what='';
  messagesEl.innerHTML='';
  greet();
  clearSuggestionChips();
});

// Start
greet();

// Wire the LLM toggle (if present) so devs/users can switch chatty mode at runtime
if(llmToggleEl && window.LLMAgent){
  // initialise checkbox according to agent state
  try {
    llmToggleEl.checked = !!window.LLMAgent.enabled && window.LLMAgent.enabled();
  } catch(e){ llmToggleEl.checked = true; }
  // initial subtitle tweak
  subtitleEl && (subtitleEl.textContent = llmToggleEl.checked ? 'Chatty mode enabled — friendly summaries powered by the local agent.' : 'Deterministic mode — only dataset-derived text will be shown.');
  llmToggleEl.addEventListener('change', (e)=>{
    const on = !!e.target.checked;
    try { window.LLMAgent.setEnabled(on); } catch(_){}
    subtitleEl && (subtitleEl.textContent = on ? 'Chatty mode enabled — friendly summaries powered by the local agent.' : 'Deterministic mode — only dataset-derived text will be shown.');
  });
}
