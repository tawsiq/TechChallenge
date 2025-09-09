/* AI-Powered Chat System with OpenAI Integration
   - Uses OpenAI API for natural language understanding
   - Can handle spelling mistakes and varied descriptions
   - More conversational and flexible than rule-based system
   - Still follows WWHAM methodology but with AI understanding
*/

// Configuration - REPLACE WITH YOUR ACTUAL API KEY
const AI_CONFIG = {
  apiKey: 'your-openai-api-key-here', // Replace with your actual OpenAI API key
  model: 'gpt-3.5-turbo',
  apiUrl: 'https://api.openai.com/v1/chat/completions'
};

// Rate limiting to prevent API overuse
let lastAPICall = 0;
const MIN_API_INTERVAL = 1000; // 1 second between calls

const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('input');
const formEl = document.getElementById('composer');
const restartEl = document.getElementById('restart');

// Check if elements exist
if (!messagesEl) console.error('Messages element not found');
if (!inputEl) console.error('Input element not found');
if (!formEl) console.error('Form element not found');
if (!restartEl) console.error('Restart button not found');

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

// ---------- AI Integration ----------
async function callOpenAI(messages, systemPrompt) {
  // Rate limiting check
  const now = Date.now();
  const timeSinceLastCall = now - lastAPICall;
  
  if (timeSinceLastCall < MIN_API_INTERVAL) {
    console.log('Rate limiting: using fallback to avoid API overuse');
    return await simulateAIResponse(messages, systemPrompt);
  }
  
  // For demo purposes, if no API key is provided, use fallback responses
  if (AI_CONFIG.apiKey === 'your-openai-api-key-here') {
    return await simulateAIResponse(messages, systemPrompt);
  }

  try {
    lastAPICall = now;
    
    const response = await fetch(AI_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('Rate limit hit, using fallback response');
        return await simulateAIResponse(messages, systemPrompt);
      }
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('AI API Error:', error);
    console.log('Falling back to simulation');
    return await simulateAIResponse(messages, systemPrompt);
  }
}

// Fallback AI simulation for demo/development
async function simulateAIResponse(messages, systemPrompt) {
  await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
  
  const userMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
  
  console.log('🤖 Using simulation for:', systemPrompt.substring(0, 50) + '...');
  
  // Intelligent pattern matching for better responses
  if (systemPrompt.includes('triage')) {
    return simulateTriageResponse(userMessage);
  } else if (systemPrompt.includes('WWHAM') || systemPrompt.includes('next question')) {
    return simulateWWHAMQuestion(userMessage);
  } else if (systemPrompt.includes('safety') || systemPrompt.includes('red flag')) {
    return simulateSafetyResponse(userMessage);
  } else {
    return simulateGeneralResponse(userMessage);
  }
}

function simulateTriageResponse(userMessage) {
  const analysis = {
    condition: null,
    duration: null,
    who: null,
    symptoms: userMessage,
    redFlags: [],
    confidence: 'medium'
  };

  console.log('Analyzing user message:', userMessage);

  // Better pattern matching for conditions
  if (/head|migr|pain.*head|skull|temples|headache/i.test(userMessage)) {
    analysis.condition = 'headache';
    analysis.confidence = 'high';
  } else if (/sneez|runny.*nose|allerg|hay|pollen|itch.*nose|sinus|rhinitis/i.test(userMessage)) {
    analysis.condition = 'hayfever';
    analysis.confidence = 'high';
  } else if (/burn.*chest|heart.*burn|acid|reflux|indigestion|stomach.*burn/i.test(userMessage)) {
    analysis.condition = 'indigestion';
    analysis.confidence = 'high';
  } else if (/diarr|loose.*stool|runs|stomach.*upset|bowel|diarrhoea/i.test(userMessage)) {
    analysis.condition = 'diarrhoea';
    analysis.confidence = 'high';
  } else if (/sore.*throat|throat.*pain|swallow.*hurt|throat.*ache/i.test(userMessage)) {
    analysis.condition = 'sorethroat';
    analysis.confidence = 'high';
  }

  // Extract duration more aggressively
  if (/\b(hour|hours|today|this morning|just now|just started)\b/i.test(userMessage)) {
    analysis.duration = '< 24 hours';
  } else if (/\b(yesterday|1 day|one day|day ago|since yesterday)\b/i.test(userMessage)) {
    analysis.duration = '1–3 days';
  } else if (/\b(2|3|two|three).*(day|days)\b/i.test(userMessage)) {
    analysis.duration = '1–3 days';
  } else if (/\b(4|5|6|7|four|five|six|seven).*(day|days)|week|weekly\b/i.test(userMessage)) {
    analysis.duration = '4–7 days';
  } else if (/\b(weeks|months|long.*time|chronic|ongoing)\b/i.test(userMessage)) {
    analysis.duration = '> 7 days';
  }

  // Extract who it's for more intelligently
  if (/\b(my|me|myself|i am|i'm|i have|i've)\b/i.test(userMessage)) {
    analysis.who = 'adult';
  } else if (/\b(my.*child|kid|daughter|son|toddler|children|little.*one|young.*one)\b/i.test(userMessage)) {
    analysis.who = 'child';
  } else if (/\b(baby|infant|newborn|0.*month|1.*month|2.*month|3.*month|4.*month|5.*month|6.*month)\b/i.test(userMessage)) {
    analysis.who = 'infant';
  } else if (/\b(pregnant|expecting|pregnancy)\b/i.test(userMessage)) {
    analysis.who = 'pregnant';
  } else if (/\b(breastfeeding|nursing|breast.*feed)\b/i.test(userMessage)) {
    analysis.who = 'breastfeeding';
  } else if (/\b(teen|teenager|adolescent|13|14|15|16|17)\b/i.test(userMessage)) {
    analysis.who = 'teen';
  }

  // Extract age if mentioned
  const ageMatch = userMessage.match(/\b(\d+)\s*(year|month|week|day)s?\s*old\b/i) || 
                   userMessage.match(/\b(\d+)\s*(yr|yrs|mo|mos|wk|wks)\b/i);
  if (ageMatch) {
    analysis.age = ageMatch[0];
  }

  // Extract weight if mentioned
  const weightMatch = userMessage.match(/\b(\d+(?:\.\d+)?)\s*(kg|kilo|pound|lb|stone)\b/i);
  if (weightMatch) {
    analysis.weight = weightMatch[0];
  }

  console.log('Triage analysis result:', analysis);
  return JSON.stringify(analysis);
}

