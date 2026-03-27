# 🦅 Kurdolingo

**Kurdisch lernen** — vollständige Fullstack-Web-App mit React-Frontend und Express-Backend.

---

## ✅ Schnellstart (3 Befehle)

### macOS / Linux

```bash
bash start.sh
```

### Windows

```bat
start.bat
```

### Manuell

```bash
# 1. Abhängigkeiten installieren
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 2. Datenbank befüllen
cd backend && npm run seed && cd ..

# 3. Starten (zwei Terminals)
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
cd frontend && npm run dev
```

---

## 🌐 URLs

| Dienst | URL |
|--------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| Health Check | http://localhost:4000/api/health |
| Admin-Panel | http://localhost:3000/admin |

---

## 🔑 Test-Zugänge

| Rolle | E-Mail | Passwort |
|-------|--------|----------|
| Admin | admin@kurdolingo.de | admin123 |
| Demo | demo@kurdolingo.de | demo123 |

---

## 📁 Projektstruktur

```
kurdolingo/
├── start.sh              ← macOS/Linux Startskript
├── start.bat             ← Windows Startskript
│
├── backend/
│   ├── src/
│   │   ├── index.js      ← Express-Server (Port 4000)
│   │   ├── db.js         ← SQLite-Schema & Init
│   │   ├── seed.js       ← Beispieldaten (300+ Übungen)
│   │   ├── middleware/
│   │   │   └── auth.js   ← JWT-Middleware
│   │   └── routes/
│   │       ├── auth.js      ← POST /register, /login, GET /me
│   │       ├── courses.js   ← Sprachpaare CRUD
│   │       ├── units.js     ← Einheiten CRUD
│   │       ├── lessons.js   ← Lektionen + Submit
│   │       ├── exercises.js ← Übungen CRUD
│   │       ├── vocab.js     ← Vokabeln + Bulk-Import
│   │       ├── progress.js  ← Fortschritt & XP
│   │       ├── media.js     ← Audio/Bild-Upload
│   │       └── admin.js     ← Admin-Stats, User-Management
│   ├── uploads/           ← Hochgeladene Dateien
│   │   ├── audio/
│   │   └── images/
│   ├── kurdolingo.db      ← SQLite-Datenbank (auto-generiert)
│   ├── .env               ← Umgebungsvariablen
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── main.jsx       ← React-Einstiegspunkt
    │   ├── App.jsx        ← Router & Routes
    │   ├── api/
    │   │   └── client.js  ← Axios mit JWT-Interceptor
    │   ├── store/
    │   │   └── index.js   ← Zustand (globaler State)
    │   ├── styles/
    │   │   └── global.css ← Design-System
    │   ├── components/
    │   │   ├── Layout.jsx       ← TopBar + LeftNav + Outlet
    │   │   └── ui/
    │   │       ├── Logo.jsx
    │   │       ├── Spinner.jsx
    │   │       └── ToastManager.jsx
    │   └── pages/
    │       ├── LoginPage.jsx
    │       ├── RegisterPage.jsx
    │       ├── HomePage.jsx       ← Kursauswahl + Skill-Tree
    │       ├── LessonPage.jsx     ← Alle Übungstypen
    │       ├── ProfilePage.jsx
    │       ├── ShopPage.jsx
    │       ├── LeaderboardPage.jsx
    │       ├── AdminPage.jsx      ← Vollständiges Admin-Panel
    │       └── NotFoundPage.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## 🔌 API-Endpunkte

### Auth
| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| POST | /api/auth/register | Neues Konto |
| POST | /api/auth/login | Anmelden, JWT zurück |
| GET | /api/auth/me | Eigenes Profil |

### Kurse & Inhalte
| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | /api/courses | Alle aktiven Sprachpaare |
| GET | /api/courses/all | Alle inkl. Entwürfe (Admin) |
| POST | /api/courses | Neues Sprachpaar (Admin) |
| GET | /api/units?pair_id= | Einheiten |
| GET | /api/lessons?pair_id= | Lektionen |
| GET | /api/lessons/:id | Lektion + Übungen |
| POST | /api/lessons/:id/submit | Antwort prüfen + XP |
| GET | /api/vocab?pair_id= | Vokabeln |
| POST | /api/vocab/bulk | Massimport |

### Fortschritt & Admin
| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | /api/progress/:pairId | Fortschritt |
| POST | /api/progress/complete | Lektion abschließen |
| POST | /api/media/upload | Datei hochladen |
| GET | /api/admin/stats | Dashboard-Statistiken |
| GET | /api/admin/users | Alle Nutzer |

---

## 🌍 Unterstützte Sprachpaare (Seed)

| Von | Zu | Status |
|-----|----|--------|
| 🇩🇪 Deutsch | 🏳️ Kurdisch (Kurmanji) | Aktiv |
| 🇹🇷 Türkisch | 🏳️ Kurdisch (Kurmanji) | Aktiv |
| 🇬🇧 Englisch | 🏳️ Kurdisch (Kurmanji) | Aktiv |
| 🇸🇦 Arabisch | 🏳️ Kurdisch (Sorani) | Beta |
| 🇫🇷 Französisch | 🏳️ Kurdisch (Kurmanji) | Entwurf |

Neue Sprachen können über das Admin-Panel hinzugefügt werden.

---

## 🛠️ Technologie-Stack

**Backend**
- Node.js + Express
- SQLite via `better-sqlite3` (kein Datenbankserver nötig!)
- JWT-Authentifizierung mit `jsonwebtoken`
- Passwort-Hashing mit `bcryptjs`
- Datei-Upload mit `multer`

**Frontend**
- React 18 + Vite
- React Router v6
- Zustand (State-Management)
- Axios (HTTP-Client)
- Eigenes Design-System (kein UI-Framework)

---

## ⚙️ Umgebungsvariablen (backend/.env)

```env
PORT=4000
JWT_SECRET=dein-geheimer-schluessel
NODE_ENV=development
```

---

## 📝 Neue Übungstypen

Die App unterstützt 5 Übungstypen:

| Typ | Beschreibung |
|-----|-------------|
| `mc` | Multiple Choice (4 Antworten) |
| `listen` | Hören & Tippen (mit Browser-TTS) |
| `arrange` | Wörter in richtige Reihenfolge bringen |
| `match` | Paare verbinden (Kurdisch ↔ Übersetzung) |
| `fill` | Lückentext ausfüllen |

---

*Kurdolingo – Ziman hîn bibe! (Lerne die Sprache!)*
