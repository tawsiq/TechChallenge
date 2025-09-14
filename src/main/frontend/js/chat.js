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

// ---------- Natural Language Understanding ----------
// Enhanced condition matching with more conversational patterns
const CONDITION_PATTERNS = {
  headache: [
    /head(ache|s? (hurt|pain|pound|throb))/i,
    /migraine/i,
    /tension.*head/i,
    /pressure.*head/i,
    /skull.*pain/i
  ],
  hayfever: [
    /hay\s?fever/i,
    /(runny|stuffy|blocked).*nose/i,
    /(sneezing|sneez)/i,
    /allergic.*rhinitis/i,
    /eyes.*itch/i,
    /pollen/i,
    /seasonal.*allerg/i
  ],
  indigestion: [
    /heartburn/i,
    /indigestion/i,
    /acid.*reflux/i,
    /burning.*(chest|stomach)/i,
    /stomach.*burn/i,
    /after.*eat.*hurt/i
  ],
  diarrhoea: [
    /diarr?h(o|e)ea/i,
    /loose.*stool/i,
    /runny.*stool/i,
    /the.*runs/i,
    /tummy.*bug/i,
    /stomach.*upset/i
  ],
  sorethroat: [
    /sore.*throat/i,
    /throat.*(hurt|pain)/i,
    /hurt.*swallow/i,
    /pain.*swallow/i,
    /throat.*raw/i,
    /scratchy.*throat/i
  ]
};

function classifyCondition(text){
  if(!text) return null;
  
  for(const [condition, patterns] of Object.entries(CONDITION_PATTERNS)){
    for(const pattern of patterns){
      if(pattern.test(text)) return condition;
    }
  }
  return null;
}

// Natural duration extraction
function extractDuration(text){
  if(!text) return null;
  const t = text.toLowerCase();
  
  // Time patterns
  if(/today|this morning|few hours|started today/.test(t)) return '< 24 hours';
  if(/yesterday|last night|since yesterday/.test(t)) return '< 24 hours';
  if(/couple.*days?|2-3.*days?|few.*days?/.test(t)) return '1–3 days';
  if(/about.*week|nearly.*week|5-6.*days?/.test(t)) return '4–7 days';
  if(/over.*week|more.*week|weeks?|months?|long time/.test(t)) return '> 7 days';
  if(/comes?.*goes?|on.*off|recurring|frequent/.test(t)) return 'Recurrent / frequent';
  
  // Number matching
  const numMatch = t.match(/(\d+)\s*(hour|day|week)s?/);
  if(numMatch){
    const n = parseInt(numMatch[1]);
    const unit = numMatch[2];
    if(unit === 'hour' || n === 0) return '< 24 hours';
    if(unit === 'day'){
      if(n <= 3) return '1–3 days';
      if(n <= 7) return '4–7 days';
      return '> 7 days';
    }
    if(unit === 'week') return '> 7 days';
  }
  
  return null;
}

// ---------- Conversational Response Helpers ----------
function getRandomResponse(responses) {
  return responses[Math.floor(Math.random() * responses.length)];
}

const CONVERSATIONAL_RESPONSES = {
  greetings: [
    "Hi! I'm here to help with over-the-counter medicine advice. What's bothering you today?",
    "Hello! Tell me what symptoms you're experiencing and I'll help find the right treatment.",
    "Hi there! What can I help you with today? Just describe what's going on in your own words."
  ],
  
  acknowledgments: [
    "I understand.",
    "Thanks for letting me know.",
    "Got it.",
    "Okay, that helps.",
    "I see."
  ],

  clarifications: {
    who: [
      "Who is this for?",
      "Is this for yourself or someone else?",
      "Can you tell me who needs treatment?"
    ],
    duration: [
      "How long has this been going on?",
      "When did this start?",
      "How long have you been experiencing this?"
    ],
    action: [
      "What have you already tried?",
      "Have you taken anything for this yet?",
      "Any treatments you've already used?"
    ],
    meds: [
      "Are you currently taking any medicines?",
      "Any regular medications I should know about?",
      "What medicines do you normally take?"
    ]
  },

  safety: {
    headache: "Just to be safe - is this a sudden 'worst ever' headache, or do you have any weakness, confusion, or vision problems?",
    hayfever: "Any pregnancy, breastfeeding, or health conditions I should know about?",
    indigestion: "Are you having trouble swallowing, or any severe pain?",
    diarrhoea: "Is there any blood, high fever, or has this been going on more than a week?",
    sorethroat: "Any high fever, trouble swallowing, or has this lasted over a week?"
  }
};

// ---------- Simplified conversation state ----------
const state = {
  step: 'greet',
  who: null,
  duration: null,
  what: '',
  action: '',
  meds: '',
  condition: null,
  flags: [],
  cautions: []
};

