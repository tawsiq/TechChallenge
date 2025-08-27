// Basic stepper controls
const form = document.getElementById('check-form');
const steps = [...document.querySelectorAll('.step')];
const stepper = [...document.querySelectorAll('.stepper li')];

function go(to) {
  steps.forEach(s => s.hidden = s.dataset.step !== String(to));
  stepper.forEach(li => {
    li.classList.toggle('current', li.dataset.step === String(to));
  });
  current = to;
}
let current = 1;

form?.addEventListener('click', (e) => {
  const nextBtn = e.target.closest('.next');
  const prevBtn = e.target.closest('.prev');
  if (nextBtn) {
    if (!form.reportValidity()) return;
    if (current === 2) injectConditionQuestions(); // build step 3
    if (current === 3) buildReview();              // build step 4
    go(Math.min(current + 1, 4));
  }
  if (prevBtn) go(Math.max(current - 1, 1));
});

document.getElementById('finish')?.addEventListener('click', () => {
  alert('Finished demo. This prototype does not submit data.');
});

// ----------------------
// Condition question sets
// ----------------------

const conditionSets = {
  // NHS: paracetamol/ibuprofen; red flags like sudden “worst headache”, head injury, neuro symptoms; NSAID cautions (ulcer, anticoagulants, pregnancy)
// Sources: see page text
  headache: {
    title: 'Headache — safety questions',
    questions: [
      { type: 'radio', name: 'sudden_severe', label: 'Is this a sudden, severe (“worst ever”) or thunderclap headache?', options: ['Yes','No'] },
      { type: 'radio', name: 'head_injury', label: 'Have you had a recent head injury or fall?', options: ['Yes','No'] },
      { type: 'radio', name: 'neuro', label: 'Any weakness, confusion, vision problems, stiff neck, or new neurological symptoms?', options: ['Yes','No'] },
      { type: 'radio', name: 'pregnancy', label: 'Are you pregnant?', options: ['Yes','No'] },
      { type: 'checkbox', name: 'nsaid_cautions', label: 'Tick any that apply (ibuprofen cautions):', options: ['Stomach ulcer/bleeding history','On blood thinners (e.g., warfarin)','Severe heart/kidney/liver problems','Asthma triggered by NSAIDs'] },
      { type: 'checkbox', name: 'paracetamol_limits', label: 'Paracetamol safety:', options: ['I have taken paracetamol already today','I might exceed the 4g (8 x 500mg) max in 24h'] },
    ],
    alerts: (ans) => {
      const a = [];
      if (ans.sudden_severe === 'Yes' || ans.head_injury === 'Yes' || ans.neuro === 'Yes') a.push('Red flag: seek urgent advice (NHS 111/GP/A&E as appropriate).');
      if (ans.paracetamol_limits?.includes('I might exceed the 4g (8 x 500mg) max in 24h')) a.push('Do not exceed the maximum adult paracetamol dose in 24 hours.');
      if (ans.nsaid_cautions?.length) a.push('Ibuprofen may be unsuitable — discuss with a pharmacist.');
      return a;
    }
  },

  // NHS hay fever: antihistamines (drowsy vs non-drowsy), steroid sprays; cautions: pregnancy/breastfeeding, age, comorbidities, other meds
  hayfever: {
    title: 'Hay fever — safety questions',
    questions: [
      { type: 'radio', name: 'age_under6', label: 'Is this for a child under 6?', options: ['Yes','No'] },
      { type: 'radio', name: 'pregnant_bf', label: 'Pregnant or breastfeeding?', options: ['Yes','No'] },
      { type: 'checkbox', name: 'sedation_concerns', label: 'Preferences/concerns:', options: ['Avoid drowsy antihistamines','Okay with once-daily dosing','Prefer nasal spray'] },
      { type: 'checkbox', name: 'conditions', label: 'Any of the following?', options: ['Liver/kidney problems','Heart rhythm problems','Epilepsy'] },
      { type: 'text', name: 'other_meds', label: 'Other regular medicines (optional):' },
    ],
    alerts: (ans) => {
      const a = [];
      if (ans.pregnant_bf === 'Yes' || ans.age_under6 === 'Yes') a.push('Check with a pharmacist for suitable antihistamine/spray and dosing.');
      if (ans.conditions?.length) a.push('Some antihistamines may be unsuitable — pharmacist advice recommended.');
      return a;
    }
  },

  // NHS heartburn/indigestion: antacids/alginates; red flags: persistent >3 weeks, swallowing difficulty, vomiting blood, weight loss, severe pain
  indigestion: {
    title: 'Heartburn / Indigestion — safety questions',
    questions: [
      { type: 'radio', name: 'alarm_symptoms', label: 'Any red flags: difficulty swallowing, vomiting blood/black stools, severe persistent pain, unexplained weight loss?', options: ['Yes','No'] },
      { type: 'radio', name: 'duration_over3w', label: 'Symptoms lasting more than 3 weeks?', options: ['Yes','No'] },
      { type: 'radio', name: 'night_symptoms', label: 'Symptoms waking you at night or after most meals?', options: ['Yes','No'] },
      { type: 'checkbox', name: 'tried', label: 'What have you tried?', options: ['Antacid','Alginate','Lifestyle changes (smaller meals, less alcohol/spice)','Nothing yet'] },
      { type: 'text', name: 'meds', label: 'Regular medicines (e.g., NSAIDs) that might trigger symptoms (optional):' }
    ],
    alerts: (ans) => {
      const a = [];
      if (ans.alarm_symptoms === 'Yes' || ans.duration_over3w === 'Yes') a.push('Red flag: seek GP/urgent advice.');
      return a;
    }
  },

  // NHS diarrhoea: ORS; loperamide for adults; red flags: blood in stool, high fever, dehydration, age, >7 days
  diarrhoea: {
    title: 'Diarrhoea — safety questions',
    questions: [
      { type: 'radio', name: 'age_child', label: 'Is this for a child under 12?', options: ['Yes','No'] },
      { type: 'radio', name: 'blood', label: 'Blood or black stools?', options: ['Yes','No'] },
      { type: 'radio', name: 'fever', label: 'High fever or severe abdominal pain?', options: ['Yes','No'] },
      { type: 'radio', name: 'duration', label: 'Symptoms for more than 7 days?', options: ['Yes','No'] },
      { type: 'checkbox', name: 'dehyd', label: 'Signs of dehydration:', options: ['Very thirsty / dry mouth','Dark urine / not passing urine','Dizziness'] }
    ],
    alerts: (ans) => {
      const a = [];
      if (ans.blood === 'Yes' || ans.fever === 'Yes' || ans.duration === 'Yes') a.push('Red flag: seek medical advice (NHS 111/GP).');
      if (ans.dehyd?.length) a.push('Use oral rehydration salts; seek advice if symptoms persist/worsen.');
      if (ans.age_child === 'Yes') a.push('Loperamide is not suitable under 12 — seek pharmacist advice.');
      return a;
    }
  },

  // NHS sore throat: analgesics, lozenges; red flags: severe systemic symptoms, dehydration, immunosuppression, symptoms > 1 week
  sorethroat: {
    title: 'Sore throat — safety questions',
    questions: [
      { type: 'radio', name: 'under5', label: 'Is this for a child under 5?', options: ['Yes','No'] },
      { type: 'radio', name: 'duration', label: 'Not improving after 1 week?', options: ['Yes','No'] },
      { type: 'checkbox', name: 'severe', label: 'Any of the following?', options: ['Very high temperature / shivering','Signs of dehydration','Weakened immune system'] },
      { type: 'checkbox', name: 'pref', label: 'Treatment preferences:', options: ['Tablets (paracetamol/ibuprofen as appropriate)','Medicated lozenges','Nasal/throat sprays'] }
    ],
    alerts: (ans) => {
      const a = [];
      if (ans.under5 === 'Yes' || ans.duration === 'Yes' || ans.severe?.length) a.push('Consider pharmacist or GP/111 advice based on severity and age.');
      return a;
    }
  }
};

