# AI Chat Configuration

## Setting up OpenAI API

To enable the AI-powered chat, you need to:

1. **Get an OpenAI API key:**
   - Visit https://platform.openai.com/api-keys
   - Create an account if you don't have one
   - Generate a new API key

2. **Add your API key:**
   - Open `js/chat-ai.js`
   - Find line 9: `apiKey: 'your-openai-api-key-here'`
   - Replace `your-openai-api-key-here` with your actual API key

## Demo Mode

The system works in demo mode without an API key using intelligent simulation that:
- Understands spelling mistakes and variations
- Handles natural language descriptions
- Provides appropriate responses
- Still follows WWHAM methodology

## Features

### Natural Language Understanding
- ✅ "headeach" → headache
- ✅ "runny nose sneezing" → hay fever  
- ✅ "burning chest after eating" → heartburn
- ✅ "my stomache hurts" → stomach problems

### Conversational AI
- ✅ Empathetic responses
- ✅ Clarifying questions
- ✅ Spelling tolerance
- ✅ Context awareness

### Safety Features
- ✅ Red flag detection
- ✅ Urgency assessment
- ✅ Medical referral advice

## Usage Costs

OpenAI API costs are very low for this use case:
- GPT-3.5-turbo: ~$0.002 per 1000 tokens
- Average consultation: ~500 tokens = $0.001
- 1000 consultations ≈ $1

## Security Note

For production use:
- Store API keys securely (environment variables)
- Implement rate limiting
- Add user authentication
- Consider using a backend proxy
