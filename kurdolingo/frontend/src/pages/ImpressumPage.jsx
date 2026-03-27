import React from 'react';
import { Link } from 'react-router-dom';

export default function ImpressumPage() {
  return (
    <div style={{
      maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px',
      fontFamily: 'var(--font)', color: 'var(--text-primary)',
    }}>
      {/* Back-Link */}
      <Link to="/" style={{
        color: 'var(--teal)', fontWeight: 700, fontSize: 13,
        textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
        marginBottom: 24,
      }}>← Zurück zur App</Link>

      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Impressum</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>
        Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz)
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, fontSize: 15, lineHeight: 1.8 }}>

        <section>
          <h2 style={h2}>Anbieter</h2>
          {/* ⚠️ HIER DEINE ECHTEN DATEN EINTRAGEN */}
          <p>
            <strong>[DEIN VOLLSTÄNDIGER VOR- UND NACHNAME]</strong><br/>
            [Straße und Hausnummer]<br/>
            [PLZ Ort]<br/>
            Deutschland
          </p>
        </section>

        <section>
          <h2 style={h2}>Kontakt</h2>
          <p>
            E-Mail: <a href="mailto:kontakt@kurdolingo.de" style={link}>kontakt@kurdolingo.de</a><br/>
            {/* Telefon oder Kontaktformular — eines von beiden ist Pflicht */}
            Telefon: [DEINE TELEFONNUMMER]
          </p>
        </section>

        <section>
          <h2 style={h2}>Umsatzsteuer-ID</h2>
          <p>
            Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG:<br/>
            [DE XXXXXXXXX] — oder: „Nicht vorhanden (Kleinunternehmerregelung nach § 19 UStG)"
          </p>
        </section>

        <section>
          <h2 style={h2}>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
          <p>
            [DEIN VOLLSTÄNDIGER VOR- UND NACHNAME]<br/>
            [Straße und Hausnummer]<br/>
            [PLZ Ort]
          </p>
        </section>

        <section>
          <h2 style={h2}>Streitbeilegung</h2>
          <p>
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren
            vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>

        <section>
          <h2 style={h2}>Haftung für Inhalte</h2>
          <p>
            Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte
            auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach
            §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet,
            übermittelte oder gespeicherte fremde Informationen zu überwachen oder
            nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
          </p>
          <p>
            Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
            Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.
            Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis
            einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von
            entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
          </p>
        </section>

        <section>
          <h2 style={h2}>Haftung für Links</h2>
          <p>
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren
            Inhalte wir keinen Einfluss haben. Deshalb können wir für diese
            fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der
            verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber
            der Seiten verantwortlich.
          </p>
        </section>

        <section>
          <h2 style={h2}>Urheberrecht</h2>
          <p>
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen
            Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung,
            Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der
            Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des
            jeweiligen Autors bzw. Erstellers.
          </p>
        </section>
      </div>

      <div style={{
        marginTop: 40, padding: '16px 20px',
        background: 'var(--sun-lt)', border: '1.5px solid rgba(232,160,32,.2)',
        borderRadius: 12, fontSize: 13, color: '#7a4800', lineHeight: 1.7,
      }}>
        <strong>⚠️ Hinweis:</strong> Die mit [KLAMMERN] markierten Stellen müssen vor
        dem Go-Live mit deinen echten Daten ersetzt werden. Ein unvollständiges Impressum
        kann zu Abmahnungen führen.
      </div>
    </div>
  );
}

const h2 = { fontSize: 18, fontWeight: 800, marginBottom: 6, color: 'var(--text-primary)' };
const link = { color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 };
