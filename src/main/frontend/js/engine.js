(function(){
  const DATA_URL = 'data/bnf.json';
  // fetch dataset once and hold in-memory
  let dataset = null;
  fetch(DATA_URL)
    .then(r => r.json())
    .then(d => { dataset = d; })
    .catch(err => console.error('Failed to load BNF dataset', err));

  const condMap = {
    headache: 'headache-simple',
    hayfever: 'allergic-rhinitis',
    indigestion: 'dyspepsia-heartburn',
    diarrhoea: 'acute-diarrhoea',
    sorethroat: 'sore-throat-acute'
  };

  function getDetails(payload){
    const map = {
      'adult': {age:30},
      'teen 13–17': {age:15},
      'child 5–12': {age:8},
      'toddler 1–4': {age:3},
      'infant <1': {age:0.5},
      'pregnant': {age:30, pregnant:true},
      'breastfeeding': {age:30, breastfeeding:true}
    };
    return map[payload.who] || {age:null};
  }

  function appliesOption(option, details){
    const cautions = [];
    let ok = true;
    const limits = option.age_limits || {};
    if(details.age != null){
      if(limits.min_years != null && details.age < limits.min_years){
        ok = false; cautions.push(`Not for under ${limits.min_years} years.`);
        if(limits.note) cautions.push(limits.note);
      }
      if(limits.max_years != null && details.age > limits.max_years){
        ok = false; cautions.push(`Not for over ${limits.max_years} years.`);
        if(limits.note) cautions.push(limits.note);
      }
    }
    if(option.pregnancy && details.pregnant){
      if(option.pregnancy.suitability === 'avoid'){ ok=false; }
      cautions.push(option.pregnancy.note || 'Check suitability in pregnancy.');
    }
    if(option.breastfeeding && details.breastfeeding){
      if(option.breastfeeding.suitability === 'avoid'){ ok=false; }
      cautions.push(option.breastfeeding.note || 'Check suitability while breastfeeding.');
    }
    return {ok, cautions};
  }

  function applyGlobalRules(option, details, payload){
    const cautions = [];
    let ok = true;
    if(!dataset || !dataset.global_rules) return {ok, cautions};
    const medsText = (payload.meds || '').toLowerCase();
    const condText = (payload.answers?.conditions || '').toLowerCase();
    for(const rule of dataset.global_rules){
      if(!rule.applies_to.includes(option.class_id) &&
         !(option.members_examples||[]).some(m=> rule.applies_to.includes(m.split(' ')[0].toLowerCase()))) continue;
      const c = rule.criteria || {};
      if(c.age_lt_years != null && details.age != null && details.age < c.age_lt_years){ ok=false; cautions.push(rule.reason); }
      if(c.pregnant && details.pregnant){ ok=false; cautions.push(rule.reason); }
      if(c.breastfeeding && details.breastfeeding){ ok=false; cautions.push(rule.reason); }
      if(c.meds_any && c.meds_any.some(x=> medsText.includes(x))){ ok=false; cautions.push(rule.reason); }
      if(c.conditions_any && c.conditions_any.some(x=> condText.includes(x))){ ok=false; cautions.push(rule.reason); }
    }
    return {ok, cautions};
  }

  function checkRedFlags(condition, answers){
    const flags = [];
    if(!condition.red_flags) return flags;
    for(const rf of condition.red_flags){
      if(answers && answers[rf.id]) flags.push(rf.text);
    }
    return flags;
  }

  function evaluate(payload){
    if(!dataset) return {title:'', advice:[], selfCare:[], cautions:['Data not loaded'], flags:[]};
    const condId = condMap[payload.condition];
    const condition = dataset.conditions.find(c=> c.id === condId);
    if(!condition) return {title:'', advice:[], selfCare:[], cautions:['Condition not found'], flags:[]};
    const details = getDetails(payload);
    const advice = [], cautions = [], flags = checkRedFlags(condition, payload.answers);
    for(const option of condition.options || []){
      const o1 = appliesOption(option, details);
      if(!o1.ok){ cautions.push(...o1.cautions); continue; }
      const o2 = applyGlobalRules(option, details, payload);
      if(!o2.ok){ cautions.push(...o2.cautions); continue; }
      advice.push(option.example_products?.[0] || option.class_name);
      cautions.push(...o1.cautions, ...o2.cautions);
    }
    const uniq = arr => Array.from(new Set(arr.filter(Boolean)));
    return {
      title: condition.name,
      advice: uniq(advice),
      selfCare: uniq(condition.default_self_care || []),
      cautions: uniq(cautions),
      flags: uniq(flags)
    };
  }

  window.Engine = { evaluate };
})();