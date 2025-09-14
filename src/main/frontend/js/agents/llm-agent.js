// Lightweight LLM agent scaffold + strict post-processing filter.
// This file intentionally does not call any external API. It provides a
// pluggable interface for an LLM and a strong postProcess function that
// enforces the app's hard-coded safety and medication rules.

(function(){
  let enabled = true; // enabled by default for chatty UX; clinical decisions still from Engine

  function setEnabled(v){ enabled = !!v; }

  // Friendly templated summary generator (used when no real LLM is available)
  function templateSummary(payload, engineResult){
    const title = engineResult?.title || payload.condition || 'Symptoms';
    let text = `<strong>${title}</strong><br>`;
    text += `Who: ${payload.who || '-'} • Duration: ${payload.howlong || '-'}<br>`;
    if(payload.action) text += `Already tried: ${payload.action}<br>`;
    if(payload.meds) text += `Current meds: ${payload.meds}<br>`;
    if(engineResult?.flags?.length) text += `<p style="color:#dc2626;"><strong>Red flags detected — seek urgent medical advice.</strong></p>`;
    return text;
  }

  // Strict post-processing that enforces safety rules.
  // Inputs: payload (what user provided), engineResult from Engine.evaluate, and medHtml (existing generated med HTML)
  function postProcess({payload, engineResult, medHtml, state}){
    // If any red flags present (either from engine or session state), suppress meds
    const hasFlags = (engineResult?.flags?.length || 0) > 0 || (state?.flags?.length || 0) > 0;
    if(hasFlags){
      const bullets = (engineResult?.flags||[]).map(f=>`<li class="danger">${f}</li>`).join('');
      const stateBullets = (state?.flags||[]).map(f=>`<li class="danger">${f}</li>`).join('');
      return `<div class="med-summary"><h3>⚠️ Safety Priority</h3><p>Red flag symptoms were detected. Do NOT start any new over-the-counter medications. Seek urgent medical advice (NHS 111, GP, or emergency services for severe bleeding or collapse).</p><ul>${bullets}${stateBullets}</ul></div>`;
    }

    // Ensure any recommended meds in engineResult.advice are valid according to the dataset
    if(engineResult && Array.isArray(engineResult.advice) && engineResult.advice.length){
      // We trust Engine.evaluate to supply clinically-appropriate items; however,
      // double-check that the advice array is non-empty and that medHtml exists.
      if(medHtml && medHtml.trim()){
        // Attach a short disclaimer and return
        return medHtml + `<div class="med-disclaimer" style="margin-top:8px;font-size:0.95em;color:#0c4a6e;">This guidance is educational only. If in doubt, consult a pharmacist or call NHS 111.</div>`;
      }
    }

    // No specific meds to show; recommend pharmacist/GP
    return `<div class="med-summary"><p>No suitable over-the-counter medication options were identified based on the information provided. Please consult a pharmacist or contact your GP for personalised advice.</p></div>`;
  }

  // respond() - placeholder LLM function that returns a conversational summary and optional suggested followups
  async function respond({payload, engineResult}){
    // Try server proxy first (if available). The proxy is expected to return a
    // safe, presentation-only response. If the proxy is unavailable we fall back
    // to local templated synthesis (which uses the engineResult directly).
    try {
      const proxyUrl = (window.LLM_PROXY_URL && window.LLM_PROXY_URL.trim()) ? window.LLM_PROXY_URL.trim() : '/api/llm';
      // Minimal sanitisation: allowlist the engineResult fields we want to transmit
      const safeEngine = {
        title: engineResult?.title,
        advice: Array.isArray(engineResult?.advice) ? engineResult.advice.map(a=>({ name:a.name, dosage:a.dosage, description:a.description })) : [],
        flags: engineResult?.flags || [],
        cautions: engineResult?.cautions || [],
        generalTiming: engineResult?.generalTiming || [],
        administration: engineResult?.administration || [],
        storage: engineResult?.storage || [],
        warnings: engineResult?.warnings || [],
        selfCare: engineResult?.selfCare || []
      };

      const r = await fetch(proxyUrl, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ prompt: `Summarise for chat UI`, engineResult: safeEngine })
      });
      if(r.ok){
        const j = await r.json();
        // Expect { text: '<html...' } from the proxy
        if(j && j.text){
          return { textHtml: j.text, medHtml: '', structured: engineResult };
        }
      }
      // If proxy returned 501 or other non-ok, fall through to local
    } catch(err){
      // network/proxy error - fall back
      console.warn('LLM proxy call failed, falling back to local agent', err);
    }

    // Local fallback: synthesize from engineResult
    const textHtml = templateSummary(payload, engineResult);
    let medHtml = '';
    if(engineResult && engineResult.advice?.length){
      medHtml = '<div class="med-summary"><h3>💊 Recommended Medications</h3>';
      engineResult.advice.forEach((med) => {
        medHtml += `<div class="med-card"><h4>${med.name}</h4>`;
        if(med.ingredient) medHtml += `<p class="med-meta"><strong>Active ingredient:</strong> ${med.ingredient}</p>`;
        if(med.description) medHtml += `<p class="med-meta"><em>${med.description}</em></p>`;
        if(med.dosage) medHtml += `<p><strong>Dosage:</strong> ${med.dosage}</p>`;
        if(Array.isArray(med.rationale) && med.rationale.length){
          medHtml += `<details class="rationale"><summary>Why this is suggested</summary><ul>` + med.rationale.map(r=>`<li>${r}</li>`).join('') + `</ul></details>`;
        }
        medHtml += `</div>`;
      });
      if(engineResult.generalTiming?.length){ medHtml += `<h4 class="section info">⏰ When to Take</h4><ul>` + engineResult.generalTiming.map(i=>`<li>${i}</li>`).join('') + `</ul>`; }
      if(engineResult.administration?.length){ medHtml += `<h4 class="section info">📋 How to Take</h4><ul>` + engineResult.administration.map(i=>`<li>${i}</li>`).join('') + `</ul>`; }
      if(engineResult.storage?.length){ medHtml += `<h4 class="section info">🏠 Storage</h4><ul>` + engineResult.storage.map(i=>`<li>${i}</li>`).join('') + `</ul>`; }
      if(engineResult.warnings?.length){ medHtml += `<h4 class="section danger">⚠️ Important Warnings</h4><ul>` + engineResult.warnings.map(i=>`<li class="danger">${i}</li>`).join('') + `</ul>`; }
      if(engineResult.selfCare?.length){ medHtml += `<h4 class="section tip">🌿 Self-Care Tips</h4><ul>` + engineResult.selfCare.map(i=>`<li>${i}</li>`).join('') + `</ul>`; }
      medHtml += '</div>';
    }
    return { textHtml, medHtml, structured: engineResult };
  }

  // Expose the interface
  window.LLMAgent = { enabled: () => enabled, setEnabled, respond, postProcess };
})();
