# 🚀 Kurdolingo — Deployment auf Railway.app

## Vorbereitung (einmalig, lokal)

### Schritt 1 — GitHub Repo erstellen

1. Gehe zu [github.com](https://github.com) → **New repository**
2. Name: `kurdolingo` (oder beliebig)
3. Sichtbarkeit: **Private** ← wichtig, Code bleibt verborgen
4. Ohne README erstellen (wir pushen gleich unsere Dateien)

### Schritt 2 — Projekt auf GitHub hochladen

Öffne ein Terminal im Projektordner und führe aus:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DEIN-USERNAME/kurdolingo.git
git push -u origin main
```

> Ersetze `DEIN-USERNAME` mit deinem GitHub-Benutzernamen.

---

## Deployment auf Railway

### Schritt 3 — Railway-Account erstellen

1. Gehe zu [railway.app](https://railway.app)
2. **Sign up with GitHub** — so hat Railway automatisch Zugriff auf deine privaten Repos

### Schritt 4 — Neues Projekt erstellen

1. Im Railway-Dashboard: **New Project**
2. Wähle: **Deploy from GitHub repo**
3. Wähle dein `kurdolingo`-Repo aus der Liste
4. Railway erkennt automatisch das Projekt und startet den ersten Build

### Schritt 5 — Umgebungsvariablen setzen ⚠️

Das ist der wichtigste Schritt. Ohne diese Variablen startet das Backend nicht.

Im Railway-Dashboard → dein Projekt → **Variables** → folgende Variablen hinzufügen:

| Variable | Wert |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | *(sicherer zufälliger Wert — siehe unten)* |
| `ALLOWED_ORIGINS` | *(deine Railway-URL — nach dem ersten Deploy sichtbar)* |
| `TRUST_PROXY` | `1` |
| `PORT` | `4000` |

**JWT_SECRET generieren** — führe diesen Befehl lokal aus:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Kopiere den Output (64 Zeichen) als `JWT_SECRET`.

**ALLOWED_ORIGINS** — nach dem ersten Deploy bekommst du eine URL wie `https://kurdolingo-production.up.railway.app`.
Setze dann:
```
ALLOWED_ORIGINS=https://kurdolingo-production.up.railway.app
```

### Schritt 6 — Datenbank mit Seed-Daten befüllen

Nach dem ersten erfolgreichen Deploy:

1. Railway-Dashboard → dein Projekt → **Settings** → **Deploy** → **Run Command**
2. Führe einmalig aus:
```bash
cd backend && node src/seed.js
```

Alternativ über Railway CLI:
```bash
npm install -g @railway/cli
railway login
railway run "cd backend && node src/seed.js"
```

### Schritt 7 — Fertig 🎉

Railway gibt dir eine öffentliche URL (z.B. `https://kurdolingo-production.up.railway.app`).
Diese URL kannst du teilen — niemand kann deinen Code sehen, da das Repo privat ist.

---

## Automatische Updates

Jedes Mal wenn du Code-Änderungen pushst:
```bash
git add .
git commit -m "Update"
git push
```
Railway erkennt den Push automatisch und deployed die neue Version.

---

## Kosten

Railway hat einen **Free Tier** mit $5 Guthaben pro Monat — für eine Demo reicht das problemlos.
Für dauerhaften Betrieb: Starter-Plan ab $5/Monat.

---

## Wichtige Hinweise

- ✅ Das Repo ist **privat** — niemand sieht deinen Quellcode
- ✅ `.env` wird **nicht** hochgeladen (steht in `.gitignore`)
- ✅ Die Datenbank wird **nicht** hochgeladen — Railway erstellt eine neue
- ✅ `node_modules/` wird **nicht** hochgeladen — Railway installiert selbst
- ✅ `frontend/dist/` wird **nicht** hochgeladen — Railway baut selbst

---

## Troubleshooting

**Build schlägt fehl?**
→ Railway-Dashboard → **Deployments** → letzten Deploy anklicken → Build-Logs lesen

**App startet nicht?**
→ Überprüfe ob alle Umgebungsvariablen gesetzt sind (besonders `JWT_SECRET` und `NODE_ENV=production`)

**CORS-Fehler im Browser?**
→ `ALLOWED_ORIGINS` muss exakt deine Railway-URL enthalten (kein Slash am Ende)

**Seite zeigt alte Version?**
→ Hard-Refresh im Browser: `Ctrl+Shift+R` (Windows/Linux) oder `Cmd+Shift+R` (Mac)
