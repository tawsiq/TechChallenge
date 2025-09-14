# Pharmalogic — OTC Medication Advisor

## Overview
Pharmalogic is a web-based application that helps users make safe over-the-counter (OTC) medicine choices.  
It guides patients through structured questions based on the **WWHAM framework** and provides recommendations while checking for contraindications, drug interactions, and red-flag symptoms.  

The app aims to:  
- Reduce unsafe self-medication attempts.  
- Improve patient comprehension of OTC guidance.  
- Support pharmacies by filtering safe options before counter requests.  

---

## Project Structure

```
TechChallenge/
├── public/                    # Frontend assets (served statically)
│   ├── *.html                # HTML pages
│   ├── css/                  # Stylesheets
│   ├── js/                   # JavaScript files
│   │   ├── app.js           # Main application bootstrap
│   │   ├── modules/         # Reusable modules
│   │   │   ├── engine.js    # Medication recommendation engine
│   │   │   ├── state-manager.js # Application state management
│   │   │   ├── nlu.js       # Natural language understanding
│   │   │   ├── result-helpers.js # Results display helpers
│   │   │   └── ux-enhancements.js # UI enhancements
│   │   └── pages/           # Page-specific scripts
│   │       ├── chat.js      # Chat interface
│   │       ├── check.js     # Symptom checker
│   │       └── results.js   # Results display
│   └── data/                # Static data files
│       ├── bnf.json        # Medication database
│       └── bnf_counselling.json # Counselling information
├── server/                   # Backend server (optional LLM proxy)
│   ├── index.js             # Express server
│   ├── package.json         # Server dependencies
│   ├── node_modules/        # Backend runtime dependencies
│   └── .env.example         # Environment variables template
└── .vscode/                 # VS Code configuration
```

**Note**: This project has two `node_modules/` directories by design:
- **Root level**: Frontend development tools (ESLint, Prettier)  
- **Server level**: Backend runtime dependencies (Express, node-fetch)

This separation allows the server to be deployed independently if needed.

---

## Quick Start

### Frontend Development
1. Serve the public directory using any HTTP server:
   ```bash
   # Using Python
   cd public && python -m http.server 8080
   
   # Using Node.js
   npx http-server public -p 8080
   
   # Using Live Server extension in VS Code
   Right-click public/index.html → "Open with Live Server"
   ```

2. Open http://localhost:8080 in your browser

### Backend Server (Optional)
The backend server provides LLM integration for enhanced chat experiences:

1. Navigate to server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy .env.example to .env and add your OpenAI API key (optional):
   ```bash
   cp .env.example .env
   # Edit .env and add: OPENAI_API_KEY=your-key-here
   ```

4. Start the server:
   ```bash
   npm start
   ```

---

## Key Features
- **Symptom Checker**: Users input symptoms via categories or natural language
- **WWHAM Intake**: Structured Q&A: Who, What, How long, Action taken, Medication  
- **Safety Screening**: Checks for contraindications, interactions, and red flags
- **Clear Guidance**: Provides evidence-based OTC recommendations
- **Responsive Design**: Works on desktop and mobile devices
- **Accessibility**: WCAG compliant with proper ARIA labels

---

## Development

### Linting and Formatting
```bash
npm run lint          # Check for code issues
npm run lint:fix      # Auto-fix issues
npm run format        # Format code with Prettier
```

### File Organization
- **public/**: All files that should be served to browsers
- **archive/**: Legacy files kept for reference
- **docs/**: Project documentation
- **server/**: Optional backend server

---

## Browser Compatibility
- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- ES2022 features used (modern JavaScript)
- No build step required for basic functionality
├── docs/ # Project documentation (roadmap, frameworks, research)
├── tests/ # Unit and integration tests
│
├── .gitignore
├── README.md
└── requirements.txt


---

## Roadmap
- **Week 1**: Build UI skeleton (symptom checker, login, static pages).  
- **Week 2**: Implement core agents and integrate data (BNF, WWHAM).  
- **Week 3**: Add additional features and refine interactions.  
- **Week 4**: Testing, debugging, and presentation preparation.  
- **Week 5**: Submission and demo.  

---

## Team Roles
- **Arun** 
- **Iren**
- **Tawsiq**
- **Jamie**
- **Gurindeep**

---

## Technology Stack (proposed)
- **Frontend**: React (or plain HTML/CSS/JS for MVP).  
- **Backend**: Python (Flask/FastAPI) or Node.js.  
- **Database**: SQLite/Postgres (for user and history).  
- **External Data**: BNF (British National Formulary), DrugBank, NHS APIs.  

---

## Development Tooling
ESLint (flat config) + Prettier included.

Install dependencies:
```
npm install
```

Lint check:
```
npm run lint
```

Auto-fix:
```
npm run lint:fix
```

Check formatting:
```
npm run check:format
```

Format all:
```
npm run format
```

Config files:
```
package.json
eslint.config.js
.prettierrc.json
```

Scope: targets `src/main/frontend/**/*.js`; extend later for backend.