// Build the condition-specific form based on selected condition + WWHAM
function injectConditionQuestions() {
  const c = document.getElementById('condition').value;
  const holder = document.getElementById('condition-questions');
  holder.innerHTML = '';
  document.getElementById('alerts').hidden = true;
  document.getElementById('alert-list').innerHTML = '';

  if (!c || !conditionSets[c]) {
    holder.innerHTML = '<p class="muted">Select a condition first.</p>';
    return;
  }

  const cfg = conditionSets[c];
  const title = document.createElement('h2');
  title.textContent = cfg.title;
  holder.appendChild(title);

  cfg.questions.forEach(q => {
    const wrap = document.createElement(q.type === 'fieldset' ? 'fieldset' : 'div');
    wrap.className = 'field';
    if (q.type !== 'fieldset') {
      const label = document.createElement('label');
      label.textContent = q.label;
      const id = `${q.name}`;
      label.setAttribute('for', id);
      wrap.appendChild(label);
    }

    if (q.type === 'radio') {
      const row = document.createElement('div');
      row.className = 'choice-row';
      q.options.forEach(opt => {
        const lab = document.createElement('label');
        lab.className = 'choice';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = q.name;
        input.value = opt;
        lab.appendChild(input);
        lab.appendChild(document.createTextNode(opt));
        row.appendChild(lab);
      });
      wrap.appendChild(row);
    } else if (q.type === 'checkbox') {
      const row = document.createElement('div');
      row.className = 'choice-row';
      q.options.forEach(opt => {
        const lab = document.createElement('label');
        lab.className = 'choice';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = q.name;
        input.value = opt;
        lab.appendChild(input);
        lab.appendChild(document.createTextNode(opt));
        row.appendChild(lab);
      });
      wrap.appendChild(row);
    } else if (q.type === 'text') {
      const input = document.createElement('input');
      input.type = 'text';
      input.name = q.name;
      input.placeholder = q.label;
      wrap.appendChild(input);
    }
    holder.appendChild(wrap);
  });

  // Listen for answers to show alerts dynamically
  holder.addEventListener('change', () => {
    const ans = collectConditionAnswers();
    const alerts = conditionSets[c].alerts(ans);
    const box = document.getElementById('alerts');
    const list = document.getElementById('alert-list');
    list.innerHTML = '';
    if (alerts.length) {
      alerts.forEach(t => {
        const li = document.createElement('li');
        li.textContent = t;
        list.appendChild(li);
      });
      box.hidden = false;
    } else {
      box.hidden = true;
    }
  }, { once: true }); // attach once; radios/checkboxes will bubble
}

