# IndAI — Intelligent Detection AI

> 🛡️ Code Security Auditing System with AI-Powered Vulnerability Detection

## Overview

IndAI is a web-based platform where students authenticate via Google OAuth, paste code, and receive instant vulnerability analysis with auto-fix suggestions and one-click corrected code extraction.

### Key Features

- **Google OAuth Authentication** — Secure student login via Google
- **15 OWASP Security Rules** — Comprehensive vulnerability scanning
- **Auto-Fix Engine** — Automatic code corrections with security patches
- **Export Corrected Code** — One-click download of fixed code
- **Scan History Dashboard** — Track all past scans and statistics
- **API-Led Architecture** — Three-layer API design (Experience / Process / System)
- **OOP Design** — Inheritance, Polymorphism, Encapsulation, Abstraction
- **Design Patterns** — Strategy, Factory, Facade, Singleton, Template Method

## Architecture

```
┌──────────────────────┐       ┌───────────────────────────┐
│   React + TypeScript │       │    Flask Backend           │
│   (Vercel)           │──────▶│    (Render)                │
│                      │       │                           │
│  • Landing Page      │       │  Experience API Layer     │
│  • Dashboard         │       │    └─ /api/v1/experience  │
│  • Scan Page         │       │                           │
│  • Scan Detail       │       │  Process API Layer        │
│                      │       │    ├─ auth (Google OAuth)  │
└──────────────────────┘       │    ├─ scan (Scanner)       │
                               │    └─ report (History)     │
                               │                           │
                               │  System API Layer         │
                               │    ├─ users (CRUD)         │
                               │    └─ scans (CRUD)         │
                               │                           │
                               │  Security Engine          │
                               │    ├─ 15 OWASP Rules      │
                               │    ├─ RuleFactory          │
                               │    ├─ Scanner (Facade)     │
                               │    └─ CodeFixer            │
                               │                           │
                               │  SQLite / PostgreSQL       │
                               └───────────────────────────┘
```

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- Google Cloud OAuth credentials

### Backend Setup

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Google OAuth credentials

python run.py
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project "IndAI"
3. OAuth consent screen → External → Add scopes: email, profile
4. Credentials → OAuth Client ID → Web Application
5. Add redirect URI: `http://localhost:5000/api/v1/process/auth/google/callback`
6. Copy Client ID and Secret to `.env`

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Python 3.12 + Flask |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Auth | Google OAuth 2.0 + JWT |
| Deployment | Vercel (frontend) + Render (backend) |

## OOP Principles

| Principle | Implementation |
|---|---|
| Abstraction | `BaseModel`, `SecurityRule` ABC |
| Encapsulation | Model CRUD methods, severity logic |
| Inheritance | All models extend `BaseModel`, all rules extend `SecurityRule` |
| Polymorphism | `to_dict()` overrides, `check()` implementations |

## Design Patterns

| Pattern | Implementation |
|---|---|
| Strategy | Each security rule is a scanning strategy |
| Factory | `RuleFactory` creates all rule instances |
| Facade | `Scanner` simplifies the scanning subsystem |
| Singleton | DB connection, Flask extensions |
| Template Method | `BaseModel.to_dict()` with overrides |

## License

MIT
