# Upgrade: sql.js → better-sqlite3

## Warum dieser Upgrade?

| | sql.js (alt) | better-sqlite3 (neu) |
|---|---|---|
| **Datenverlust-Risiko** | 2 Sekunden bei Absturz | Kein — jeder Write ist sofort auf Disk |
| **RAM-Verbrauch** | Gesamte DB im RAM | Nur aktive Statements im RAM |
| **Performance** | Langsam (In-Memory → Export → Write) | 10–100× schneller bei Writes |
| **Produktionstauglich** | Nein | Ja |
| **API-Änderungen** | — | Keine — Drop-in-Replacement |

---

## Migration (einmalig, ~2 Minuten)

### Schritt 1 — Abhängigkeit installieren

```bash
cd backend
npm install better-sqlite3
```

> **Windows mit WSL2**: Falls der Build fehlschlägt, installiere zuerst:
> ```bash
> sudo apt-get install build-essential python3
> ```
>
> **Raspberry Pi / ARM**: same build tools benötigt.

### Schritt 2 — Bestehende Datenbank migrieren (optional)

Hast du eine bestehende `backend/kurdolingo.db` mit Daten? Dann:

```bash
node src/migrate.js
```

Das Script:
- Erstellt automatisch ein Backup (`kurdolingo.db.bak-<timestamp>`)
- Prüft die Datenbankintegrität
- Aktiviert WAL-Modus
- Führt ausstehende Schema-Migrations aus
- Gibt einen Bericht aus

> **Keine bestehende DB?** — Diesen Schritt überspringen. Eine neue Datenbank
> wird beim ersten Start automatisch erstellt.

### Schritt 3 — Server starten

```bash
npm run dev    # Entwicklung
npm start      # Produktion
```

Du solltest sehen:
```
Öffne better-sqlite3 Datenbank: .../kurdolingo.db
Datenbank bereit (better-sqlite3, WAL-Modus): .../kurdolingo.db
🦅  Kurdolingo API  →  http://localhost:4000
```

---

## Was sich geändert hat

**Keine Änderungen an Route-Dateien nötig.** Die öffentliche API ist identisch:

```js
// Diese Aufrufe funktionieren exakt wie vorher:
const db = getDB();
db.prepare('SELECT * FROM users WHERE id=?').get(id);
db.prepare('INSERT INTO ...').run(a, b, c);
db.transaction(fn)(args);
saveToDisk(); // No-op, aber weiterhin exportiert für Kompatibilität
```

**`saveToDisk()`** ist jetzt ein bewusster No-op. better-sqlite3 schreibt
synchron bei jedem `.run()` direkt auf Disk — ein manuelles Flush ist
nicht nötig und nicht möglich.

**WAL-Datei**: Nach dem ersten Start entstehen neben `kurdolingo.db` zwei
zusätzliche Dateien: `kurdolingo.db-wal` und `kurdolingo.db-shm`. Das ist
normal und gewollt. Beim ordentlichen Schließen des Prozesses (SIGTERM/SIGINT)
werden sie automatisch in die Hauptdatei gemerged.

---

## Rollback

Falls du zur alten Version zurück musst:

```bash
# 1. Package zurückwechseln
cd backend
npm install sql.js@^1.12.0
npm uninstall better-sqlite3

# 2. db.js aus Git-History wiederherstellen oder sql.js-Version einspielen

# 3. Falls du migrate.js ausgeführt hast, Backup zurückspielen:
cp backend/kurdolingo.db.bak-<timestamp> backend/kurdolingo.db
```

---

## Fehlerbehebung

**`Error: Cannot find module 'better-sqlite3'`**
→ `cd backend && npm install better-sqlite3`

**`Error: better-sqlite3 ist nicht installiert.`** (beim Serverstart)
→ Gleiche Lösung wie oben.

**Build-Fehler auf Windows**
```
gyp ERR! build error
```
→ Node.js Build Tools installieren:
```bash
npm install --global --production windows-build-tools
```
Oder: WSL2 verwenden, dort funktioniert es ohne Extra-Setup.

**`SQLITE_CORRUPT: database disk image is malformed`**
→ Backup aus `migrate.js` zurückspielen:
```bash
cp backend/kurdolingo.db.bak-<timestamp> backend/kurdolingo.db
```