function collectConditionAnswers() {
  const data = {};
  const inputs = form.querySelectorAll('[data-step="3"] input, [data-step="3"] select, [data-step="3"] textarea');
  inputs.forEach(el => {
    if (el.type === 'radio') {
      if (el.checked) data[el.name] = el.value;
    } else if (el.type === 'checkbox') {
      if (!data[el.name]) data[el.name] = [];
      if (el.checked) data[el.name].push(el.value);
    } else {
      data[el.name] = el.value;
    }
  });
  return data;
}

function buildReview() {
  const review = document.getElementById('review');
  review.innerHTML = '';
  const pairs = [
    ['Condition', document.getElementById('condition').value || '-'],
    ['Who', document.getElementById('ww_who').value || '-'],
    ['Duration', document.getElementById('ww_howlong').value || '-'],
    ['What', document.getElementById('ww_what').value || '-'],
    ['Action taken', document.getElementById('ww_action').value || '-'],
    ['Current meds', document.getElementById('ww_medication').value || '-'],
  ];
  pairs.forEach(([k,v]) => {
    const row = document.createElement('div');
    row.className = 'pair';
    row.innerHTML = `<div class="muted">${k}</div><div>${v}</div>`;
    review.appendChild(row);
  });

  // Summarise any alerts
  const c = document.getElementById('condition').value;
  if (c && conditionSets[c]) {
    const alerts = conditionSets[c].alerts(collectConditionAnswers());
    if (alerts.length) {
      const row = document.createElement('div');
      row.className = 'pair';
      row.innerHTML = `<div class="muted">Alerts</div><div>${alerts.join('<br>')}</div>`;
      review.appendChild(row);
    }
  }
}
