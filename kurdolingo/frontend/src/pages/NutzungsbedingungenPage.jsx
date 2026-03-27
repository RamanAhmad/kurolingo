import React from 'react';
import { Link } from 'react-router-dom';

export default function NutzungsbedingungenPage() {
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

      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Nutzungsbedingungen</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>
        Stand: März 2026
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, fontSize: 15, lineHeight: 1.8 }}>

        <section>
          <h2 style={h2}>1. Geltungsbereich</h2>
          <p>
            Diese Nutzungsbedingungen gelten für die Nutzung der Sprachlern-Plattform
            „Kurdolingo" (im Folgenden „die Plattform"), betrieben von
            [DEIN VOLLSTÄNDIGER VOR- UND NACHNAME], [Adresse] (im Folgenden „wir" / „Betreiber").
          </p>
          <p>
            Mit der Registrierung und Nutzung der Plattform erklärst du dich mit
            diesen Nutzungsbedingungen einverstanden.
          </p>
        </section>

        <section>
          <h2 style={h2}>2. Beschreibung des Angebots</h2>
          <p>
            Kurdolingo ist eine kostenlose Plattform zum Erlernen der kurdischen
            Sprache (Kurmanji). Die Plattform bietet interaktive Übungen, Lektionen,
            Vokabeltrainer, ein Community-Forum und kulturelle Inhalte.
          </p>
          <p>
            Die Plattform nutzt ein spielerisches System mit virtuellen Punkten (XP),
            virtueller Währung (Gems), Herzen und Streaks. Diese haben keinen
            monetären Wert und können nicht gegen echtes Geld eingetauscht werden.
          </p>
        </section>

        <section>
          <h2 style={h2}>3. Registrierung und Benutzerkonto</h2>
          <p>
            Für die Nutzung der Plattform ist eine Registrierung mit E-Mail-Adresse,
            Anzeigename und Passwort erforderlich. Du bist verpflichtet, wahrheitsgemäße
            Angaben zu machen und dein Passwort geheim zu halten.
          </p>
          <p>
            Die Nutzung der Plattform ist ab 16 Jahren gestattet. Personen unter
            16 Jahren benötigen die Zustimmung eines Erziehungsberechtigten.
          </p>
          <p>
            Jede Person darf nur ein Benutzerkonto anlegen. Wir behalten uns vor,
            Mehrfach-Accounts ohne Vorankündigung zu löschen.
          </p>
        </section>

        <section>
          <h2 style={h2}>4. Verhaltensregeln (Community)</h2>
          <p>Im Community-Bereich der Plattform gelten folgende Regeln:</p>
          <p>
            Respektvoller Umgang miteinander — Beleidigungen, Diskriminierung,
            Hassrede und Mobbing sind verboten.
          </p>
          <p>
            Kein Spam, keine Werbung, keine Links zu externen Seiten ohne Bezug
            zum Thema Sprache/Kultur.
          </p>
          <p>
            Keine illegalen Inhalte, keine persönlichen Daten Dritter, keine
            Urheberrechtsverletzungen.
          </p>
          <p>
            Die Privatsphäre anderer Nutzer ist zu achten.
          </p>
          <p>
            Wir behalten uns vor, Nachrichten ohne Vorankündigung zu löschen und
            Nutzer bei wiederholten Verstößen vorübergehend oder dauerhaft zu
            sperren.
          </p>
        </section>

        <section>
          <h2 style={h2}>5. Geistiges Eigentum</h2>
          <p>
            Alle Inhalte der Plattform (Übungen, Texte, Geschichten, Quiz-Inhalte,
            Design, Logos) sind urheberrechtlich geschützt und Eigentum des Betreibers.
          </p>
          <p>
            Nutzer dürfen Inhalte ausschließlich zum persönlichen Lernen verwenden.
            Eine kommerzielle Nutzung, Vervielfältigung oder Weitergabe der Inhalte
            ist ohne schriftliche Genehmigung nicht gestattet.
          </p>
          <p>
            Nachrichten, die Nutzer im Community-Bereich veröffentlichen, bleiben
            geistiges Eigentum des jeweiligen Nutzers. Mit der Veröffentlichung
            räumst du uns ein einfaches, nicht-exklusives Nutzungsrecht ein, um
            die Nachrichten im Rahmen der Plattform anzuzeigen.
          </p>
        </section>

        <section>
          <h2 style={h2}>6. Verfügbarkeit und Haftung</h2>
          <p>
            Wir bemühen uns um eine hohe Verfügbarkeit der Plattform, können
            aber keine ununterbrochene Erreichbarkeit garantieren. Wartungsarbeiten,
            Updates oder technische Probleme können zu vorübergehenden Ausfällen führen.
          </p>
          <p>
            Die Plattform wird „wie besehen" (as is) bereitgestellt. Wir übernehmen
            keine Garantie für die Richtigkeit, Vollständigkeit oder Aktualität der
            Lerninhalte. Kurdolingo ersetzt keinen professionellen Sprachunterricht.
          </p>
          <p>
            Die Haftung für leichte Fahrlässigkeit wird ausgeschlossen, sofern
            keine wesentlichen Vertragspflichten verletzt werden. Dies gilt nicht
            für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit.
          </p>
        </section>

        <section>
          <h2 style={h2}>7. Kontolöschung</h2>
          <p>
            Du kannst dein Benutzerkonto jederzeit löschen lassen, indem du eine
            E-Mail an{' '}
            <a href="mailto:kontakt@kurdolingo.de" style={link}>kontakt@kurdolingo.de</a>{' '}
            schreibst. Nach der Löschung werden alle personenbezogenen Daten
            innerhalb von 30 Tagen entfernt.
          </p>
          <p>
            Wir behalten uns vor, Benutzerkonten bei schwerwiegenden Verstößen
            gegen diese Nutzungsbedingungen ohne Vorankündigung zu löschen.
          </p>
        </section>

        <section>
          <h2 style={h2}>8. Änderungen der Nutzungsbedingungen</h2>
          <p>
            Wir behalten uns vor, diese Nutzungsbedingungen jederzeit zu ändern.
            Wesentliche Änderungen werden per E-Mail oder über eine Benachrichtigung
            in der Plattform mitgeteilt. Die fortgesetzte Nutzung nach einer
            Änderung gilt als Zustimmung zu den aktualisierten Bedingungen.
          </p>
        </section>

        <section>
          <h2 style={h2}>9. Anwendbares Recht und Gerichtsstand</h2>
          <p>
            Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand für
            alle Streitigkeiten ist, soweit gesetzlich zulässig, der Wohnsitz
            des Betreibers.
          </p>
        </section>

        <section>
          <h2 style={h2}>10. Kontakt</h2>
          <p>
            Bei Fragen zu diesen Nutzungsbedingungen wende dich an:{' '}
            <a href="mailto:kontakt@kurdolingo.de" style={link}>kontakt@kurdolingo.de</a>
          </p>
        </section>
      </div>

      <div style={{
        marginTop: 40, padding: '16px 20px',
        background: 'var(--sun-lt)', border: '1.5px solid rgba(232,160,32,.2)',
        borderRadius: 12, fontSize: 13, color: '#7a4800', lineHeight: 1.7,
      }}>
        <strong>⚠️ Hinweis:</strong> Ersetze die [KLAMMERN] in Abschnitt 1 mit deinen
        echten Daten. Für eine rechtsverbindliche Prüfung empfehlen wir einen
        auf IT-Recht spezialisierten Anwalt.
      </div>
    </div>
  );
}

const h2 = { fontSize: 18, fontWeight: 800, marginBottom: 6, color: 'var(--text-primary)' };
const link = { color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 };