function simulateWWHAMQuestion(userMessage) {
  // This should return a contextual next question based on what's missing
  const responses = [
    "Thank you for that information. How long have you been experiencing these symptoms?",
    "I understand. Who is this treatment for - yourself or someone else?",
    "That's helpful. Have you tried any treatments or medications for this already?",
    "Got it. Are you currently taking any other medications?",
    "Thanks. Can you tell me a bit more about the specific symptoms you're experiencing?"
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

function simulateSafetyResponse(userMessage) {
  // Always return valid JSON for safety checks
  const safetyResponses = [
    '{"redFlags": [], "urgencyLevel": "routine", "recommendation": "Continue with standard advice"}',
    '{"redFlags": [], "urgencyLevel": "routine", "recommendation": "This appears suitable for self-care"}',
    '{"redFlags": [], "urgencyLevel": "routine", "recommendation": "Over-the-counter treatment may be appropriate"}'
  ];
  
  return safetyResponses[Math.floor(Math.random() * safetyResponses.length)];
}

function simulateGeneralResponse(userMessage) {
  const responses = [
    "I understand how uncomfortable that must be for you. Let me help you find the right treatment.",
    "Thank you for providing those details. Based on what you've told me, I can suggest some appropriate options.",
    "I can see this is bothering you. Let's work together to find something that can help.",
    "That's helpful information. I'll make sure to give you advice that's suitable for your situation."
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

// ---------- Conversation state ----------
// BNF Data Management
let bnfData = null;
// Common synonyms to map user text directly to condition IDs in the dataset
const CONDITION_SYNONYMS = [
  { patterns: [/\bheart\s*burn\b/i, /\bindigestion\b/i, /\bacid\b/i, /\breflux\b/i, /burning.*chest/i], id: 'dyspepsia-heartburn' },
  { patterns: [/\bheadache\b/i, /\btension\b/i], id: 'headache-simple' },
  { patterns: [/\bhay\s*fever\b/i, /allerg(ic|y)|rhinitis/i], id: 'allergic-rhinitis' },
  { patterns: [/\bdiarr(hoea|hea)\b/i, /loose\s*stools?/i], id: 'acute-diarrhoea' },
  { patterns: [/\bsore\s*throat\b/i, /painful\s*swallow/i], id: 'sore-throat-acute' },
  { patterns: [/\b(common\s*cold|blocked\s*nose|congestion)\b/i], id: 'common-cold' }
];

function mapUserConditionTextToId(text) {
  const src = text || '';
  for (const entry of CONDITION_SYNONYMS) {
    for (const re of entry.patterns) {
      if (re.test(src)) return entry.id;
    }
  }
  return null;
}


async function loadBNFData() {
  if (!bnfData) {
    try {
      const response = await fetch('./data/bnf.json');
      bnfData = await response.json();
      console.log('BNF data loaded successfully');
    } catch (error) {
      console.error('Failed to load BNF data:', error);
      bnfData = { conditions: [] }; // Fallback
    }
  }
  return bnfData;
}

function checkAgeRestrictions(medicationClass, age, ageUnit = 'years') {
  if (!medicationClass.age_limits) return { suitable: false, reason: 'No age information available' };
  
  const ageInYears = ageUnit === 'months' ? age / 12 : age;
  
  if (medicationClass.age_limits.min_years && ageInYears < medicationClass.age_limits.min_years) {
    return { 
      suitable: false, 
      reason: `Not suitable for ages under ${medicationClass.age_limits.min_years} years` 
    };
  }
  
  if (medicationClass.age_limits.max_years && ageInYears > medicationClass.age_limits.max_years) {
    return { 
      suitable: false, 
      reason: `Not suitable for ages over ${medicationClass.age_limits.max_years} years` 
    };
  }
  
  return { suitable: true, reason: 'Age appropriate' };
}

// MANDATORY WWHAM QUESTIONS - ALL MUST BE COMPLETED
const WWHAM_SEQUENCE = [
  {
    id: 'who',
    question: 'Who is this medicine for?',
    options: ['Adult (18+)', 'Child (3-17 years)', 'Infant/Toddler (under 3)', 'Pregnant woman', 'Breastfeeding mother'],
    required: true,
    followUp: {
      'Child (3-17 years)': 'exact_age_child',
      'Infant/Toddler (under 3)': 'exact_age_infant'
    }
  },
  {
    id: 'exact_age_child',
    question: 'What is the exact age of the child? (This is crucial for medication dosing)',
    required: true,
    validation: 'age_3_to_17',
    followUp: 'weight_child'
  },
  {
    id: 'exact_age_infant',
    question: 'What is the exact age of the infant/toddler? (Please specify months for under 2 years)',
    required: true,
    validation: 'age_under_3'
  },
  {
    id: 'weight_child',
    question: 'What is the approximate weight of the child? (Required for safe dosing)',
    required: true,
    validation: 'weight_kg'
  },
  {
    id: 'what',
    question: 'What exactly are the symptoms? Please describe them in detail.',
    required: true
  },
  {
    id: 'how_long',
    question: 'How long have these symptoms been present?',
    options: ['Less than 24 hours', '1-3 days', '4-7 days', 'More than 1 week'],
    required: true
  },
  {
    id: 'action_taken',
    question: 'What treatments or medications have already been tried for this condition?',
    required: true
  },
  {
    id: 'current_medications',
    question: 'Are you/they currently taking any other medications, including prescription, over-the-counter, or herbal remedies?',
    required: true
  },
  {
    id: 'allergies',
    question: 'Do you/they have any known allergies to medications?',
    required: true
  },
  {
    id: 'medical_conditions',
    question: 'Do you/they have any existing medical conditions? (e.g., asthma, heart problems, liver/kidney issues)',
    required: true
  }
];

const state = {
  step: 'greet',
  currentWWHAMIndex: 0,
  wwhamComplete: false,
  wwhamAnswers: {},
  condition: null,
  conversationHistory: [],
  awaitingConditionConfirm: false
};

// ---------- AI Agents ----------
const aiTriageAgent = {
  async analyzeSymptoms(userInput) {
    const systemPrompt = `You are a medical triage assistant. Analyze the user's symptom description and extract information.
    Handle spelling mistakes, variations, and informal descriptions.
    
    Extract:
    - Main condition (headache, hay fever, heartburn, diarrhoea, sore throat, or other)
    - Duration if mentioned
    - Who it's for if mentioned
    - Any concerning symptoms
    
    Respond in JSON format with extracted information.`;

    const messages = [{ role: 'user', content: userInput }];
    
    try {
      const response = await callOpenAI(messages, systemPrompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Triage analysis failed:', error);
      return { condition: null, duration: null, who: null, symptoms: userInput, redFlags: [], confidence: 'low' };
    }
  }
};

const aiWWHAMAgent = {
  async askNextQuestion(currentState) {
    const systemPrompt = `You are a helpful pharmacy assistant following WWHAM methodology.
    Ask the next appropriate question based on missing information.
    Be conversational and empathetic.`;

    const messages = [{ role: 'user', content: `Current state: ${JSON.stringify(currentState)}` }];
    
    try {
      const response = await callOpenAI(messages, systemPrompt);
      return response;
    } catch (error) {
      console.error('WWHAM question failed:', error);
      return "Can you tell me a bit more about your symptoms?";
    }
  }
};

const aiSafetyAgent = {
  async checkRedFlags(symptoms, condition, patientInfo) {
    const systemPrompt = `Check for red flag symptoms that require immediate medical attention.
    Look for warning signs based on the condition and symptoms described.
    Respond with ONLY valid JSON in this format:
    {"redFlags": ["list of concerning symptoms"], "urgencyLevel": "routine|urgent|emergency", "recommendation": "advice text"}`;

    const messages = [{ role: 'user', content: `Symptoms: ${symptoms}, Condition: ${condition}, Patient: ${patientInfo}` }];
    
    try {
      const response = await callOpenAI(messages, systemPrompt);
      console.log('Raw safety response:', response);
      
      // Try to extract JSON from response if it's embedded in text
      let jsonMatch = response.match(/\{[^}]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If still no valid JSON, try parsing the whole response
      return JSON.parse(response);
    } catch (error) {
      console.error('Safety check failed:', error);
      // Use simulation for safety check
      return simulateRedFlagCheck(symptoms, condition, patientInfo);
    }
  }
};

function simulateRedFlagCheck(symptoms, condition, patientInfo) {
  const redFlags = [];
  const lowerSymptoms = symptoms?.toLowerCase() || '';
  
  // Check for red flags based on condition and patient type
  if (condition === 'headache') {
    if (/sudden|severe|worst.*life|thunder|neck.*stiff/i.test(lowerSymptoms)) {
      redFlags.push('Sudden severe headache');
    }
    if (/fever|rash|confusion/i.test(lowerSymptoms)) {
      redFlags.push('Headache with fever/rash');
    }
  }
  
  if (condition === 'diarrhoea') {
    if (/blood|black.*stool|severe.*pain/i.test(lowerSymptoms)) {
      redFlags.push('Blood in stool');
    }
    if (patientInfo === 'infant' || patientInfo === 'child') {
      redFlags.push('Diarrhoea in young child - monitor dehydration');
    }
  }
  
  // Age-specific concerns
  if (patientInfo === 'infant') {
    redFlags.push('Medication dosing requires careful consideration for infants');
  }
  
  return {
    redFlags,
    urgencyLevel: redFlags.length > 0 ? 'urgent' : 'routine',
    recommendation: redFlags.length > 0 ? 'Consider seeking medical advice' : 'Continue with standard advice'
  };
}

// Hardcoded WWHAM progression - NO ASSUMPTIONS
function getCurrentWWHAMQuestion() {
  if (state.currentWWHAMIndex >= WWHAM_SEQUENCE.length) {
    return null; // All questions completed
  }
  
  const currentQ = WWHAM_SEQUENCE[state.currentWWHAMIndex];
  
  // Check if we need to follow up based on previous answers
  if (currentQ.id === 'exact_age_child' && state.wwhamAnswers.who !== 'Child (3-17 years)') {
    state.currentWWHAMIndex++;
    return getCurrentWWHAMQuestion();
  }
  
  if (currentQ.id === 'exact_age_infant' && state.wwhamAnswers.who !== 'Infant/Toddler (under 3)') {
    state.currentWWHAMIndex++;
    return getCurrentWWHAMQuestion();
  }
  
  if (currentQ.id === 'weight_child' && !state.wwhamAnswers.exact_age_child) {
    state.currentWWHAMIndex++;
    return getCurrentWWHAMQuestion();
  }
  
  return currentQ;
}

function formatWWHAMQuestion(questionObj) {
  // Return HTML instead of Markdown so bubbles render nicely
  let html = `<div style="line-height:1.5;color:#ffffff;"><strong style="color:#ffffff;font-size:15px;">${questionObj.question}</strong></div>`;

  if (questionObj.options && questionObj.options.length) {
    html += '<div style="margin:12px 0 8px 0;color:#e5e7eb;font-weight:500;">Please choose from:</div>';
    html += '<ol style="margin:8px 0 0 20px;padding:0;color:#ffffff;">';
    questionObj.options.forEach((option) => {
      html += `<li style="margin:4px 0;padding:2px 0;">${option}</li>`;
    });
    html += '</ol><div style="margin-top:8px;color:#d1d5db;font-style:italic;">Or describe in your own words.</div>';
  }

  if (questionObj.required) {
    html += '<div style="margin-top:12px;padding:8px;background:#fef3c7;border-radius:6px;color:#92400e;font-style:italic;font-size:13px;">This information is mandatory for safety reasons.</div>';
  }

  return html;
}

function validateWWHAMAnswer(questionId, answer) {
  const question = WWHAM_SEQUENCE.find(q => q.id === questionId);
  if (!question.validation) return { valid: true };
  
  const lowerAnswer = answer.toLowerCase();
  
  switch (question.validation) {
    case 'age_3_to_17':
      const ageMatch = answer.match(/(\d+)/);
      if (ageMatch) {
        const age = parseInt(ageMatch[1]);
        if (age >= 3 && age <= 17) return { valid: true };
        return { valid: false, message: 'Age must be between 3 and 17 years' };
      }
      return { valid: false, message: 'Please provide a valid age' };
      
    case 'age_under_3':
      if (/month|week|day/.test(lowerAnswer) || /[0-2]/.test(answer)) {
        return { valid: true };
      }
      return { valid: false, message: 'Please specify age in months for children under 3' };
      
    case 'weight_kg':
      if (/\d+/.test(answer) && (/kg|kilo|pound|lb|stone/.test(lowerAnswer) || /^\d+$/.test(answer))) {
        return { valid: true };
      }
      return { valid: false, message: 'Please provide weight (e.g., "25kg" or "15 pounds")' };
      
    default:
      return { valid: true };
  }
}

// Helper to detect non-answers
function isNonAnswer(text) {
  const t = (text || '').trim().toLowerCase();
  return !t || t === 'no' || t === 'none' || t === 'n/a' || t === 'na' || t === 'nothing' || t === 'nil';
}

function normalizeWhoAnswer(text) {
  const t = (text || '').trim().toLowerCase();
  if (!t) return text;
  if (/^adult|\bme\b|myself|i\b/.test(t)) return 'Adult (18+)';
  if (/^child|kid|son|daughter|children|teen|teenager|adolescent/.test(t)) return 'Child (3-17 years)';
  if (/infant|baby|newborn|toddler|under\s*3|under three/.test(t)) return 'Infant/Toddler (under 3)';
  if (/pregnan/.test(t)) return 'Pregnant woman';
  if (/breastfeed|nursing/.test(t)) return 'Breastfeeding mother';
  return text;
}

function identifyConditionFromSymptoms(text) {
  if (!bnfData || !bnfData.conditions) return null;

  const src = text || '';
  const lowerText = src.toLowerCase();

  // First, try direct synonym map to known dataset IDs
  const mappedId = mapUserConditionTextToId(src);
  if (mappedId) {
    const match = bnfData.conditions.find(c => c.id === mappedId);
    if (match) return match;
  }

  for (const condition of bnfData.conditions) {
    for (const keyword of condition.symptom_keywords || []) {
      const kw = (keyword || '').toLowerCase();
      // Simple contains
      if (lowerText.includes(kw)) return condition;
      // Flexible match: allow words in between (e.g., "burning chest" vs "burning in my chest")
      const pattern = kw.replace(/\s+/g, '.*');
      const re = new RegExp(pattern, 'i');
      if (re.test(src)) return condition;
    }
    // Also match by condition name tokens (e.g., "heartburn" within name)
    if ((condition.name || '').toLowerCase().includes(lowerText.trim()) && lowerText.trim().length > 3) {
      return condition;
    }
  }
  return null;
}

async function proceedToSafetyAndRecommendations(typingElement) {
  console.log('All WWHAM questions completed. Checking safety...');
  console.log('WWHAM Answers:', state.wwhamAnswers);
  
  await loadBNFData();
  // If condition is still unknown, try one more identification pass from the described symptoms
  if (!state.condition) {
    const symptomText = state.wwhamAnswers.symptoms_described || state.wwhamAnswers.what || '';
    if (symptomText) {
    const cond = identifyConditionFromSymptoms(symptomText);
      if (cond) {
        state.condition = cond.id;
        console.log('Late-identified condition:', cond.name);
      }
    }
  }
  console.log('Condition before recommendations:', state.condition);
  
  // Check red flags
  const redFlags = checkRedFlags();
  if (redFlags.length > 0) {
    const flagMessages = redFlags.map(flag => `<li>⚠️ ${flag.text} — ${flag.rationale}</li>`).join('');
    replaceTyping(typingElement, `
      <div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:12px;padding:16px;margin:8px 0;">
        <h3 style="color:#dc2626;margin:0 0 12px 0;font-size:16px;font-weight:600;">⚠️ Important safety alert</h3>
        <ul style="margin:0 0 12px 18px;color:#991b1b;">${flagMessages}</ul>
        <div style="padding:8px;background:#ffffff;border-radius:6px;border:1px solid #fca5a5;">
          <span style="font-weight:600;color:#dc2626;">Recommendation:</span> 
          <span style="color:#7f1d1d;">${redFlags[0].refer_to}. Please seek medical attention as advised above.</span>
        </div>
      </div>
    `);
    return;
  }
  
  // Generate medication recommendations
  const recommendations = generateMedicationRecommendations();
  console.log('Recommendations count:', recommendations.length);
  if (recommendations.length === 0) {
  const known = (bnfData?.conditions || []).map(c => c.name).slice(0, 6);
    const suggest = known.length ? `<br><br>Examples: <em>${known.join(', ')}</em>` : '';
    replaceTyping(typingElement, `
      <div style="padding:16px;background:#f8fafc;border-radius:12px;border:2px solid #e2e8f0;">
        <div style="margin-bottom:12px;color:#374151;font-weight:500;">
          I couldn't determine a suitable over-the-counter option with the current details. To help me recommend safely, could you confirm the main problem you're treating?
        </div>
        ${suggest ? `<div style="margin-top:12px;padding:8px;background:#ffffff;border-radius:6px;">
          <span style="color:#6b7280;font-weight:500;">Examples:</span> 
          <div style="color:#059669;font-style:italic;margin-top:4px;">${known.join(', ')}</div>
        </div>` : ''}
      </div>
    `);
  // Expect the next user message to clarify condition explicitly
  state.awaitingConditionConfirm = true;
  state.step = 'wwham';
    return;
  }
  
  let response = `<h3 style="color:#059669;margin:0 0 12px 0;font-size:18px;font-weight:600;">💊 Medication recommendations</h3>`;
  recommendations.forEach((rec, index) => {
    response += `<div style="background:#ffffff;border:2px solid #d1fae5;border-radius:12px;padding:16px;margin:12px 0;box-shadow:0 2px 4px rgba(0,0,0,0.1);">`;
    response += `<h4 style="color:#065f46;margin:0 0 8px 0;font-size:16px;font-weight:600;">${index + 1}. ${rec.name}</h4>`;
    response += `<div style="margin:8px 0;"><span style="font-weight:600;color:#374151;">Age suitability:</span> <span style="color:#059669;">${rec.ageSuitability}</span></div>`;
    response += `<div style="margin:8px 0;"><span style="font-weight:600;color:#374151;">Dosage:</span> <span style="color:#1f2937;">${rec.dosage}</span></div>`;
    if (rec.rationale) response += `<div style="margin:8px 0;padding:8px;background:#f0fdf4;border-radius:6px;color:#166534;font-style:italic;">${rec.rationale}</div>`;
    if (rec.warnings?.length) response += `<div style="margin:8px 0;padding:8px;background:#fef3c7;border-radius:6px;"><span style="font-weight:600;color:#92400e;">Important notes:</span> <span style="color:#b45309;">${rec.warnings.join(', ')}</span></div>`;
    response += `</div>`;
  });
  response += `<div style="margin:16px 0;padding:12px;background:#f0f9ff;border:2px solid #0ea5e9;border-radius:8px;">
    <p style="margin:0;color:#0c4a6e;font-weight:600;font-size:14px;">⚠️ Always read the patient information leaflet and follow the instructions on the packaging.</p>
  </div>`;
  replaceTyping(typingElement, response);
  state.step = 'complete';
}

function checkRedFlags() {
  const redFlags = [];
  
  if (!state.condition || !bnfData) return redFlags;
  
  const condition = bnfData.conditions.find(c => c.id === state.condition);
  if (!condition || !condition.red_flags) return redFlags;
  
  const symptoms = state.wwhamAnswers.symptoms_described?.toLowerCase() || '';
  const duration = state.wwhamAnswers.how_long || '';
  const who = state.wwhamAnswers.who || '';
  
  for (const flag of condition.red_flags) {
    // Check various red flag conditions
    if (flag.id === 'thunderclap' && /sudden|severe|worst|thunder/i.test(symptoms)) {
      redFlags.push(flag);
    }
    if (flag.id === 'neurological_deficit' && /weakness|confusion|collapse|slurred|vision|seizure/i.test(symptoms)) {
      redFlags.push(flag);
    }
    if (flag.id === 'head_injury' && /injury|hit|bang|fell/i.test(symptoms)) {
      redFlags.push(flag);
    }
    if (flag.id === 'meningism' && /fever|neck.*stiff|photophobia|rash/i.test(symptoms)) {
      redFlags.push(flag);
    }
    if (flag.id === 'pregnancy_severe' && who.includes('Pregnant') && /severe|new/i.test(symptoms)) {
      redFlags.push(flag);
    }
    if (flag.id === 'progressive' && /weeks|month|months|persistent|worsening/i.test(duration)) {
      redFlags.push(flag);
    }
  }
  return redFlags;
}

function generateMedicationRecommendations() {
  const recommendations = [];
  
  // Try to infer the condition late if still missing
  if ((!state.condition) && bnfData) {
    const symptomText = state.wwhamAnswers.symptoms_described || state.wwhamAnswers.what || '';
    if (symptomText) {
      const cond = identifyConditionFromSymptoms(symptomText);
      if (cond) {
        state.condition = cond.id;
        console.log('Inferred condition in recommendations():', cond.name);
      }
    }
  }

  if (!state.condition || !bnfData) return recommendations;
  
  const condition = bnfData.conditions.find(c => c.id === state.condition);
  if (!condition || !condition.options) return recommendations;
  
  const who = state.wwhamAnswers.who || '';
  const age = extractAgeFromAnswers();
  const allergies = state.wwhamAnswers.allergies?.toLowerCase() || '';
  const conditions = state.wwhamAnswers.medical_conditions?.toLowerCase() || '';
  const currentMeds = state.wwhamAnswers.current_medications?.toLowerCase() || '';
  
  for (const option of condition.options) {
    const ageCheck = checkAgeRestrictions(option, age.value, age.unit);
    
    if (!ageCheck.suitable) {
      console.log(`${option.class_name} not suitable: ${ageCheck.reason}`);
      continue;
    }
    
    // Check pregnancy/breastfeeding
    if (who.includes('Pregnant') && option.pregnancy?.suitability === 'avoid') {
      console.log(`${option.class_name} not suitable for pregnancy`);
      continue;
    }
    
    if (who.includes('Breastfeeding') && option.breastfeeding?.suitability === 'avoid') {
      console.log(`${option.class_name} not suitable for breastfeeding`);
      continue;
    }
    
    // Check contraindications
    let contraindicated = false;
    for (const contraindication of option.contraindications || []) {
      if (conditions.includes(contraindication.toLowerCase()) || 
          allergies.includes(contraindication.toLowerCase())) {
        contraindicated = true;
        break;
      }
    }
    
    if (contraindicated) {
      console.log(`${option.class_name} contraindicated`);
      continue;
    }
    
    // If we get here, medication is suitable
    recommendations.push({
      name: option.class_name,
      ageSuitability: ageCheck.reason,
      dosage: option.dose_adult || 'See package instructions',
      rationale: option.why?.join(' ') || option.typical_use,
      warnings: [...(option.self_care || []), ...(option.interactions_flags || [])],
      products: option.example_products || []
    });
  }
  
  return recommendations;
}

function extractAgeFromAnswers() {
  const childAge = state.wwhamAnswers.exact_age_child;
  const infantAge = state.wwhamAnswers.exact_age_infant;
  const who = state.wwhamAnswers.who || '';
  
  if (childAge) {
    const ageMatch = childAge.match(/(\d+)/);
    return { value: ageMatch ? parseInt(ageMatch[1]) : 10, unit: 'years' };
  }
  
  if (infantAge) {
    if (/month/i.test(infantAge)) {
      const ageMatch = infantAge.match(/(\d+)/);
      return { value: ageMatch ? parseInt(ageMatch[1]) : 12, unit: 'months' };
    } else {
      const ageMatch = infantAge.match(/(\d+)/);
      return { value: ageMatch ? parseInt(ageMatch[1]) : 2, unit: 'years' };
    }
  }
  
  if (/adult/i.test(who)) {
    return { value: 25, unit: 'years' }; // Default adult age
  }
  
  return { value: 0, unit: 'years' };
}

function greet() {
  addMsg('bot', `
    <div style="line-height:1.6;color:#ffffff;">
      <p style="margin:0 0 12px 0;font-size:16px;color:#ffffff;">Hi! I'm here to help you find the right over-the-counter treatment.</p>
      <p style="margin:0 0 12px 0;color:#e5e7eb;">I will need to ask a few important questions following the WWHAM protocol to ensure safe recommendations.</p>
      <div style="margin:12px 0;padding:12px;background:#1e3a8a;border-radius:8px;border-left:4px solid #3b82f6;">
        <strong style="color:#ffffff;font-size:15px;">Please describe what symptoms you're experiencing:</strong>
      </div>
    </div>
  `);
  state.step = 'initial';
}

async function handleGeneralResponse(text, typingElement) {
  replaceTyping(typingElement, "I'm here to help with medication advice. Please describe your symptoms so we can start the consultation process.");
}

async function handleRecommendationQuestions(text, typingElement) {
  replaceTyping(typingElement, "Thank you for that information. Is there anything else you'd like to know about the recommended medications?");
}

async function handleUserInput(text) {
  if (!text.trim()) return;
  
  console.log('📝 User input:', text);
  console.log('Current WWHAM index:', state.currentWWHAMIndex);
  console.log('Current state:', state);
  
  addMsg('user', text);
  state.conversationHistory.push({ role: 'user', content: text });
  
  const t = addTyping();
  
  try {
    if (state.step === 'initial') {
      await handleInitialSymptomInput(text, t);
    } else if (state.step === 'wwham') {
      await handleWWHAMInput(text, t);
    } else if (state.step === 'safety') {
      await handleSafetyCheck(text, t);
    } else if (state.step === 'recommendations') {
      await handleRecommendationQuestions(text, t);
    } else {
      await handleGeneralResponse(text, t);
    }
  } catch (error) {
    console.error('Error handling input:', error);
    replaceTyping(t, "I'm sorry, I'm having trouble processing that. Could you try rephrasing?");
  }
}

async function handleInitialSymptomInput(text, typingElement) {
  // Identify condition from symptoms
  await loadBNFData();
  
  const condition = identifyConditionFromSymptoms(text);
  if (condition) {
    state.condition = condition.id;
    console.log('Identified condition:', condition.name);
  }
  
  // Start mandatory WWHAM sequence
  state.step = 'wwham';
  state.currentWWHAMIndex = 0;
  state.wwhamAnswers.symptoms_described = text;
  
  const firstQuestion = getCurrentWWHAMQuestion();
  const questionText = formatWWHAMQuestion(firstQuestion);
  
  replaceTyping(typingElement, `I understand you're experiencing: "${text}"\n\nTo provide safe medication advice, I need to ask several important questions. Let's start:\n\n${questionText}`);
}

async function handleWWHAMInput(text, typingElement) {
  const currentQ = getCurrentWWHAMQuestion();
  if (!currentQ) {
    // If we're specifically waiting for condition confirmation, try to map it now
    if (state.awaitingConditionConfirm) {
      await loadBNFData();
      // Try synonyms first
      const mappedId = mapUserConditionTextToId(text);
      let cond = null;
      if (mappedId) {
        cond = bnfData.conditions.find(c => c.id === mappedId) || null;
      }
      if (!cond) {
        cond = identifyConditionFromSymptoms(text);
      }
      if (cond) {
        state.condition = cond.id;
        state.awaitingConditionConfirm = false;
        console.log('Condition confirmed by user as:', cond.name);
        // Proceed straight to safety/recommendations
        await proceedToSafetyAndRecommendations(typingElement);
        return;
      }
      // Ask again with explicit options if not found
      const names = (bnfData?.conditions || []).map(c => c.name).slice(0, 8);
      replaceTyping(typingElement, `I couldn't match that. Please type one of: <br><em>${names.join(', ')}</em>`);
      return;
    }
    // All WWHAM questions completed
    state.wwhamComplete = true;
    state.step = 'safety';
    await proceedToSafetyAndRecommendations(typingElement);
    return;
  }
  
  // Validate the answer
  let validation = validateWWHAMAnswer(currentQ.id, text);
  // Ensure symptom description is not a non-answer
  if (currentQ.id === 'what' && isNonAnswer(text)) {
    validation = { valid: false, message: 'Please describe the main symptoms in a few words.' };
  }
  if (!validation.valid) {
    replaceTyping(typingElement, `${validation.message}\n\n${formatWWHAMQuestion(currentQ)}`);
    return;
  }
  
  // Store the answer
  if (currentQ.id === 'who') {
    state.wwhamAnswers[currentQ.id] = normalizeWhoAnswer(text);
  } else {
    state.wwhamAnswers[currentQ.id] = text;
  }
  console.log('Stored WWHAM answer:', currentQ.id, '=', text);
  
  // Move to next question
  state.currentWWHAMIndex++;
  
  const nextQ = getCurrentWWHAMQuestion();
  if (nextQ) {
    const questionText = formatWWHAMQuestion(nextQ);
    replaceTyping(typingElement, `Thank you. ${questionText}`);
  } else {
    // All questions completed
    state.wwhamComplete = true;
    state.step = 'safety';
    await proceedToSafetyAndRecommendations(typingElement);
  }
}

async function handleSymptomAnalysis(text, typingElement) {
  console.log('🔍 Analyzing symptoms:', text);
  console.log('Current state before analysis:', state);
  
  // Use AI to analyze symptoms
  const analysis = await aiTriageAgent.analyzeSymptoms(text);
  console.log('AI analysis result:', analysis);
  
  // Update state with extracted information
  if (analysis.condition) {
    state.condition = analysis.condition;
    console.log('Set condition to:', analysis.condition);
  }
  if (analysis.duration) {
    state.duration = analysis.duration;
    console.log('Set duration to:', analysis.duration);
  }
  if (analysis.who) {
    state.who = analysis.who;
    console.log('Set who to:', analysis.who);
  }
  if (analysis.symptoms) {
    state.what = analysis.symptoms;
    console.log('Set symptoms to:', analysis.symptoms);
  }
  
  console.log('State after analysis update:', state);
  
  // Check what information is still needed
  const missing = [];
  if (!state.who) missing.push('who');
  if (!state.duration) missing.push('duration');
  if (!state.condition) missing.push('condition');
  if (!state.action) missing.push('previous treatments');
  if (!state.meds) missing.push('current medications');
  
  // Age-specific requirements - be more comprehensive
  if (state.who === 'child' || state.who === 'infant' || state.who === 'teen') {
    if (!state.age) missing.push('age');
    if (!state.weight && (state.who === 'child' || state.who === 'teen')) missing.push('weight');
  }
  
  // Also ask for age verification for adults taking certain medications
  if (state.who === 'adult' && !state.ageVerified && (state.condition === 'headache' || state.condition === 'diarrhoea')) {
    missing.push('age_verification');
  }
  
  console.log('Missing information:', missing);
  
  if (missing.length === 0) {
    console.log('✅ All information collected, proceeding to safety check');
    state.step = 'safety';
    await proceedToSafety(typingElement);
  } else {
    console.log('❓ Missing info detected, moving to WWHAM step');
    state.step = 'wwham';
    const nextQuestion = await aiWWHAMAgent.askNextQuestion(state);
    console.log('Next WWHAM question:', nextQuestion);
    replaceTyping(typingElement, nextQuestion);
  }
}

async function handleWWHAMResponse(text, typingElement) {
  // Extract information from response more intelligently
  const lowerText = text.toLowerCase();
  
  console.log('Processing WWHAM response:', text);
  console.log('Current state before processing:', state);
  
  // Update state based on response - be more aggressive in extraction
  if (!state.who) {
    if (/\b(me|myself|i am|i'm|my|mine)\b/i.test(text)) {
      state.who = 'adult';
      console.log('Set who to adult (self-reference)');
    } else if (/\b(child|kid|daughter|son|children)\b/i.test(text)) {
      state.who = 'child';
      console.log('Set who to child');
    } else if (/\b(baby|infant|newborn)\b/i.test(text)) {
      state.who = 'infant';
      console.log('Set who to infant');
    } else if (/\b(teen|teenager|adolescent|13|14|15|16|17)\b/i.test(text)) {
      state.who = 'teen';
      console.log('Set who to teen');
    } else if (/\b(pregnant|expecting|pregnancy)\b/i.test(text)) {
      state.who = 'pregnant';
      console.log('Set who to pregnant');
    } else if (/\b(breastfeeding|nursing|breast.*feed)\b/i.test(text)) {
      state.who = 'breastfeeding';
      console.log('Set who to breastfeeding');
    }
  }
  
  if (!state.duration) {
    if (/\b(hour|hours|today|this morning|just now|just started)\b/i.test(text)) {
      state.duration = '< 24 hours';
      console.log('Set duration to < 24 hours');
    } else if (/\b(yesterday|1 day|one day|day ago|since yesterday)\b/i.test(text)) {
      state.duration = '1–3 days';
      console.log('Set duration to 1-3 days');
    } else if (/\b(2|3|two|three).*(day|days)\b/i.test(text)) {
      state.duration = '1–3 days';
      console.log('Set duration to 1-3 days (2-3 days)');
    } else if (/\b(4|5|6|7|four|five|six|seven).*(day|days)|week|weekly\b/i.test(text)) {
      state.duration = '4–7 days';
      console.log('Set duration to 4-7 days');
    } else if (/\b(weeks|months|long.*time|chronic|ongoing)\b/i.test(text)) {
      state.duration = '> 7 days';
      console.log('Set duration to > 7 days');
    }
  }
  
  if (!state.action && /\b(taken|tried|used|had|take|took|paracetamol|ibuprofen|medicine|medication|pills?|tablets?)\b/i.test(text)) {
    state.action = text;
    console.log('Set action taken:', text);
  }
  
  if (!state.meds && /\b(medication|medicine|pills?|tablets?|drugs?|prescr|taking|on)\b/i.test(text)) {
    state.meds = text;
    console.log('Set current medications:', text);
  }
  
  // Extract age information
  if (!state.age && (state.who === 'child' || state.who === 'infant' || state.who === 'teen')) {
    const ageMatch = text.match(/\b(\d+)\s*(year|month|week|day)s?\s*old\b/i) || 
                     text.match(/\b(\d+)\s*(yr|yrs|mo|mos|wk|wks)\b/i) ||
                     text.match(/\b(newborn|infant|toddler|preschool)\b/i);
    
    if (ageMatch) {
      state.age = ageMatch[0];
      console.log('Set age:', state.age);
    } else if (/\b(\d+)\b/.test(text) && state.who === 'child') {
      // If just a number is mentioned and we're asking about a child, assume it's age in years
      const numberMatch = text.match(/\b(\d+)\b/);
      if (numberMatch && parseInt(numberMatch[1]) <= 18) {
        state.age = `${numberMatch[1]} years old`;
        console.log('Set age (assumed years):', state.age);
      }
    }
  }
  
  // Age verification for adults
  if (state.who === 'adult' && !state.ageVerified) {
    if (/\b(18|19|20|21|22|23|24|25|26|27|28|29|30|over.*18|adult|grown.*up)\b/i.test(text) || 
        /\b(yes|confirm|verified|i.*am|18.*older|over.*eighteen)\b/i.test(text)) {
      state.ageVerified = true;
      console.log('Age verification confirmed for adult');
    }
  }
  
  // Extract weight information for children
  if (!state.weight && state.who === 'child' && /\b(\d+)\s*(kg|kilo|pound|lb|stone)\b/i.test(text)) {
    const weightMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(kg|kilo|pound|lb|stone)\b/i);
    if (weightMatch) {
      state.weight = weightMatch[0];
      console.log('Set weight:', state.weight);
    }
  }
  
  console.log('Updated state after processing:', state);
  
  // Check if we have enough information - be more lenient for basic info, strict for safety
  const basicMissing = [];
  if (!state.who) basicMissing.push('who');
  if (!state.duration) basicMissing.push('duration');
  if (!state.condition) basicMissing.push('condition');
  
  const criticalMissing = [];
  if (state.who === 'child' || state.who === 'infant' || state.who === 'teen') {
    if (!state.age) criticalMissing.push('age');
    if (!state.weight && (state.who === 'child' || state.who === 'teen')) criticalMissing.push('weight');
  }
  
  // Age verification for adults
  if (state.who === 'adult' && !state.ageVerified) {
    criticalMissing.push('age_verification');
  }
  
  console.log('Basic missing:', basicMissing);
  console.log('Critical missing (age-specific):', criticalMissing);
  
  const allMissing = [...basicMissing, ...criticalMissing];
  
  if (allMissing.length === 0) {
    console.log('All WWHAM info collected, proceeding to safety check');
    state.step = 'safety';
    await proceedToSafety(typingElement);
  } else {
    // Ask the next most important missing piece
    let nextQuestion = '';
    
    if (!state.who) {
      nextQuestion = "Thanks for that information. Who is this for - yourself, a child, or someone else?";
    } else if (!state.duration) {
      nextQuestion = "I understand. How long have you been experiencing this? For example, did it start today, yesterday, or has it been going on for longer?";
    } else if (!state.condition) {
      nextQuestion = "Got it. Can you help me understand what's the main problem? Is it a headache, stomach issue, or something else?";
    } else if ((state.who === 'child' || state.who === 'infant' || state.who === 'teen') && !state.age) {
      nextQuestion = `Important: What is the ${state.who === 'infant' ? 'baby' : state.who}'s age? This is crucial for determining the right medication and dosage.`;
    } else if (state.who === 'adult' && !state.ageVerified) {
      nextQuestion = "For safety and legal reasons, I need to confirm you are 18 or older. Can you please confirm your age?";
    } else if (state.who === 'child' && !state.weight) {
      nextQuestion = "For safety with children's medication, could you tell me their approximate weight? This helps ensure the correct dosage.";
    } else {
      // Fallback - ask for any missing WWHAM info
      nextQuestion = "Just to make sure I have everything, have you tried any treatments or medications for this?";
    }
    
    console.log('Asking next question:', nextQuestion);
    replaceTyping(typingElement, nextQuestion);
  }
}

async function proceedToSafety(typingElement) {
  const safetyCheck = await aiSafetyAgent.checkRedFlags(state.what, state.condition, state.who);
  
  if (safetyCheck.urgencyLevel === 'immediate') {
    replaceTyping(typingElement, `⚠️ <strong>Important:</strong> Based on your symptoms, you should seek immediate medical attention. ${safetyCheck.recommendation}
    
    Please contact:
    • 999 for emergency
    • NHS 111 for urgent advice
    • Your local A&E department`);
    return;
  }
  
  if (safetyCheck.urgencyLevel === 'urgent') {
    replaceTyping(typingElement, `⚠️ <strong>Caution:</strong> Your symptoms suggest you should see a healthcare professional soon. ${safetyCheck.recommendation}
    
    I can still provide some general advice, but please consider contacting your GP or NHS 111.`);
  }
  
  // Proceed to generate medication advice
  state.step = 'advice';
  setTimeout(() => generateMedicationAdvice(typingElement), 1000);
}

async function handleSafetyCheck(text, typingElement) {
  await proceedToSafety(typingElement);
}

function generateMedicationAdvice(typingElement) {
  try {
    const result = window.Engine?.evaluate({
      condition: state.condition,
      who: state.who,
      what: state.what,
      duration: state.duration,
      meds: state.meds,
      answers: state.answers
    });
    
    if (!result || !result.advice?.length) {
      replaceTyping(typingElement, 'I apologize, but I cannot generate specific medication recommendations right now. Please consult with a pharmacist for personalized advice.');
      return;
    }
    
    let advice = `<h3 style="color: #2563eb; margin: 0 0 12px 0;">💊 Recommended Treatment</h3>`;
    advice += `<p>Based on our conversation, here's what I recommend for <strong>${state.condition}</strong>:</p>`;
    
    result.advice.forEach((med) => {
      advice += `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 8px 0;">`;
      advice += `<h4 style="color: #1e40af; margin: 0 0 6px 0;">${med.name}</h4>`;
      if (med.ingredient) advice += `<p style="margin: 4px 0;"><strong>Active ingredient:</strong> ${med.ingredient}</p>`;
      if (med.description) advice += `<p style="margin: 4px 0;"><em>${med.description}</em></p>`;
      if (med.dosage) advice += `<p style="margin: 4px 0;"><strong>Dosage:</strong> ${med.dosage}</p>`;
      advice += `</div>`;
    });
    
    if (result.generalTiming?.length) {
      advice += `<h4 style="color: #059669; margin: 12px 0 6px 0;">⏰ When to Take</h4><ul style="margin: 4px 0; padding-left: 16px;">`;
      result.generalTiming.forEach(item => advice += `<li style="margin: 2px 0;">${item}</li>`);
      advice += `</ul>`;
    }
    
    if (result.administration?.length) {
      advice += `<h4 style="color: #0891b2; margin: 12px 0 6px 0;">📋 How to Take</h4><ul style="margin: 4px 0; padding-left: 16px;">`;
      result.administration.forEach(item => advice += `<li style="margin: 2px 0;">${item}</li>`);
      advice += `</ul>`;
    }
    
    if (result.warnings?.length) {
      advice += `<h4 style="color: #dc2626; margin: 12px 0 6px 0;">⚠️ Important Warnings</h4><ul style="margin: 4px 0; padding-left: 16px;">`;
      result.warnings.forEach(item => advice += `<li style="margin: 2px 0; color: #dc2626;">${item}</li>`);
      advice += `</ul>`;
    }
    
    advice += `<div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 12px; margin: 12px 0;">
      <p style="margin: 0; color: #0c4a6e;"><strong>Need more help?</strong> Feel free to ask me any questions about these recommendations, or start a new consultation anytime.</p>
    </div>`;
    
    replaceTyping(typingElement, advice);
    
  } catch (error) {
    console.error('Error generating advice:', error);
    replaceTyping(typingElement, 'I apologize, but I cannot generate specific recommendations right now. Please consult with a pharmacist.');
  }
}

// ---------- Events ----------
document.addEventListener('DOMContentLoaded', function() {
  // Check if elements exist
  if (!messagesEl || !inputEl || !formEl || !restartEl) {
    console.error('Required DOM elements not found');
    return;
  }

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = (inputEl.value || '').trim();
    if (!text) return;
    inputEl.value = '';
    handleUserInput(text);
  });

  document.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      handleUserInput(btn.dataset.chip);
    });
  });

  restartEl.addEventListener('click', () => {
    // Reset state to initial values
    state.step = 'greet';
    state.currentWWHAMIndex = 0;
    state.wwhamComplete = false;
    state.wwhamAnswers = {};
    state.condition = null;
    state.conversationHistory = [];
    messagesEl.innerHTML = '';
    greet();
  });

  // Start the conversation
  greet();
});