// ---------- Simplified Chat Logic ----------
function analyzeMessage(text) {
  const t = text.toLowerCase();
  const analysis = {
    condition: classifyCondition(text),
    duration: extractDuration(text),
    who: null,
    action: null,
    meds: null,
    redFlags: []
  };

  // Extract who this is for
  if(/adult|grown.?up|myself|me|my|i/i.test(t)) analysis.who = 'adult';
  else if(/teen|teenager|13|14|15|16|17/i.test(t)) analysis.who = 'teen 13–17';
  else if(/child|kid|son|daughter|8|9|10|11|12/i.test(t)) analysis.who = 'child 5–12';
  else if(/toddler|little one|2|3|4.year/i.test(t)) analysis.who = 'toddler 1–4';
  else if(/baby|infant|newborn|under.?1/i.test(t)) analysis.who = 'infant <1';
  else if(/pregnant|pregnancy|expecting/i.test(t)) analysis.who = 'pregnant';
  else if(/breastfeeding|nursing|breast.?feeding/i.test(t)) analysis.who = 'breastfeeding';

  // Extract what they've tried
  if(/nothing|none|haven.?t tried/i.test(t)) analysis.action = 'none';
  else if(/paracetamol|tylenol/i.test(t)) analysis.action = 'paracetamol';
  else if(/ibuprofen|advil|nurofen/i.test(t)) analysis.action = 'ibuprofen';

  // Extract current medications
  if(/no.?(medicine|medication|meds)|nothing|none/i.test(t)) analysis.meds = 'none';
  else if(/paracetamol|ibuprofen|aspirin|antihistamine/i.test(t)) analysis.meds = text;

  // Simple red flag detection
  if(/worst.ever|thunderclap|sudden.severe/i.test(t)) analysis.redFlags.push('severe headache');
  if(/blood|bleeding/i.test(t)) analysis.redFlags.push('bleeding');
  if(/can.?t breathe|chest pain|collapse/i.test(t)) analysis.redFlags.push('emergency symptoms');

  return analysis;
}

function getNextQuestion() {
  if (!state.who) return { type: 'who', text: getRandomResponse(CONVERSATIONAL_RESPONSES.clarifications.who) };
  if (!state.condition) return { type: 'condition', text: "What's the main problem you're dealing with?" };
  if (!state.duration) return { type: 'duration', text: getRandomResponse(CONVERSATIONAL_RESPONSES.clarifications.duration) };
  if (!state.action) return { type: 'action', text: getRandomResponse(CONVERSATIONAL_RESPONSES.clarifications.action) };
  if (!state.meds) return { type: 'meds', text: getRandomResponse(CONVERSATIONAL_RESPONSES.clarifications.meds) };
  return { type: 'safety', text: CONVERSATIONAL_RESPONSES.safety[state.condition] || "Any concerning symptoms I should know about?" };
}

function updateStateFromAnalysis(analysis) {
  if (analysis.condition && !state.condition) {
    state.condition = analysis.condition;
    return true;
  }
  if (analysis.duration && !state.duration) {
    state.duration = analysis.duration;
    return true;
  }
  if (analysis.who && !state.who) {
    state.who = analysis.who;
    return true;
  }
  if (analysis.action && !state.action) {
    state.action = analysis.action;
    return true;
  }
  if (analysis.meds && !state.meds) {
    state.meds = analysis.meds;
    return true;
  }
  return false;
}

function evaluateSafety(text) {
  const t = text.toLowerCase();
  
  // Check for red flags based on condition and general symptoms
  if (state.condition === 'headache' && /worst.ever|thunderclap|head.injury|weakness|confusion|vision/i.test(t)) {
    state.flags.push('Headache red flags — seek urgent advice (pharmacist/GP/111).');
  }
  if (state.condition === 'indigestion' && /trouble.swallow|vomit.*blood|black.stool|severe.pain/i.test(t)) {
    state.flags.push('Indigestion red flags — urgent medical assessment needed.');
  }
  if (state.condition === 'diarrhoea' && /blood|high.fever|severe.pain|week/i.test(t)) {
    state.flags.push('Diarrhoea red flags — seek medical advice.');
  }
  
  // General emergency symptoms
  if(/chest.pain|can.?t.breathe|collapse|vomit.*blood/i.test(t)) {
    state.flags.push('Emergency symptoms — call 999 or go to A&E immediately.');
  }
}

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

// Force the chatty agent on for end-users (UI toggle removed)
try { window.LLMAgent.setEnabled(true); } catch(e){}
subtitleEl && (subtitleEl.textContent = 'Chatty mode enabled — friendly summaries powered by the local agent.');

// Settings panel wiring
if(llmSettingsBtn && llmSettingsPanel){
  // restore saved proxy URL
  const saved = localStorage.getItem('LLM_PROXY_URL');
  if(saved){ llmProxyInput.value = saved; window.LLM_PROXY_URL = saved; }

  llmSettingsBtn.addEventListener('click', ()=>{
    const visible = llmSettingsPanel.style.display !== 'none';
    llmSettingsPanel.style.display = visible ? 'none' : 'block';
    llmSettingsPanel.setAttribute('aria-hidden', visible ? 'true' : 'false');
  });

  llmSettingsSave.addEventListener('click', ()=>{
    const v = (llmProxyInput.value || '').trim();
    if(v){ localStorage.setItem('LLM_PROXY_URL', v); window.LLM_PROXY_URL = v; }
    else { localStorage.removeItem('LLM_PROXY_URL'); window.LLM_PROXY_URL = undefined; }
    llmSettingsPanel.style.display = 'none'; llmSettingsPanel.setAttribute('aria-hidden','true');
  });

  llmSettingsCancel.addEventListener('click', ()=>{
    llmSettingsPanel.style.display = 'none'; llmSettingsPanel.setAttribute('aria-hidden','true');
  });
}
