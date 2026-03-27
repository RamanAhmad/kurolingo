import React from 'react';
import { Link } from 'react-router-dom';

export default function DatenschutzPage() {
  return (
    <div style={{
      maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px',
      fontFamily: 'var(--font)', color: 'var(--text-primary)',
    }}>
      <Link to="/" style={{
        color: 'var(--teal)', fontWeight: 700, fontSize: 13,
        textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
        marginBottom: 24,
      }}>← Zurück zur App</Link>

      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Datenschutzerklärung</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>
        Stand: März 2026
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, fontSize: 15, lineHeight: 1.8 }}>

        <section>
          <h2 style={h2}>1. Verantwortlicher</h2>
          <p>
            {/* ⚠️ HIER DEINE ECHTEN DATEN EINTRAGEN */}
            [DEIN VOLLSTÄNDIGER VOR- UND NACHNAME]<br/>
            [Straße und Hausnummer]<br/>
            [PLZ Ort]<br/>
            E-Mail: <a href="mailto:kontakt@kurdolingo.de" style={link}>kontakt@kurdolingo.de</a>
          </p>
        </section>

        <section>
          <h2 style={h2}>2. Welche Daten wir erheben</h2>
          <p>Bei der Nutzung von Kurdolingo erheben und verarbeiten wir folgende personenbezogene Daten:</p>
          <p>
            <strong>Bei der Registrierung:</strong> E-Mail-Adresse, gewählter Anzeigename, Passwort (verschlüsselt gespeichert mit bcrypt)
          </p>
          <p>
            <strong>Bei der Nutzung:</strong> Lernfortschritt (abgeschlossene Lektionen, XP, Streak), Quiz-Ergebnisse, Community-Nachrichten, Shop-Käufe (virtuelle Währung, keine echten Zahlungsdaten)
          </p>
          <p>
            <strong>Automatisch:</strong> IP-Adresse (für Rate-Limiting und Sicherheit), Zeitpunkt der letzten Anmeldung, Zugriffszeitpunkte in Server-Logs
          </p>
        </section>

        <section>
          <h2 style={h2}>3. Zweck und Rechtsgrundlage</h2>
          <p>Wir verarbeiten deine Daten auf folgenden Rechtsgrundlagen:</p>
          <p>
            <strong>Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO):</strong> Bereitstellung der Lernplattform, Speicherung deines Fortschritts, Verwaltung deines Benutzerkontos
          </p>
          <p>
            <strong>Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO):</strong> Schutz vor Missbrauch (Rate-Limiting, Community-Moderation), Verbesserung der Plattform, Sicherheit der Anwendung
          </p>
        </section>

        <section>
          <h2 style={h2}>4. Speicherdauer</h2>
          <p>
            Deine Kontodaten und dein Lernfortschritt werden gespeichert, solange
            dein Benutzerkonto besteht. Nach einer Kontolöschung werden alle
            personenbezogenen Daten innerhalb von 30 Tagen gelöscht.
          </p>
          <p>
            Server-Logs (IP-Adressen, Zugriffszeitpunkte) werden nach 14 Tagen
            automatisch gelöscht.
          </p>
          <p>
            Passwort-Reset-Tokens laufen nach 1 Stunde ab und werden automatisch
            bereinigt.
          </p>
        </section>

        <section>
          <h2 style={h2}>5. Datenweitergabe an Dritte</h2>
          <p>
            Wir geben deine personenbezogenen Daten <strong>nicht</strong> an Dritte weiter.
            Es werden keine Tracking-Dienste, Werbepartner oder Analyse-Tools
            von Drittanbietern eingesetzt.
          </p>
          <p>
            Die Anwendung wird auf Servern in Deutschland gehostet
            (Hetzner Online GmbH, Gunzenhausen). Eine Datenübermittlung in
            Drittländer findet nicht statt.
          </p>
        </section>

        <section>
          <h2 style={h2}>6. Cookies und lokale Speicherung</h2>
          <p>
            Kurdolingo verwendet <strong>keine Cookies</strong> im klassischen Sinne.
          </p>
          <p>
            Wir nutzen den <code style={code}>localStorage</code> deines Browsers,
            um deinen Anmeldestatus (JWT-Token) und deine Spracheinstellung zu
            speichern. Dies ist technisch notwendig für den Betrieb der Anwendung
            und erfordert keine gesonderte Einwilligung (§ 25 Abs. 2 Nr. 2 TDDDG).
          </p>
          <p>
            Es werden keine Tracking-Cookies oder Cookies zu Werbezwecken gesetzt.
          </p>
        </section>

        <section>
          <h2 style={h2}>7. Sicherheit</h2>
          <p>
            Wir setzen technische und organisatorische Maßnahmen ein, um deine
            Daten zu schützen:
          </p>
          <p>
            Verschlüsselte Übertragung (HTTPS/TLS), verschlüsselte Passwortspeicherung
            (bcrypt mit Salting), JWT-Tokens mit Blacklist bei Logout und
            Passwortänderung, Rate-Limiting gegen Brute-Force-Angriffe,
            XSS-Schutz durch Input-Sanitierung, Security-Header (Helmet, CSP, HSTS).
          </p>
        </section>

        <section>
          <h2 style={h2}>8. Deine Rechte</h2>
          <p>Du hast jederzeit das Recht auf:</p>
          <p>
            <strong>Auskunft</strong> (Art. 15 DSGVO) — Welche Daten wir über dich gespeichert haben<br/>
            <strong>Berichtigung</strong> (Art. 16 DSGVO) — Korrektur unrichtiger Daten<br/>
            <strong>Löschung</strong> (Art. 17 DSGVO) — Löschung deiner Daten / deines Kontos<br/>
            <strong>Einschränkung</strong> (Art. 18 DSGVO) — Einschränkung der Verarbeitung<br/>
            <strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO) — Export deiner Daten<br/>
            <strong>Widerspruch</strong> (Art. 21 DSGVO) — Widerspruch gegen die Verarbeitung
          </p>
          <p>
            Zur Ausübung deiner Rechte schreibe eine E-Mail an{' '}
            <a href="mailto:kontakt@kurdolingo.de" style={link}>kontakt@kurdolingo.de</a>.
          </p>
        </section>

        <section>
          <h2 style={h2}>9. Beschwerderecht</h2>
          <p>
            Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu
            beschweren. Zuständig ist die Aufsichtsbehörde des Bundeslandes, in dem
            du deinen Wohnsitz hast, oder die Behörde am Sitz des Verantwortlichen.
          </p>
          <p>
            Eine Liste der Aufsichtsbehörden findest du auf{' '}
            <a href="https://www.bfdi.bund.de/DE/Infothek/Anschriften_Links/anschriften_links-node.html"
              target="_blank" rel="noopener noreferrer" style={link}>
              bfdi.bund.de
            </a>.
          </p>
        </section>

        <section>
          <h2 style={h2}>10. Minderjährige</h2>
          <p>
            Kurdolingo richtet sich an Nutzer ab 16 Jahren. Personen unter 16 Jahren
            benötigen die Zustimmung eines Erziehungsberechtigten, um die Plattform
            zu nutzen und ein Benutzerkonto zu erstellen.
          </p>
        </section>

        <section>
          <h2 style={h2}>11. Änderungen</h2>
          <p>
            Wir behalten uns vor, diese Datenschutzerklärung bei Änderungen der
            Datenverarbeitung oder bei gesetzlichen Änderungen anzupassen. Die
            aktuelle Version ist stets unter dieser URL abrufbar.
          </p>
        </section>
      </div>

      <div style={{
        marginTop: 40, padding: '16px 20px',
        background: 'var(--sun-lt)', border: '1.5px solid rgba(232,160,32,.2)',
        borderRadius: 12, fontSize: 13, color: '#7a4800', lineHeight: 1.7,
      }}>
        <strong>⚠️ Hinweis:</strong> Ersetze die [KLAMMERN] in Abschnitt 1 mit deinen
        echten Daten. Passe Abschnitt 5 an, falls du den Hosting-Anbieter wechselst.
        Bei Unsicherheiten empfehlen wir eine Prüfung durch einen Datenschutz-Anwalt.
      </div>
    </div>
  );
}

const h2 = { fontSize: 18, fontWeight: 800, marginBottom: 6, color: 'var(--text-primary)' };
const link = { color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 };
const code = {
  background: 'var(--stone-100)', padding: '2px 6px', borderRadius: 4,
  fontSize: 13, fontFamily: 'var(--font-mono, monospace)',
};
