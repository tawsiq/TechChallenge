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

let conditionSets = {};
let conditionsError = null;
const conditionsPromise = fetch('data/bnf.json')
  .then(res => {
    if (!res.ok) throw new Error('Network response was not ok');
    return res.json();
  })
  .then(data => {
    const map = Object.fromEntries((data.conditions || []).map(c => [c.id, c]));
    conditionSets = map;  })
  .catch(err => {
    console.error('Failed to load condition sets', err);
    conditionsError = 'Failed to load condition data.';
  });

// Build the condition-specific form based on selected condition + WWHAM
async function injectConditionQuestions() {
  await conditionsPromise;
  const c = document.getElementById('condition').value;
  const holder = document.getElementById('condition-questions');
  holder.innerHTML = '';
  document.getElementById('alerts').hidden = true;
  document.getElementById('alert-list').innerHTML = '';

  if (conditionsError) {
    holder.innerHTML = `<p class="muted">${conditionsError}</p>`;
    return;
  }

  if (!c || !conditionSets[c]) {
    holder.innerHTML = '<p class="muted">Select a condition first.</p>';
    return;
  }

  const cfg = conditionSets[c];
  const title = document.createElement('h2');
  title.textContent = cfg.name;
  holder.appendChild(title);

  
  if (cfg.scope_note) {
    const scope = document.createElement('p');
    scope.className = 'muted';
    scope.textContent = cfg.scope_note;
    holder.appendChild(scope);
  }
  const alerts = getAlerts(c);
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

}

function getAlerts(c) {
  const cfg = conditionSets[c];
  return cfg?.red_flags?.map(r => r.text) || [];
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
    const alerts = getAlerts(c);
    if (alerts.length) {
      const row = document.createElement('div');
      row.className = 'pair';
      row.innerHTML = `<div class="muted">Alerts</div><div>${alerts.join('<br>')}</div>`;
      review.appendChild(row);
    }
  }
}
