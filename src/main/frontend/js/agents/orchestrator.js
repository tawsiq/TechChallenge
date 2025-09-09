// Enhanced agent framework with Claude AI integration
// Usage: const engine = new Orchestrator({ providers: [...] })
// Then call: engine.handle(text, ctx)

(function () {
  class AgentContext {
    constructor(init = {}) {
      Object.assign(this, init);
      this.conversationHistory = [];
      this.medicalContext = {};
    }

    addToHistory(role, content) {
      this.conversationHistory.push({ role, content, timestamp: new Date() });
    }

    updateMedicalContext(data) {
      Object.assign(this.medicalContext, data);
    }
  }

  class BaseAgent {
    constructor(name) { this.name = name; }
    canHandle(_text, _ctx) { return false; }
    async handle(_text, _ctx) { return { reply: null }; }
  }

  class GreetingAgent extends BaseAgent {
    constructor() { super('greeting'); }
    canHandle(text) {
      return /^(hi|hello|hey|good\s*(morning|afternoon|evening))\b/i.test(text.trim());
    }
    async handle(text, ctx) {
      const name = ctx.userName || 'there';
      return { reply: `Hi ${name}! How can I help today?` };
    }
  }

  class DurationAgent extends BaseAgent {
    constructor() { super('duration'); }
    canHandle(text, ctx) {
      // If we are expecting a duration, or we can infer one, handle it
      return ctx.awaiting === 'duration' || /(\d+)\s*(d|day|days)\b/i.test(text);
    }
    async handle(text, ctx) {
      const m = text.match(/(\d+)\s*(d|day|days)?/i);
      if (!m) return { reply: 'Please enter a number of days, e.g., 3.' };
      const days = parseInt(m[1], 10);
      ctx.durationDays = days;
      ctx.awaiting = null;

      // If the WWHAM duration input exists, sync it
      const durInput = document.getElementById('ww_howlong');
      if (durInput) {
        durInput.value = String(days);
        // If a Next button is visible in this step, try to enable it
        const stepEl = durInput.closest('[data-step]');
        const nextBtn = stepEl?.querySelector('.next');
        if (nextBtn) nextBtn.disabled = false;
      }
      return { reply: `Got it — ${days} day(s).` };
    }
  }

  class ExplanationAgent extends BaseAgent {
    constructor() {
      super('explanation');
    }

    canHandle(text, ctx) {
      return text.toLowerCase().includes('why') || 
             text.toLowerCase().includes('how come') ||
             text.toLowerCase().includes('explain') ||
             ctx.awaiting === 'explanation';
    }

    async handle(text, ctx) {
      const condition = ctx.condition;
      const recommendations = ctx.recommendations || [];
      
      if (!condition || !recommendations.length) {
        return { 
          reply: "I don't have enough context to explain the recommendations. Please complete the symptom check first." 
        };
      }

      // Generate explanation based on condition and recommendations
      const explanation = this.generateExplanation(condition, recommendations, ctx);
      
      return {
        reply: explanation,
        metadata: {
          type: 'explanation',
          condition: condition,
          recommendations: recommendations
        }
      };
    }

    generateExplanation(condition, recommendations, ctx) {
      const explanations = [];
      
      // Explain recommended medications
      recommendations.forEach(rec => {
        if (rec.suitable) {
          explanations.push(`✅ ${rec.name} is recommended because:
          • ${rec.reasoning.join('\n• ')}`);
        } else {
          explanations.push(`❌ ${rec.name} is not recommended because:
          • ${rec.reasoning.join('\n• ')}`);
        }
      });

      // Add condition-specific advice
      if (ctx.selfCareAdvice) {
        explanations.push("\nSelf-care tips for your condition:\n" + 
          ctx.selfCareAdvice.map(tip => `• ${tip}`).join('\n'));
      }

      // Add relevant cautions
      if (ctx.cautions && ctx.cautions.length) {
        explanations.push("\nImportant considerations:\n" +
          ctx.cautions.map(caution => `⚠️ ${caution}`).join('\n'));
      }

      return explanations.join('\n\n');
    }
}

class BNFAgent extends BaseAgent {
    constructor(bnfProvider) {
      super('bnf');
      this.bnfProvider = bnfProvider; // async () => dataset
      this.cache = null;
    }
    async load() {
      if (this.cache) return this.cache;
      try {
        this.cache = await this.bnfProvider();
      } catch (e) {
        this.cache = null;
      }
      return this.cache;
    }
    canHandle(text) {
      // Heuristic: medicine names detected by presence in BNF data (if loaded)
      return /dose|dosage|how\s+much|can\s+i\s+take|medicine|medication|tablet|mg/i.test(text);
    }
    async handle(text, _ctx) {
      const data = await this.load();
      if (!data) {
        return { reply: 'I can discuss medicines if BNF data is available.' };
      }

      const q = text.toLowerCase();
      // naive search across keys and common fields
      const hits = [];
      for (const k of Object.keys(data)) {
        const item = data[k];
        const hay = JSON.stringify(item).toLowerCase();
        if (q.includes(k.toLowerCase()) || hay.includes(q)) {
          hits.push({ key: k, item });
          if (hits.length >= 3) break;
        }
      }
      if (!hits.length) {
        return { reply: 'I couldn’t match that to a medicine in the BNF data.' };
      }

      const brief = hits.map(h => `• ${h.key}`).join('\n');
      return { reply: `Here’s what I found related to your query:\n${brief}` };
    }
  }

  class ClaudeAgent extends BaseAgent {
    constructor() {
      super('claude');
    }

    canHandle(text, ctx) {
      // Claude can handle any medical query
      return true;
    }

    async handle(text, ctx) {
      ctx.addToHistory('user', text);
      
      try {
        // Construct prompt with conversation history and medical context
        const prompt = this.constructPrompt(text, ctx);
        
        // Process through Claude API (simulated for now)
        const response = await this.processWithClaude(prompt);
        
        ctx.addToHistory('assistant', response);
        
        return { 
          reply: response,
          suggestions: this.generateSuggestions(text, response)
        };
      } catch (error) {
        console.error('Claude API error:', error);
        return { 
          reply: "I apologize, but I'm having trouble processing your request. Could you try rephrasing it?" 
        };
      }
    }

    constructPrompt(text, ctx) {
      const history = ctx.conversationHistory
        .slice(-5) // Last 5 messages for context
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const medicalContext = Object.entries(ctx.medicalContext)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

      return `
Medical Context:
${medicalContext}

Conversation History:
${history}

Current Query: ${text}

Please provide a clear, accurate medical response based on UK healthcare standards.
`;
    }

    async processWithClaude(prompt) {
      // In a real implementation, this would call the Claude API
      // For now, return a simulated response
      const responses = {
        headache: "Based on the information you've provided, I can help assess your headache. For a proper evaluation, I need to know:\n\n1. How severe is the pain on a scale of 1-10?\n2. Is it affecting one or both sides of your head?\n3. Have you experienced any visual disturbances?\n\nThis will help determine if it's a tension headache, migraine, or if you should seek immediate medical attention.",
        default: "I understand you have a health concern. To provide the most accurate guidance, could you please:\n\n1. Describe your main symptoms\n2. Tell me how long you've had them\n3. Mention any medications you're currently taking"
      };

      // Simple keyword matching for demo
      return prompt.toLowerCase().includes('headache') 
        ? responses.headache 
        : responses.default;
    }

    generateSuggestions(input, response) {
      // Generate relevant quick-reply suggestions based on the conversation
      const suggestions = [];
      
      if (response.includes('scale of 1-10')) {
        suggestions.push('Pain level: 3', 'Pain level: 7');
      }
      
      if (response.includes('how long')) {
        suggestions.push('Started today', '2 days ago', 'Over a week');
      }
      
      return suggestions;
    }
  }

class FallbackAgent extends BaseAgent {
    constructor() { super('fallback'); }
    canHandle() { return true; }
    async handle(_text, _ctx) {
      return { reply: "Sorry, I didn’t quite get that. Could you rephrase?" };
    }
  }

  class Orchestrator {
    constructor(options = {}) {
      const providers = options.providers || [];
      this.agents = [
        new GreetingAgent(),
        new DurationAgent(),
        ...providers,
        new FallbackAgent(),
      ];
      this.ctx = new AgentContext(options.context || {});
    }
    setContext(patch) { Object.assign(this.ctx, patch); }
    getContext() { return this.ctx; }
    async handle(text) {
      for (const a of this.agents) {
        try {
          if (a.canHandle(text, this.ctx)) {
            const res = await a.handle(text, this.ctx);
            if (res && res.reply) return res.reply;
          }
        } catch (e) {
          // continue to next agent
        }
      }
      return '…';
    }
  }

  // Expose to window
  window.AI = window.AI || {};
  window.AI.Orchestrator = Orchestrator;
  window.AI.Agents = { BaseAgent, BNFAgent };
})();

