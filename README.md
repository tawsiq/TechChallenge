# TechChallenge — OTC Medication Advisor

## Overview
TechChallenge is a web-based application that helps users make safe over-the-counter (OTC) medicine choices.  
It guides patients through structured questions based on the **WWHAM framework** and provides recommendations while checking for contraindications, drug interactions, and red-flag symptoms.  

The app aims to:  
- Reduce unsafe self-medication attempts.  
- Improve patient comprehension of OTC guidance.  
- Support pharmacies by filtering safe options before counter requests.  

---

## Key Features
- **Symptom Checker**: Users input symptoms via categories or search.  
- **WWHAM Intake**: Structured Q&A: Who, What, How long, Action taken, Medication.  
- **Medication Agent**: Suggests safe OTC medicines and flags interactions.  
- **Symptom Agent**: Maps symptoms to possible conditions.  
- **History Agent**: Tracks user data for personalised advice.  
- **Explanation Agent**: Provides clear reasons for recommendations and safety warnings.  
- **User Login/Profile**: Stores history and preferences.  
- **UX Pages**: About Us, Contact, Help/FAQs, Escalation (111/999).  

---

## Project Structure
TechChallenge/
│
├── frontend/ # UI (React/HTML/CSS/JS)
├── backend/ # API and business logic (agents, routes)
├── data/ # BNF extracts, symptom/medication mappings
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


