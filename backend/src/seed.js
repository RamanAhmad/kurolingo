'use strict';
/**
 * seed.js — Kurdolingo Seed-Daten
 *
 * DE→KU (Kurmanji): 5 Units, 26 Lektionen, ~260 Übungen — vollständiger A1-Kurs
 * TR→KU:            2 Units,  8 Lektionen,  ~56 Übungen — solide Grundlage
 * EN→KU:            2 Units,  8 Lektionen,  ~56 Übungen — solide Grundlage
 *
 * Aufrufen: node src/seed.js
 */

const { initDB, getDB, saveToDisk } = require('./db');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

async function run() {
  console.log('\n🌱 Kurdolingo Seed startet…\n');
  await initDB();
  const db = getDB();

  // ── Wipe ──────────────────────────────────────────────────────────────────
  db.exec(`
    DELETE FROM user_progress; DELETE FROM exercise_xp_log;
    DELETE FROM exercises;     DELETE FROM lessons;
    DELETE FROM units;         DELETE FROM vocabulary;
    DELETE FROM language_pairs; DELETE FROM shop_purchases;
    DELETE FROM media_files;   DELETE FROM users;
  `);

  // ── Users ─────────────────────────────────────────────────────────────────
  const ADMIN = uuid(); const DEMO = uuid();
  db.prepare(`INSERT INTO users
      (id,email,name,password,role,streak,total_xp,gems,hearts,level)
    VALUES (?,?,?,?,'admin',21,12400,2800,5,22)`)
    .run(ADMIN,'admin@kurdolingo.de','Admin',bcrypt.hashSync('admin123',10));
  db.prepare(`INSERT INTO users
      (id,email,name,password,role,streak,total_xp,gems,hearts,level)
    VALUES (?,?,?,?,'user',5,680,310,5,4)`)
    .run(DEMO,'demo@kurdolingo.de','Demo Lerner',bcrypt.hashSync('demo123',10));

  // ── Language Pairs ────────────────────────────────────────────────────────
  const PAIRS = [
    { id:'de-ku', code:'de', name:'Deutsch',   flag:'🇩🇪', tts:'de-DE',
      title:'Kurdisch für Deutsche',         status:'active', diff:'A1', order:1 },
    { id:'tr-ku', code:'tr', name:'Türkçe',    flag:'🇹🇷', tts:'tr-TR',
      title:'Kürtçe Türkler için',            status:'active', diff:'A1', order:2 },
    { id:'en-ku', code:'en', name:'English',   flag:'🇬🇧', tts:'en-GB',
      title:'Kurdish for English Speakers',   status:'active', diff:'A1', order:3 },
    { id:'ar-ku', code:'ar', name:'العربية',  flag:'🇸🇦', tts:'ar-SA',
      title:'الكردية للناطقين بالعربية',       status:'beta',   diff:'A2', order:4 },
  ];
  PAIRS.forEach(p =>
    db.prepare(`INSERT INTO language_pairs
        (id,from_code,from_name,from_flag,from_tts,dialect,name,description,status,difficulty,sort_order)
      VALUES (?,?,?,?,?,'Kurmanji',?,?,?,?,?)`)
      .run(p.id,p.code,p.name,p.flag,p.tts,p.title,
           `Lerne Kurmanji auf ${p.name}.`,p.status,p.diff,p.order)
  );

  // ── Helper ────────────────────────────────────────────────────────────────
  let _lessonOrd = {};
  function lesson(id, unit, pair, ku, tr, emoji, diff, tip) {
    if (!_lessonOrd[unit]) _lessonOrd[unit] = 0;
    _lessonOrd[unit]++;
    db.prepare(`INSERT INTO lessons
        (id,unit_id,pair_id,title_ku,title_tr,emoji,difficulty,tip,sort_order,status)
      VALUES (?,?,?,?,?,?,?,?,?,'active')`)
      .run(id,unit,pair,ku,tr,emoji,diff,tip,_lessonOrd[unit]);
  }

  function ex(lid, type, question, answer, extra={}, ord) {
    db.prepare(`INSERT INTO exercises
        (id,lesson_id,type,question,answer,options,pairs,words,hint,tts_text,sort_order)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(uuid(),lid,type,question,answer,
        extra.opts  ? JSON.stringify(extra.opts)  : null,
        extra.pairs ? JSON.stringify(extra.pairs) : null,
        extra.words ? JSON.stringify(extra.words) : null,
        extra.hint  || null,
        extra.tts   || answer,
        ord || 0);
  }

  function mc(lid, q, a, opts, hint, ord)   { ex(lid,'mc',q,a,{opts,hint},ord); }
  function ls(lid, q, a, hint, tts, ord)    { ex(lid,'listen',q,a,{hint,tts:tts||a},ord); }
  function ar(lid, q, a, words, hint, ord)  { ex(lid,'arrange',q,a,{words,hint},ord); }
  function mt(lid, q, pairs, ord)           { ex(lid,'match',q,pairs[0].k+':'+pairs[0].t,{pairs},ord); }
  function fi(lid, q, a, hint, ord)         { ex(lid,'fill',q,a,{hint},ord); }

  function vocab(pair, unit, ku, tr, pron, type='noun', diff='A1') {
    db.prepare(`INSERT INTO vocabulary
        (id,pair_id,unit_id,kurdish,translation,pronunciation,word_type,difficulty)
      VALUES (?,?,?,?,?,?,?,?)`)
      .run(uuid(),pair,unit,ku,tr,pron||null,type,diff);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DE → KU  (Deutsch → Kurmanji)
  // ════════════════════════════════════════════════════════════════════════════

  // ── Unit 1: Grundlagen ────────────────────────────────────────────────────
  db.prepare(`INSERT INTO units
      (id,pair_id,title_ku,title_tr,emoji,color,sort_order,status)
    VALUES (?,?,?,?,?,?,?,'active')`)
    .run('u1','de-ku','Destpêkên Kurdî','Grundlagen','⭐','#0B9E88',1);

  // L01 — Begrüßungen
  lesson('l01','u1','de-ku','Silav','Begrüßungen','👋','A1',
    'Silav klingt wie „si-LAV". Ein freundliches Lächeln dazu ist Pflicht!');
  mc('l01','Wie sagt man „Hallo" auf Kurmanji?','Silav',
    ['Silav','Spas','Bele','Na'],'Das erste Wort das jeder lernt.',1);
  mc('l01','Was bedeutet „Xatire te"?','Tschüss',
    ['Tschüss','Guten Morgen','Gute Nacht','Wie geht\'s?'],'Verabschiedung.',2);
  ls('l01','Hör zu und tippe das Wort','Silav','Bedeutung: Hallo','Silav',3);
  mc('l01','Wie sagt man „Guten Morgen"?','Sibe bash',
    ['Sibe bash','Shev bash','Roja bash','Evar bash'],'Sibe = Morgen, bash = gut.',4);
  ls('l01','Tippe was du hörst','Shev bash','Gute Nacht','Shev bash',5);
  ar('l01','Forme: „Guten Abend"','Evar bash',['bash','Evar'],'Evar = Abend',6);
  mt('l01','Verbinde Kurdisch und Deutsch',
    [{k:'Silav',t:'Hallo'},{k:'Spas',t:'Danke'},{k:'Bele',t:'Ja'},{k:'Na',t:'Nein'}],7);
  mc('l01','Was bedeutet „Roja te xweş be"?','Schönen Tag noch',
    ['Schönen Tag noch','Wie heißt du?','Gute Nacht','Auf Wiedersehen'],
    'Roja = Tag, xweş = schön.',8);

  // L02 — Danke & Bitte
  lesson('l02','u1','de-ku','Spas û Xêr be','Danke und Bitte','🙏','A1',
    'Gelek spas = Vielen Dank. Xêr be = Bitte/Bitteschön.');
  mc('l02','Was bedeutet „Spas"?','Danke',
    ['Danke','Bitte','Hallo','Entschuldigung'],null,1);
  mc('l02','Wie sagt man „Bitte" auf Kurdisch?','Xêr be',
    ['Xêr be','Spas','Bele','Bibore'],'Xêr = Gutes, be = sei.',2);
  ls('l02','Tippe was du hörst','Bibore','Entschuldigung','Bibore',3);
  ar('l02','Forme: „Vielen Dank"','Gelek spas',['spas','Gelek'],'Gelek = sehr/viel',4);
  mt('l02','Verbinde',
    [{k:'Bele',t:'Ja'},{k:'Na',t:'Nein'},{k:'Spas',t:'Danke'},{k:'Xêr be',t:'Bitte'}],5);
  fi('l02','Gelek ___ (Vielen Dank)','spas','spas = Dank',6);
  mc('l02','Wie antwortet man auf „Spas"?','Xêr be',
    ['Xêr be','Bele','Silav','Na'],'Xêr be = Bitte/Gern geschehen.',7);

  // L03 — Vorstellen
  lesson('l03','u1','de-ku','Nave min','Vorstellen','💬','A1',
    'Nave min Ali ye = Ich heiße Ali. Nav = Name.');
  mc('l03','Wie sagt man „Ich heiße"?','Nave min ... e',
    ['Nave min ... e','Ez ... im','Min nav ... e','Nave ... min'],null,1);
  mc('l03','Was bedeutet „Nave te çi ye?"','Wie heißt du?',
    ['Wie heißt du?','Woher kommst du?','Wie alt bist du?','Was machst du?'],null,2);
  ls('l03','Hör zu und tippe','Nave min Ali ye','Ich heiße Ali','Nave min Ali ye',3);
  ar('l03','Forme: Ich komme aus Deutschland','Ez ji Almanyayê me',
    ['ji','Almanyayê','Ez','me'],'Ez ji ... me = Ich komme aus ...',4);
  mt('l03','Verbinde',
    [{k:'Ez',t:'Ich'},{k:'Tu',t:'Du'},{k:'Nav',t:'Name'},{k:'Kurd',t:'Kurde'}],5);
  fi('l03','Nave min ___ ye (Ich heiße Ali)','Ali','Deinen Namen einsetzen.',6);
  mc('l03','Was bedeutet „Ez ji Kurdistanê me"?','Ich bin aus Kurdistan',
    ['Ich bin aus Kurdistan','Ich spreche Kurdisch','Ich bin Kurde','Ich komme gerade an'],
    'Ez ji ... me = Ich bin aus ...',7);
  ls('l03','Tippe was du hörst','Nave te çi ye','Wie heißt du?','Nave te çi ye',8);

  // L04 — Wie geht's?
  lesson('l04','u1','de-ku','Tu çawa yî?','Wie geht\'s?','😊','A1',
    'ç wird wie „tsch" ausgesprochen. Bash im = Mir geht\'s gut.');
  mc('l04','Wie fragt man „Wie geht es dir?"','Tu çawa yî?',
    ['Tu çawa yî?','Tu kî yî?','Tu li ku yî?','Tu çi dixwazî?'],null,1);
  mc('l04','Was bedeutet „Bash im, spas"?','Mir geht es gut, danke',
    ['Mir geht es gut, danke','Ich bin müde','Es geht so','Nicht gut'],null,2);
  ls('l04','Tippe was du hörst','Bash im','Mir geht es gut','Bash im',3);
  ar('l04','Forme: „Gut, danke, und dir?"','Bash im, spas, û te?',
    ['spas,','Bash','û','te?','im,'],'û = und',4);
  mt('l04','Verbinde',
    [{k:'Bash im',t:'Mir geht\'s gut'},{k:'Ne bash e',t:'Nicht gut'},
     {k:'Xweş im',t:'Ich bin wohl'},{k:'Westiyam',t:'Ich bin müde'}],5);
  mc('l04','Was sagt man wenn es einem schlecht geht?','Ne bash e',
    ['Ne bash e','Bash im','Gelek bash','Xweş im'],'Ne = nicht, bash = gut.',6);
  fi('l04','Tu çawa ___? (Wie geht\'s dir?)','yî','yî ist die Verbform für „du".',7);

  // L05 — Zahlen 1–10
  lesson('l05','u1','de-ku','Hejmar 1–10','Zahlen 1–10','🔢','A1',
    'Yek, du, se, car, pênc... Lerne sie auswendig!');
  mc('l05','Was bedeutet „Yek"?','Eins',['Eins','Zwei','Drei','Vier'],null,1);
  mc('l05','Was ist 5 auf Kurdisch?','Pênc',['Pênc','Car','Şeş','Heft'],null,2);
  ls('l05','Tippe die Zahl','Se','Drei','Se',3);
  mt('l05','Verbinde Zahlen',
    [{k:'Yek',t:'1'},{k:'Du',t:'2'},{k:'Se',t:'3'},{k:'Car',t:'4'}],4);
  ar('l05','Zähle bis drei','Yek, du, se',['se','Yek,','du,'],'In der richtigen Reihenfolge!',5);
  mc('l05','Was ist 8 auf Kurdisch?','Heşt',['Heşt','Heft','Neh','Deh'],'Heşt klingt wie „Hescht".',6);
  mt('l05','Verbinde Zahlen 5–8',
    [{k:'Pênc',t:'5'},{k:'Şeş',t:'6'},{k:'Heft',t:'7'},{k:'Heşt',t:'8'}],7);
  ls('l05','Tippe was du hörst','Deh','Zehn','Deh',8);

  // L06 — Zahlen 11–100
  lesson('l06','u1','de-ku','Hejmar 11–100','Zahlen 11–100','🔟','A1',
    'Yanzdeh = 11. Bîst = 20. Sed = 100. Das System ist regelmäßig!');
  mc('l06','Was ist 11 auf Kurdisch?','Yanzdeh',
    ['Yanzdeh','Dwanzdeh','Sêzdeh','Çardeh'],'Yanzde + h',1);
  mc('l06','Wie sagt man „20"?','Bîst',
    ['Bîst','Sih','Çil','Pêncî'],'Bîst ist eine eigene Form.',2);
  mt('l06','Verbinde Zehner',
    [{k:'Bîst',t:'20'},{k:'Sih',t:'30'},{k:'Çil',t:'40'},{k:'Pêncî',t:'50'}],3);
  mc('l06','Was ist 100 auf Kurdisch?','Sed',
    ['Sed','Hezar','Bîst','Çil'],'Sed = hundert.',4);
  ar('l06','Forme: „zwanzig und drei"','Bîst û se',['û','Bîst','se'],'û = und',5);
  ls('l06','Tippe was du hörst','Şêst','Sechzig','Şêst',6);
  fi('l06','___ û yek = 21 (Zwanzig...)','Bîst','Bîst = zwanzig',7);

  // ── Unit 2: Essen & Trinken ───────────────────────────────────────────────
  db.prepare(`INSERT INTO units
      (id,pair_id,title_ku,title_tr,emoji,color,sort_order,status)
    VALUES (?,?,?,?,?,?,?,'active')`)
    .run('u2','de-ku','Xwarin û Vexwarin','Essen und Trinken','🍎','#E8A020',2);

  // L07 — Getränke
  lesson('l07','u2','de-ku','Vexwarin','Getränke','☕','A1',
    'Av = Wasser. Çay = Tee (wie im Türkischen!). Shêr = Milch.');
  mc('l07','Was bedeutet „Av"?','Wasser',['Wasser','Tee','Kaffee','Saft'],null,1);
  mc('l07','Wie heißt „Tee" auf Kurdisch?','Çay',['Çay','Av','Qehwe','Şîr'],null,2);
  ls('l07','Tippe was du hörst','Qehwe','Kaffee','Qehwe',3);
  mt('l07','Verbinde Getränke',
    [{k:'Av',t:'Wasser'},{k:'Çay',t:'Tee'},{k:'Şîr',t:'Milch'},{k:'Qehwe',t:'Kaffee'}],4);
  mc('l07','Was ist „Ava fêkî"?','Fruchtsaft',
    ['Fruchtsaft','Mineralwasser','Limonade','Bier'],'Ava = Wasser/Saft, fêkî = Früchte.',5);
  ar('l07','Forme: „Ein Tee bitte"','Çayekî, xêr be',['xêr','Çayekî,','be'],'ekî = ein (unbestimmt)',6);
  fi('l07','Ez ___ dixwim (Ich trinke Wasser)','av','av = Wasser',7);
  mc('l07','Wie fragt man nach einem Getränk?','Tu çi dixwazî?',
    ['Tu çi dixwazî?','Tu çawa yî?','Nave te çi ye?','Li ku ye?'],
    'Dixwazî = du möchtest',8);

  // L08 — Lebensmittel
  lesson('l08','u2','de-ku','Xwarin','Lebensmittel','🥖','A1',
    'Nan = Brot. Dieses Wort ist heilig in der Kurdischen Kultur.');
  mc('l08','Was ist „Nan"?','Brot',['Brot','Käse','Ei','Fleisch'],null,1);
  mc('l08','Wie heißt „Apfel"?','Sêv',['Sêv','Moz','Tirî','Gûz'],null,2);
  ls('l08','Tippe was du hörst','Gosht','Fleisch','Gosht',3);
  mt('l08','Verbinde Lebensmittel',
    [{k:'Nan',t:'Brot'},{k:'Sêv',t:'Apfel'},{k:'Hêk',t:'Ei'},{k:'Penîr',t:'Käse'}],4);
  mc('l08','Was ist „Rûn"?','Butter/Öl',
    ['Butter/Öl','Milch','Honig','Salz'],'Rûn = Fett/Butter/Öl.',5);
  ar('l08','Forme: „Ich esse Brot"','Ez nan dixwim',
    ['dixwim','Ez','nan'],'dixwim = ich esse',6);
  mt('l08','Verbinde Früchte und Gemüse',
    [{k:'Tirî',t:'Trauben'},{k:'Gûz',t:'Walnuss'},{k:'Moz',t:'Banane'},{k:'Incîr',t:'Feige'}],7);
  fi('l08','Ez ___ dixwim (Ich esse Brot)','nan','nan = Brot',8);

  // L09 — Im Restaurant
  lesson('l09','u2','de-ku','Li Xwaringehê','Im Restaurant','🍽️','A1',
    'Tu çi dixwazî? = Was möchtest du? Eine der nützlichsten Fragen!');
  mc('l09','Was bedeutet „Tu birçî yî?"','Bist du hungrig?',
    ['Bist du hungrig?','Bist du durstig?','Hast du Schmerzen?','Bist du müde?'],
    'Birçî = hungrig',1);
  mc('l09','Wie sagt man „Die Rechnung bitte"?','Hesab, xêr be',
    ['Hesab, xêr be','Xwarin, spas','Av bîne','Çi heye?'],
    'Hesab = Rechnung',2);
  ls('l09','Hör zu und tippe','Ez birçî me','Ich bin hungrig','Ez birçî me',3);
  mt('l09','Verbinde im Restaurant',
    [{k:'Hesab',t:'Rechnung'},{k:'Menuye',t:'Speisekarte'},
     {k:'Xwarin',t:'Essen'},{k:'Vexwarin',t:'Getränk'}],4);
  ar('l09','Forme: „Was kostet das?"','Ev çend e?',
    ['Ev','e?','çend'],'Ev = das, çend = wie viel',5);
  mc('l09','Wie sagt man „Lecker"?','Xweş e',
    ['Xweş e','Xirap e','Baş e','Giran e'],'Xweş = schön/lecker',6);
  fi('l09','Hesab, ___ be (Rechnung bitte)','xêr','xêr be = bitte',7);

  // L10 — Mengen & Einkaufen
  lesson('l10','u2','de-ku','Kirîn û Firotin','Einkaufen','🛒','A1',
    'Çiqas e? = Wie viel kostet es? Giran = teuer. Erzan = günstig.');
  mc('l10','Was bedeutet „Çiqas e?"','Wie viel kostet es?',
    ['Wie viel kostet es?','Was ist das?','Wie heißt du?','Wo ist das?'],null,1);
  mc('l10','Was bedeutet „Giran"?','Teuer',['Teuer','Günstig','Schön','Neu'],null,2);
  ls('l10','Tippe was du hörst','Erzan','Günstig/Billig','Erzan',3);
  mt('l10','Verbinde beim Einkaufen',
    [{k:'Giran',t:'Teuer'},{k:'Erzan',t:'Günstig'},{k:'Nû',t:'Neu'},{k:'Kevin',t:'Alt'}],4);
  ar('l10','Forme: „Das ist zu teuer"','Ev pir giran e',
    ['giran','Ev','e','pir'],'pir = sehr',5);
  mc('l10','Wie sagt man „Ich kaufe das"?','Ez vê dikrim',
    ['Ez vê dikrim','Ez vê dixwim','Ez vê dibînim','Ez vê dikim'],
    'Dikrim = ich kaufe',6);
  fi('l10','Ev pir ___ e (Das ist sehr teuer)','giran','giran = teuer',7);

  // ── Unit 3: Familie & Menschen ────────────────────────────────────────────
  db.prepare(`INSERT INTO units
      (id,pair_id,title_ku,title_tr,emoji,color,sort_order,status)
    VALUES (?,?,?,?,?,?,?,'active')`)
    .run('u3','de-ku','Malbat û Mirov','Familie und Menschen','👨‍👩‍👧','#D94040',3);

  // L11 — Familie
  lesson('l11','u3','de-ku','Malbat','Familie','👪','A1',
    'Bav = Vater, Dê = Mutter. Familie ist das Herz der kurdischen Gesellschaft.');
  mc('l11','Was bedeutet „Bav"?','Vater',['Vater','Mutter','Bruder','Schwester'],null,1);
  mc('l11','Wie heißt „Mutter"?','Dê',['Dê','Bav','Bira','Xwişk'],null,2);
  ls('l11','Tippe was du hörst','Xwişk','Schwester','Xwişk',3);
  mt('l11','Verbinde Familie',
    [{k:'Bav',t:'Vater'},{k:'Dê',t:'Mutter'},{k:'Bira',t:'Bruder'},{k:'Xwişk',t:'Schwester'}],4);
  mc('l11','Was bedeutet „Apê"?','Onkel (väterlicherseits)',
    ['Onkel (väterlicherseits)','Onkel (mütterlicherseits)','Großvater','Großmutter'],
    'Kurdisch unterscheidet zwischen väterlichem und mütterlichem Onkel.',5);
  ar('l11','Forme: „Mein Vater heißt"','Nave bavê min ... e',
    ['bavê','Nave','e','min','...'],'bavê min = mein Vater',6);
  mt('l11','Verbinde erweiterte Familie',
    [{k:'Bapîr',t:'Großvater'},{k:'Dapîr',t:'Großmutter'},
     {k:'Apê',t:'Onkel (väterl.)'},{k:'Xaltî',t:'Tante (mütterl.)'}],7);
  fi('l11','___ min Xelîl e (Mein Vater heißt Xelil)','Bavê','bavê min = mein Vater',8);

  // L12 — Körper
  lesson('l12','u3','de-ku','Laş','Körper','🫀','A1',
    'Ser = Kopf, Çav = Auge. Wichtig beim Arzt!');
  mc('l12','Was bedeutet „Ser"?','Kopf',['Kopf','Auge','Hand','Fuß'],null,1);
  mc('l12','Wie heißt „Auge"?','Çav',['Çav','Guh','Dev','Poz'],null,2);
  mt('l12','Verbinde Körperteile',
    [{k:'Ser',t:'Kopf'},{k:'Çav',t:'Auge'},{k:'Guh',t:'Ohr'},{k:'Dev',t:'Mund'}],3);
  ls('l12','Tippe was du hörst','Dil','Herz','Dil',4);
  ar('l12','Forme: „Mein Kopf tut weh"','Serê min diêşe',
    ['diêşe','min','Serê'],'diêşe = schmerzt',5);
  mc('l12','Was bedeutet „Destê min diêşe"?','Meine Hand tut weh',
    ['Meine Hand tut weh','Mein Fuß tut weh','Mein Kopf tut weh','Mein Rücken tut weh'],
    'Dest = Hand',6);
  mt('l12','Verbinde weitere Körperteile',
    [{k:'Dest',t:'Hand'},{k:'Lingê',t:'Bein/Fuß'},{k:'Pişt',t:'Rücken'},{k:'Zik',t:'Bauch'}],7);

  // L13 — Berufe
  lesson('l13','u3','de-ku','Kar û Pîşe','Berufe','💼','A1',
    'Doktor = Arzt. Mamoste = Lehrer. Polîs = Polizist.');
  mc('l13','Was bedeutet „Mamoste"?','Lehrer/in',
    ['Lehrer/in','Arzt/Ärztin','Ingenieur','Bauer'],null,1);
  mc('l13','Wie heißt „Arzt"?','Doktor',['Doktor','Mamoste','Polîs','Esnaf'],null,2);
  mt('l13','Verbinde Berufe',
    [{k:'Doktor',t:'Arzt'},{k:'Mamoste',t:'Lehrer'},{k:'Polîs',t:'Polizist'},{k:'Çandinî',t:'Bauer'}],3);
  ls('l13','Tippe was du hörst','Endezyar','Ingenieur','Endezyar',4);
  ar('l13','Forme: „Ich bin Lehrer"','Ez mamoste me',
    ['me','Ez','mamoste'],'Ez ... me = Ich bin ...',5);
  mc('l13','Was bedeutet „Tu çi kar dikî?"','Was arbeitest du?',
    ['Was arbeitest du?','Wo arbeitest du?','Wann arbeitest du?','Wie viel verdienst du?'],
    'kar = Arbeit, dikî = du machst',6);
  fi('l13','Ez ___ me (Ich bin Arzt)','doktor','doktor = Arzt',7);

  // L14 — Beschreibungen
  lesson('l14','u3','de-ku','Vegotin','Beschreibungen','🎨','A1',
    'Mezin = groß, Biçûk = klein, Spehî = schön. Adjektive kommen nach dem Substantiv!');
  mc('l14','Was bedeutet „Mezin"?','Groß',['Groß','Klein','Schön','Alt'],null,1);
  mc('l14','Was ist das Gegenteil von „Mezin"?','Biçûk',
    ['Biçûk','Spehî','Nû','Giran'],'Biçûk = klein',2);
  mt('l14','Verbinde Gegensätze',
    [{k:'Mezin',t:'Groß'},{k:'Biçûk',t:'Klein'},{k:'Germ',t:'Heiß'},{k:'Sar',t:'Kalt'}],3);
  ls('l14','Tippe was du hörst','Spehî','Schön','Spehî',4);
  ar('l14','Forme: „Das Haus ist groß"','Xanî mezin e',
    ['mezin','Xanî','e'],'Xanî = Haus',5);
  mc('l14','Was bedeutet „Ev keça spehî ye"?','Dieses Mädchen ist schön',
    ['Dieses Mädchen ist schön','Dieses Mädchen ist groß',
     'Dieses Mädchen ist nett','Dieses Mädchen ist klug'],
    'Keç = Mädchen, spehî = schön.',6);
  mt('l14','Verbinde weitere Adjektive',
    [{k:'Nû',t:'Neu'},{k:'Kevin',t:'Alt'},{k:'Baş',t:'Gut'},{k:'Xirap',t:'Schlecht'}],7);

  // ── Unit 4: Alltag & Orte ─────────────────────────────────────────────────
  db.prepare(`INSERT INTO units
      (id,pair_id,title_ku,title_tr,emoji,color,sort_order,status)
    VALUES (?,?,?,?,?,?,?,'active')`)
    .run('u4','de-ku','Rojane û Cih','Alltag und Orte','🏙️','#6B48FF',4);

  // L15 — Uhrzeit
  lesson('l15','u4','de-ku','Demjimêr','Uhrzeit','⏰','A1',
    'Saet = Uhr/Stunde. Saet çend e? = Wie viel Uhr ist es?');
  mc('l15','Wie fragt man nach der Uhrzeit?','Saet çend e?',
    ['Saet çend e?','Roj çi ye?','Heft çi ye?','Dema çi ye?'],
    'Saet = Uhr',1);
  mc('l15','Was bedeutet „Saet du ye"?','Es ist 2 Uhr',
    ['Es ist 2 Uhr','Es ist 12 Uhr','Es ist 20 Uhr','Es ist 2:30'],null,2);
  ls('l15','Tippe was du hörst','Saet sê û nîv e','Es ist halb vier','Saet sê û nîv e',3);
  mt('l15','Verbinde Tageszeiten',
    [{k:'Sibeh',t:'Morgen'},{k:'Nîvro',t:'Mittag'},{k:'Êvar',t:'Abend'},{k:'Şev',t:'Nacht'}],4);
  ar('l15','Forme: „Es ist 3 Uhr"','Saet sê ye',['ye','Saet','sê'],'Saet = Uhr, ye = ist',5);
  mc('l15','Was bedeutet „Nîvro"?','Mittag',['Mittag','Mitternacht','Nachmittag','Morgen'],
    'Nîv = halb, ro = Tag',6);
  fi('l15','Saet ___ e? (Wie viel Uhr ist es?)','çend','çend = wie viel',7);

  // L16 — Wochentage
  lesson('l16','u4','de-ku','Rojên Hefteyê','Wochentage','📅','A1',
    'Duşem = Montag. Hefte = Woche. Die Tage folgen einem logischen System!');
  mc('l16','Was ist „Duşem"?','Montag',['Montag','Dienstag','Mittwoch','Donnerstag'],null,1);
  mt('l16','Verbinde Wochentage 1',
    [{k:'Duşem',t:'Montag'},{k:'Sêşem',t:'Dienstag'},{k:'Çarşem',t:'Mittwoch'},{k:'Pêncşem',t:'Donnerstag'}],2);
  mc('l16','Was bedeutet „Înî"?','Freitag',['Freitag','Samstag','Sonntag','Donnerstag'],
    'Înî ist der heilige Tag im Islam.',3);
  mt('l16','Verbinde Wochentage 2',
    [{k:'Înî',t:'Freitag'},{k:'Şemî',t:'Samstag'},{k:'Yekşem',t:'Sonntag'}],4);
  ar('l16','Forme: „Heute ist Montag"','Îro Duşem e',['Duşem','Îro','e'],'Îro = heute',5);
  ls('l16','Tippe was du hörst','Sêşem','Dienstag','Sêşem',6);
  fi('l16','___ Duşem e (Heute ist Montag)','Îro','Îro = heute',7);
  mc('l16','Was bedeutet „Hefteyê bê"?','Nächste Woche',
    ['Nächste Woche','Letzte Woche','Diese Woche','Jeden Montag'],
    'Bê = kommend/nächst',8);

  // L17 — Wetter
  lesson('l17','u4','de-ku','Hewa','Wetter','☀️','A1',
    'Hewa çawa ye? = Wie ist das Wetter? Germ = heiß, Sar = kalt.');
  mc('l17','Wie fragt man nach dem Wetter?','Hewa çawa ye?',
    ['Hewa çawa ye?','Baranê dibare?','Hewaya îro çi ye?','Zivistan e?'],null,1);
  mc('l17','Was bedeutet „Hewa germ e"?','Das Wetter ist heiß',
    ['Das Wetter ist heiß','Das Wetter ist kalt','Es regnet','Es schneit'],null,2);
  mt('l17','Verbinde Wetter',
    [{k:'Baran',t:'Regen'},{k:'Berf',t:'Schnee'},{k:'Tav',t:'Sonne'},{k:'Ba',t:'Wind'}],3);
  ls('l17','Tippe was du hörst','Hewa sar e','Das Wetter ist kalt','Hewa sar e',4);
  ar('l17','Forme: „Es regnet heute"','Îro baran dibare',
    ['Îro','dibare','baran'],'dibare = fällt/regnet',5);
  mc('l17','Was bedeutet „Ewr"?','Wolke',['Wolke','Sonne','Regen','Donner'],null,6);
  fi('l17','Hewa ___ e (Das Wetter ist schön)','xweş','xweş = schön/angenehm',7);

  // L18 — Orte in der Stadt
  lesson('l18','u4','de-ku','Bajêr','In der Stadt','🏛️','A1',
    'Bazêr = Markt/Basar. Das Herz jeder kurdischen Stadt!');
  mc('l18','Was bedeutet „Bazêr"?','Markt/Basar',
    ['Markt/Basar','Krankenhaus','Schule','Moschee'],null,1);
  mc('l18','Wie heißt „Krankenhaus"?','Nexweşxane',
    ['Nexweşxane','Dibistan','Camî','Pirtûkxane'],
    'Nexweş = krank, xane = Haus',2);
  mt('l18','Verbinde Orte',
    [{k:'Dibistan',t:'Schule'},{k:'Camî',t:'Moschee'},
     {k:'Pirtûkxane',t:'Bibliothek'},{k:'Nexweşxane',t:'Krankenhaus'}],3);
  ls('l18','Tippe was du hörst','Balafirgeha','Flughafen','Balafirgeha',4);
  ar('l18','Forme: „Wo ist die Schule?"','Dibistan li ku ye?',
    ['ku','Dibistan','li','ye?'],'li ku = wo',5);
  mc('l18','Was bedeutet „Li ku ye?"','Wo ist es?',
    ['Wo ist es?','Was ist es?','Wann ist es?','Wer ist da?'],
    'li ku = wo',6);
  fi('l18','Dibistan li ___ ye? (Wo ist die Schule?)','ku','ku = wo',7);
  mc('l18','Was ist „Rêya xwe winda kir"?','Ich habe mich verlaufen',
    ['Ich habe mich verlaufen','Ich suche den Bahnhof',
     'Ich bin neu hier','Können Sie mir helfen?'],
    'Rê = Weg, winda kirin = verlieren',8);

  // L19 — Wegbeschreibung
  lesson('l19','u4','de-ku','Rêya Xwe Nîşan De','Wegbeschreibung','🗺️','A1',
    'Rast = rechts, Çep = links, Rêkxistin = geradeaus. Überlebenswichtig!');
  mc('l19','Was bedeutet „Rast"?','Rechts',['Rechts','Links','Geradeaus','Zurück'],null,1);
  mc('l19','Was bedeutet „Çep"?','Links',['Links','Rechts','Geradeaus','Oben'],null,2);
  mt('l19','Verbinde Richtungen',
    [{k:'Rast',t:'Rechts'},{k:'Çep',t:'Links'},{k:'Rêkxistin',t:'Geradeaus'},{k:'Vegerîn',t:'Zurück'}],3);
  ls('l19','Tippe was du hörst','Bigere çepê','Geh nach links','Bigere çepê',4);
  ar('l19','Forme: „Nehmen Sie rechts"','Bigere rastê',['Bigere','rastê'],'Bigere = geh/nehmen Sie',5);
  mc('l19','Wie fragt man nach dem Weg zur Schule?','Dibistan li ku ye?',
    ['Dibistan li ku ye?','Dibistan çawa ye?','Dibistan dûr e?','Dibistan nêzîk e?'],null,6);
  fi('l19','Bigere ___ê (Geh nach rechts)','rast','rast = rechts',7);

  // ── Unit 5: Sprache & Kommunikation ──────────────────────────────────────
  db.prepare(`INSERT INTO units
      (id,pair_id,title_ku,title_tr,emoji,color,sort_order,status)
    VALUES (?,?,?,?,?,?,?,'active')`)
    .run('u5','de-ku','Ziman û Ragihandin','Sprache und Kommunikation','🗣️','#1CB0F6',5);

  // L20 — Im Gespräch
  lesson('l20','u5','de-ku','Di Axaftinê de','Im Gespräch','💭','A1',
    'Tu Kurdî dizanî? = Kannst du Kurdisch? Ez hinekî Kurdî dizanim = Ich kann ein bisschen Kurdisch.');
  mc('l20','Was bedeutet „Tu Kurdî dizanî?"','Kannst du Kurdisch?',
    ['Kannst du Kurdisch?','Sprichst du Deutsch?','Wie heißt das auf Kurdisch?','Verstehst du mich?'],null,1);
  mc('l20','Wie sagt man „Ich verstehe nicht"?','Ez fêm nakim',
    ['Ez fêm nakim','Ez dizanim','Ez fehm dikim','Ez naaxivim'],
    'fêm kirin = verstehen, na = nicht',2);
  ls('l20','Tippe was du hörst','Hêdî biaxive','Sprechen Sie langsam','Hêdî biaxive',3);
  mt('l20','Verbinde Kommunikation',
    [{k:'Axaftin',t:'Sprechen'},{k:'Fêm kirin',t:'Verstehen'},
     {k:'Xwendin',t:'Lesen'},{k:'Nivîsîn',t:'Schreiben'}],4);
  ar('l20','Forme: „Wiederholen Sie bitte"','Ji nû ve bêje, xêr be',
    ['xêr','Ji','bêje,','nû','be','ve'],'Ji nû ve = nochmal',5);
  mc('l20','Was bedeutet „Ez hinekî Kurdî dizanim"?','Ich kann ein bisschen Kurdisch',
    ['Ich kann ein bisschen Kurdisch','Ich lerne Kurdisch',
     'Ich spreche kein Kurdisch','Ich will Kurdisch lernen'],
    'hinekî = ein bisschen',6);
  fi('l20','Ez fêm ___im (Ich verstehe nicht)','nak','na + -(a)k(im) = nicht',7);

  // L21 — Fragen stellen
  lesson('l21','u5','de-ku','Pirs Kirin','Fragen stellen','❓','A1',
    'Çi = Was, Kî = Wer, Çawa = Wie, Li ku = Wo, Kengê = Wann, Çima = Warum.');
  mc('l21','Was bedeutet „Çi"?','Was',['Was','Wer','Wie','Wo'],null,1);
  mt('l21','Verbinde Fragewörter',
    [{k:'Çi',t:'Was'},{k:'Kî',t:'Wer'},{k:'Çawa',t:'Wie'},{k:'Li ku',t:'Wo'}],2);
  ls('l21','Tippe was du hörst','Kengê?','Wann?','Kengê',3);
  mc('l21','Was bedeutet „Çima"?','Warum',['Warum','Wie','Was','Wann'],null,4);
  ar('l21','Forme: „Was ist das?"','Ev çi ye?',['Ev','ye?','çi'],'ye = ist',5);
  mt('l21','Verbinde weitere Fragewörter',
    [{k:'Kengê',t:'Wann'},{k:'Çima',t:'Warum'},{k:'Çiqas',t:'Wie viel'},{k:'Kîjan',t:'Welcher'}],6);
  fi('l21','Ev ___ ye? (Was ist das?)','çi','çi = was',7);

  // L22 — Verben im Alltag
  lesson('l22','u5','de-ku','Lêker','Wichtige Verben','⚡','A1',
    'Ez diçim = Ich gehe. Ez têm = Ich komme. Die häufigsten Verben im Alltag.');
  mc('l22','Was bedeutet „Ez diçim"?','Ich gehe',['Ich gehe','Ich komme','Ich sitze','Ich schlafe'],null,1);
  mc('l22','Wie sagt man „Ich komme"?','Ez têm',
    ['Ez têm','Ez diçim','Ez rûdim','Ez rakim'],null,2);
  mt('l22','Verbinde Verben',
    [{k:'Diçim',t:'Ich gehe'},{k:'Têm',t:'Ich komme'},
     {k:'Dixwim',t:'Ich esse'},{k:'Vedixwim',t:'Ich trinke'}],3);
  ls('l22','Tippe was du hörst','Ez radizim','Ich schlafe','Ez radizim',4);
  ar('l22','Forme: „Ich gehe zum Markt"','Ez diçim bazêrê',
    ['bazêrê','Ez','diçim'],'bazêrê = zum Markt (Kasus)',5);
  mc('l22','Was bedeutet „Ez dixwazim"?','Ich möchte',
    ['Ich möchte','Ich habe','Ich weiß','Ich kann'],
    'Dixwazim = ich möchte/will',6);
  fi('l22','Ez ___ diçim (Ich gehe heute)','îro','Wortstellung: Subjekt + Zeitadverb + Verb',7);
  mc('l22','Wie sagt man „Kannst du kommen?"','Tu dikarî bêyî?',
    ['Tu dikarî bêyî?','Tu dikarî biçî?','Tu dixwazî bêyî?','Tu diçî?'],
    'dikarî = du kannst, bêyî = kommen',8);

  // L23 — Vergangenheit einfach
  lesson('l23','u5','de-ku','Boriya Sade','Einfache Vergangenheit','📖','A2',
    'Min xwar = Ich aß. Im Kurdischen wird die Vergangenheit anders gebildet!');
  mc('l23','Was bedeutet „Min xwar"?','Ich aß',['Ich aß','Ich esse','Ich werde essen','Ich habe gegessen'],
    'In der Vergangenheit: Min (ich) + Verb',1);
  mc('l23','Wie sagt man „Er kam"?','Ew hat',
    ['Ew hat','Ew tê','Ew diçe','Ew çû'],'hat = kam (Vergangenheit von tên)',2);
  mt('l23','Verbinde Vergangenheitsformen',
    [{k:'Min xwar',t:'Ich aß'},{k:'Ew hat',t:'Er/Sie kam'},
     {k:'Ew çû',t:'Er/Sie ging'},{k:'Min got',t:'Ich sagte'}],3);
  ls('l23','Tippe was du hörst','Min got','Ich sagte','Min got',4);
  ar('l23','Forme: „Ich aß Brot"','Min nan xwar',
    ['xwar','Min','nan'],'Min = Ich (Vergangenheit)',5);
  mc('l23','Was ist die Vergangenheit von „diçim" (ich gehe)?','Min çû',
    ['Min çû','Min hat','Min xwar','Min got'],
    'çû = ging',6);
  fi('l23','___ nan xwar (Ich aß Brot)','Min','In der Vergangenheit: Min (Subjekt als Objekt)',7);

  // L24 — Zukunft & Pläne
  lesson('l24','u5','de-ku','Pêşeroj','Zukunft und Pläne','🌅','A2',
    'Dê biçim = Ich werde gehen. Dê = wird (Zukunftsmerkmal).');
  mc('l24','Was bedeutet „Dê biçim"?','Ich werde gehen',
    ['Ich werde gehen','Ich bin gegangen','Ich gehe','Ich soll gehen'],
    'Dê = wird/werden (Zukunft)',1);
  mc('l24','Wie sagt man „Ich werde essen"?','Dê bixwim',
    ['Dê bixwim','Dê biçim','Min xwar','Ez dixwim'],null,2);
  mt('l24','Verbinde Zukunftsformen',
    [{k:'Dê biçim',t:'Ich werde gehen'},{k:'Dê bêm',t:'Ich werde kommen'},
     {k:'Dê bixwim',t:'Ich werde essen'},{k:'Dê bixwazim',t:'Ich werde wollen'}],3);
  ls('l24','Tippe was du hörst','Dê bêm','Ich werde kommen','Dê bêm',4);
  ar('l24','Forme: „Ich werde morgen kommen"','Sibê dê bêm',
    ['bêm','Sibê','dê'],'Sibê = morgen',5);
  mc('l24','Was bedeutet „Plana te çi ye?"','Was ist dein Plan?',
    ['Was ist dein Plan?','Wohin gehst du?','Wann kommst du?','Was machst du?'],
    'Plan = Plan, te = dein',6);
  fi('l24','___ biçim serdana te (Ich werde dich besuchen kommen)','Dê','Dê markiert Zukunft',7);

  // L25 — Kurze Gespräche
  lesson('l25','u5','de-ku','Axaftinên Kurt','Kurze Gespräche','🗣️','A1',
    'Kombination aller bisher gelernter Strukturen in realen Gesprächssituationen.');
  mc('l25','Wie stellt man sich vollständig vor?','Navê min X e, ez ji Y me.',
    ['Navê min X e, ez ji Y me.','Ez X me, nav Y e.',
     'Min nav X e, ji Y me.','Navê te X e?'],null,1);
  ar('l25','Forme eine vollständige Begrüßung','Silav! Navê min Ali ye.',
    ['Navê','Ali','Silav!','ye.','min'],'Silav zuerst, dann Vorstellung',2);
  mt('l25','Verbinde: Frage und Antwort',
    [{k:'Tu çawa yî?',t:'Bash im, spas.'},{k:'Navê te çi ye?',t:'Navê min Ali ye.'},
     {k:'Tu ji ku yî?',t:'Ez ji Kurdistanê me.'},{k:'Tu çi kar dikî?',t:'Ez mamoste me.'}],3);
  ls('l25','Tippe diesen Satz','Gelek xweş bû','Es war sehr schön (Abschiedsformel)','Gelek xweş bû',4);
  mc('l25','Was sagt man zum Abschied an einem Abend?','Şev baş',
    ['Şev baş','Sibe baş','Xatirê te','Silav'],
    'Şev baş = Gute Nacht',5);
  ar('l25','Forme: „Danke, ich muss jetzt gehen"','Spas, divê ez biçim niha',
    ['divê','niha','Spas,','ez','biçim'],'divê = muss',6);
  fi('l25','___, gelek xweş bû! (Tschüss, es war sehr schön!)','Xatirê te','Abschiedsformel',7);

  // L26 — Abschlusslektion
  lesson('l26','u5','de-ku','Bidawîkirina A1','A1 Abschluss','🏆','A1',
    'Herzlichen Glückwunsch! Du hast die Grundlagen des Kurmanji gemeistert.');
  mt('l26','Große Wiederholung: Begrüßungen',
    [{k:'Silav',t:'Hallo'},{k:'Sibe bash',t:'Guten Morgen'},
     {k:'Xatirê te',t:'Tschüss'},{k:'Şev baş',t:'Gute Nacht'}],1);
  mt('l26','Große Wiederholung: Familie',
    [{k:'Bav',t:'Vater'},{k:'Dê',t:'Mutter'},
     {k:'Bira',t:'Bruder'},{k:'Xwişk',t:'Schwester'}],2);
  mt('l26','Große Wiederholung: Zahlen',
    [{k:'Yek',t:'1'},{k:'Pênc',t:'5'},{k:'Deh',t:'10'},{k:'Bîst',t:'20'}],3);
  mt('l26','Große Wiederholung: Verben',
    [{k:'Diçim',t:'Ich gehe'},{k:'Têm',t:'Ich komme'},
     {k:'Dixwim',t:'Ich esse'},{k:'Fêm dikim',t:'Ich verstehe'}],4);
  ar('l26','Abschlusssatz: Ich lerne Kurdisch','Ez Kurdî hîn dibim',
    ['hîn','Kurdî','Ez','dibim'],'hîn bûn = lernen',5);
  mc('l26','Was ist der Plural von „Silav"?','Silav geht als Gruß an mehrere',
    ['Silav geht als Gruß an mehrere','Silavên','Silavan','Silavar'],
    'Silav bleibt gleich — es ist ein Grußwort.',6);
  ls('l26','Zum Abschluss: Tippe diesen Satz','Kurdî zimanekî xweş e',
    'Kurdisch ist eine schöne Sprache','Kurdî zimanekî xweş e',7);
  mt('l26','Finale Wiederholung: Alltag',
    [{k:'Xanî',t:'Haus'},{k:'Bajêr',t:'Stadt'},{k:'Dibistan',t:'Schule'},{k:'Bazêr',t:'Markt'}],8);

  // ════════════════════════════════════════════════════════════════════════════
  // TR → KU  (Türkçe → Kurmanji)
  // ════════════════════════════════════════════════════════════════════════════

  db.prepare(`INSERT INTO units
      (id,pair_id,title_ku,title_tr,emoji,color,sort_order,status)
    VALUES (?,?,?,?,?,?,?,'active')`)
    .run('tr1','tr-ku','Destpêkên Kurdî','Temel Kürtçe','⭐','#0B9E88',1);

  db.prepare(`INSERT INTO units
      (id,pair_id,title_ku,title_tr,emoji,color,sort_order,status)
    VALUES (?,?,?,?,?,?,?,'active')`)
    .run('tr2','tr-ku','Rojane','Günlük Hayat','🏙️','#E8A020',2);

  // TR L01
  lesson('tl01','tr1','tr-ku','Silav','Selamlaşma','👋','A1','Silav = Merhaba. Spas = Teşekkür.');
  mc('tl01','Kürtçede "Merhaba" nasıl denir?','Silav',['Silav','Spas','Bele','Na'],null,1);
  mc('tl01','"Xatirê te" ne demek?','Güle güle',['Güle güle','Günaydın','İyi geceler','Nasılsın?'],null,2);
  ls('tl01','Duyduğunu yaz','Silav','Merhaba anlamına gelir','Silav',3);
  mt('tl01','Eşleştir',
    [{k:'Silav',t:'Merhaba'},{k:'Spas',t:'Teşekkür'},{k:'Bele',t:'Evet'},{k:'Na',t:'Hayır'}],4);
  ar('tl01','Cümle kur: "Günaydın"','Sibê bash',['bash','Sibê'],'Sibê = Sabah, bash = iyi',5);
  mc('tl01','"Şev bash" ne demek?','İyi geceler',
    ['İyi geceler','Günaydın','İyi akşamlar','Hoşça kal'],null,6);
  fi('tl01','___ bash (Günaydın)','Sibê','Sibê = sabah',7);

  // TR L02
  lesson('tl02','tr1','tr-ku','Nave min','Kendini tanıtma','💬','A1','Nave min ... e = Benim adım ...');
  mc('tl02','"Nave min Ali ye" ne demek?','Benim adım Ali',
    ['Benim adım Ali','Senin adın Ali','Adım ne?','Ali nerede?'],null,1);
  mc('tl02','"Nave te çi ye?" ne demek?','Adın ne?',
    ['Adın ne?','Nerelisin?','Kaç yaşındasın?','Ne iş yapıyorsun?'],null,2);
  ls('tl02','Duyduğunu yaz','Nave min Kemal ye','Benim adım Kemal','Nave min Kemal ye',3);
  mt('tl02','Eşleştir',
    [{k:'Ez',t:'Ben'},{k:'Tu',t:'Sen'},{k:'Nav',t:'Ad'},{k:'Kurd',t:'Kürt'}],4);
  ar('tl02','Cümle kur: "Benim adım ..."','Nave min ... e',['min','e','Nave','...'],null,5);
  fi('tl02','Nave ___ Ali ye (Benim adım Ali)','min','min = benim',6);

  // TR L03
  lesson('tl03','tr1','tr-ku','Hejmar','Sayılar','🔢','A1','Yek=1, Du=2, Se=3...');
  mc('tl03','"Yek" kaçtır?','1',['1','2','3','4'],null,1);
  mt('tl03','Sayıları eşleştir',
    [{k:'Yek',t:'1'},{k:'Du',t:'2'},{k:'Se',t:'3'},{k:'Car',t:'4'}],2);
  ls('tl03','Duyduğunu yaz','Pênc','5','Pênc',3);
  mt('tl03','5-8 sayılarını eşleştir',
    [{k:'Pênc',t:'5'},{k:'Şeş',t:'6'},{k:'Heft',t:'7'},{k:'Heşt',t:'8'}],4);
  ar('tl03','1\'den 3\'e say','Yek, du, se',['se','Yek,','du,'],'Sırayla!',5);
  mc('tl03','"Deh" kaçtır?','10',['10','9','8','7'],null,6);
  fi('tl03','___, du, se (Bir, iki, üç)','Yek','Yek = bir',7);

  // TR L04
  lesson('tl04','tr1','tr-ku','Malbat','Aile','👪','A1','Bav=Baba, Dê=Anne.');
  mc('tl04','"Bav" ne demek?','Baba',['Baba','Anne','Ağabey','Kız kardeş'],null,1);
  mc('tl04','"Dê" ne demek?','Anne',['Anne','Baba','Abla','Kardeş'],null,2);
  mt('tl04','Aileyi eşleştir',
    [{k:'Bav',t:'Baba'},{k:'Dê',t:'Anne'},{k:'Bira',t:'Erkek kardeş'},{k:'Xwişk',t:'Kız kardeş'}],3);
  ls('tl04','Duyduğunu yaz','Bapîr','Büyükbaba','Bapîr',4);
  ar('tl04','Cümle kur: "Babamın adı Hesen"','Navê bavê min Hesen e',
    ['min','Hesen','Navê','e','bavê'],'bavê min = babam',5);
  fi('tl04','___ min Hesen e (Babamın adı Hesen)','Navê bavê','navê bavê min = babamın adı',6);
  mt('tl04','Geniş aileyi eşleştir',
    [{k:'Bapîr',t:'Büyükbaba'},{k:'Dapîr',t:'Büyükanne'},{k:'Ap',t:'Amca'},{k:'Xal',t:'Dayı'}],7);

  // TR L05 — Yeme içme
  lesson('tl05','tr2','tr-ku','Xwarin û Vexwarin','Yiyecek ve İçecek','🍎','A1','Av=Su, Çay=Çay, Nan=Ekmek.');
  mc('tl05','"Av" ne demek?','Su',['Su','Çay','Kahve','Süt'],null,1);
  mc('tl05','"Nan" ne demek?','Ekmek',['Ekmek','Peynir','Yumurta','Et'],null,2);
  mt('tl05','Yiyecek ve içecekleri eşleştir',
    [{k:'Av',t:'Su'},{k:'Çay',t:'Çay'},{k:'Nan',t:'Ekmek'},{k:'Penîr',t:'Peynir'}],3);
  ls('tl05','Duyduğunu yaz','Gosht','Et','Gosht',4);
  ar('tl05','Cümle kur: "Ben su içiyorum"','Ez av vedixwim',
    ['av','Ez','vedixwim'],'vedixwim = içiyorum',5);
  fi('tl05','Ez av ___im (Ben su içiyorum)','vedixw','vedixwim = içiyorum',6);
  mc('tl05','"Birçî me" ne demek?','Açım',['Açım','Susadım','Tokum','Yorgunum'],'Birçî = aç',7);

  // TR L06 — Renkler & Sıfatlar
  lesson('tl06','tr2','tr-ku','Reng û Rengdêr','Renkler ve Sıfatlar','🎨','A1','Sor=Kırmızı, Kesk=Yeşil, Shin=Mavi.');
  mc('tl06','"Sor" ne demek?','Kırmızı',['Kırmızı','Mavi','Yeşil','Siyah'],null,1);
  mt('tl06','Renkleri eşleştir',
    [{k:'Sor',t:'Kırmızı'},{k:'Kesk',t:'Yeşil'},{k:'Shin',t:'Mavi'},{k:'Spi',t:'Beyaz'}],2);
  ls('tl06','Duyduğunu yaz','Resh','Siyah','Resh',3);
  mc('tl06','"Mezin" ne demek?','Büyük',['Büyük','Küçük','Uzun','Kısa'],null,4);
  mt('tl06','Sıfatları eşleştir',
    [{k:'Mezin',t:'Büyük'},{k:'Biçûk',t:'Küçük'},{k:'Dirêj',t:'Uzun'},{k:'Kurt',t:'Kısa'}],5);
  ar('tl06','Cümle kur: "Bu büyük bir ev"','Ev xaniyekî mezin e',
    ['mezin','Ev','e','xaniyekî'],'xanî = ev',6);
  fi('tl06','Xanî ___ e (Ev büyük)','mezin','Sıfatlar ismin ardından gelir',7);

  // TR L07 — Günlük hayat
  lesson('tl07','tr2','tr-ku','Jiyana Rojane','Günlük Hayat','☀️','A1','Ez diçim = Gidiyorum. Ez têm = Geliyorum.');
  mc('tl07','"Ez diçim" ne demek?','Gidiyorum',['Gidiyorum','Geliyorum','Oturuyorum','Uyuyorum'],null,1);
  mc('tl07','"Saet çend e?" ne demek?','Saat kaç?',['Saat kaç?','Bugün ne günü?','Hava nasıl?','Nereye gidiyorsun?'],null,2);
  mt('tl07','Günlük ifadeleri eşleştir',
    [{k:'Diçim',t:'Gidiyorum'},{k:'Têm',t:'Geliyorum'},{k:'Dixwim',t:'Yiyorum'},{k:'Radizim',t:'Uyuyorum'}],3);
  ls('tl07','Duyduğunu yaz','Îro',  'Bugün','Îro',4);
  ar('tl07','Cümle kur: "Bugün okula gidiyorum"','Îro ez diçim dibistanê',
    ['dibistanê','Îro','diçim','ez'],'dibistanê = okula (yön hâli)',5);
  fi('tl07','___ ez diçim dibistanê (Bugün okula gidiyorum)','Îro','Îro = bugün',6);
  mc('tl07','"Hewa çawa ye?" ne demek?','Hava nasıl?',['Hava nasıl?','Saat kaç?','Bugün ne günü?','Nereye gidiyorsun?'],null,7);

  // TR L08 — Soru kelimeleri
  lesson('tl08','tr2','tr-ku','Peyivên Pirsiyariyê','Soru Kelimeleri','❓','A1','Çi=Ne, Kî=Kim, Çawa=Nasıl, Li ku=Nerede.');
  mc('tl08','"Çi" ne demek?','Ne',['Ne','Kim','Nasıl','Nerede'],null,1);
  mt('tl08','Soru kelimelerini eşleştir',
    [{k:'Çi',t:'Ne'},{k:'Kî',t:'Kim'},{k:'Çawa',t:'Nasıl'},{k:'Li ku',t:'Nerede'}],2);
  mc('tl08','"Kengê" ne demek?','Ne zaman',['Ne zaman','Neden','Nasıl','Kaç'],null,3);
  mt('tl08','Daha fazla soru kelimesi',
    [{k:'Kengê',t:'Ne zaman'},{k:'Çima',t:'Neden'},{k:'Çiqas',t:'Kaç/Ne kadar'},{k:'Kîjan',t:'Hangi'}],4);
  ar('tl08','Cümle kur: "Bu ne?"','Ev çi ye?',['ye?','çi','Ev'],'ye = dır/dir',5);
  ls('tl08','Duyduğunu yaz','Çima?','Neden?','Çima',6);
  fi('tl08','___ çi ye? (Bu ne?)','Ev','Ev = bu',7);

  // ════════════════════════════════════════════════════════════════════════════
  // EN → KU  (English → Kurmanji)
  // ════════════════════════════════════════════════════════════════════════════

  db.prepare(`INSERT INTO units
      (id,pair_id,title_ku,title_tr,emoji,color,sort_order,status)
    VALUES (?,?,?,?,?,?,?,'active')`)
    .run('en1','en-ku','Destpêkên Kurdî','Kurdish Basics','⭐','#0B9E88',1);

  db.prepare(`INSERT INTO units
      (id,pair_id,title_ku,title_tr,emoji,color,sort_order,status)
    VALUES (?,?,?,?,?,?,?,'active')`)
    .run('en2','en-ku','Rojane','Daily Life','🏙️','#E8A020',2);

  // EN L01 — Greetings
  lesson('el01','en1','en-ku','Silav','Greetings','👋','A1','Silav sounds like si-LAV. The L is emphatic!');
  mc('el01','How do you say "Hello"?','Silav',['Silav','Spas','Bele','Na'],null,1);
  mc('el01','What does "Xatirê te" mean?','Goodbye',['Goodbye','Good morning','Goodnight','How are you?'],null,2);
  ls('el01','Listen and type','Silav','Means: Hello','Silav',3);
  mt('el01','Match the words',
    [{k:'Silav',t:'Hello'},{k:'Spas',t:'Thank you'},{k:'Bele',t:'Yes'},{k:'Na',t:'No'}],4);
  ar('el01','Form: "Good morning"','Sibê bash',['bash','Sibê'],'Sibê = morning, bash = good',5);
  mc('el01','What does "Şev bash" mean?','Goodnight',
    ['Goodnight','Good morning','Good afternoon','Goodbye'],null,6);
  fi('el01','___ bash (Good morning)','Sibê','Sibê = morning',7);

  // EN L02 — Introductions
  lesson('el02','en1','en-ku','Nave min','Introductions','💬','A1','Nave min Ali ye = My name is Ali.');
  mc('el02','What does "Nave min Ali ye" mean?','My name is Ali',
    ['My name is Ali','Your name is Ali','What is your name?','Ali is here.'],null,1);
  mc('el02','How do you ask "What is your name?"','Nave te çi ye?',
    ['Nave te çi ye?','Tu çi dixwazî?','Tu çawa yî?','Tu ji ku yî?'],null,2);
  ls('el02','Listen and type','Nave min Rêzan ye','My name is Rêzan','Nave min Rêzan ye',3);
  mt('el02','Match pronouns',
    [{k:'Ez',t:'I'},{k:'Tu',t:'You'},{k:'Ew',t:'He/She'},{k:'Em',t:'We'}],4);
  ar('el02','Form: "I am from Kurdistan"','Ez ji Kurdistanê me',
    ['Kurdistanê','Ez','me','ji'],'Ez ji ... me = I am from ...',5);
  fi('el02','Nave ___ Ali ye (My name is Ali)','min','min = my',6);
  mc('el02','What does "Ez ji Kurdistanê me" mean?','I am from Kurdistan',
    ['I am from Kurdistan','I speak Kurdish','I am Kurdish','I like Kurdistan'],null,7);

  // EN L03 — Numbers
  lesson('el03','en1','en-ku','Hejmar','Numbers','🔢','A1','Yek, du, se, car, pênc... Count with Kurmanji!');
  mc('el03','What is "Yek"?','One',['One','Two','Three','Four'],null,1);
  mt('el03','Match numbers 1-4',
    [{k:'Yek',t:'1'},{k:'Du',t:'2'},{k:'Se',t:'3'},{k:'Car',t:'4'}],2);
  ls('el03','Type what you hear','Pênc','Five','Pênc',3);
  mt('el03','Match numbers 5-8',
    [{k:'Pênc',t:'5'},{k:'Şeş',t:'6'},{k:'Heft',t:'7'},{k:'Heşt',t:'8'}],4);
  ar('el03','Count to three','Yek, du, se',['se','Yek,','du,'],'In the right order!',5);
  mc('el03','What is "Deh"?','Ten',['Ten','Nine','Eight','Seven'],null,6);
  fi('el03','___, du, se (One, two, three)','Yek','Yek = one',7);

  // EN L04 — Family
  lesson('el04','en1','en-ku','Malbat','Family','👪','A1','Bav = Father, Dê = Mother. Family is central in Kurdish culture.');
  mc('el04','What is "Bav"?','Father',['Father','Mother','Brother','Sister'],null,1);
  mc('el04','What is "Dê"?','Mother',['Mother','Father','Sister','Brother'],null,2);
  mt('el04','Match family members',
    [{k:'Bav',t:'Father'},{k:'Dê',t:'Mother'},{k:'Bira',t:'Brother'},{k:'Xwişk',t:'Sister'}],3);
  ls('el04','Type what you hear','Bapîr','Grandfather','Bapîr',4);
  ar('el04','Form: "My father\'s name is Hesen"','Navê bavê min Hesen e',
    ['min','Hesen','Navê','e','bavê'],'bavê min = my father',5);
  fi('el04','___ bavê min Hesen e (My father\'s name is Hesen)','Navê','navê = name of',6);
  mt('el04','Match extended family',
    [{k:'Bapîr',t:'Grandfather'},{k:'Dapîr',t:'Grandmother'},{k:'Ap',t:'Paternal uncle'},{k:'Xal',t:'Maternal uncle'}],7);

  // EN L05 — Food & Drink
  lesson('el05','en2','en-ku','Xwarin û Vexwarin','Food and Drink','🍎','A1','Av = Water, Nan = Bread. These are the most essential words!');
  mc('el05','What is "Av"?','Water',['Water','Tea','Coffee','Milk'],null,1);
  mc('el05','What is "Nan"?','Bread',['Bread','Cheese','Egg','Meat'],null,2);
  mt('el05','Match food and drinks',
    [{k:'Av',t:'Water'},{k:'Çay',t:'Tea'},{k:'Nan',t:'Bread'},{k:'Penîr',t:'Cheese'}],3);
  ls('el05','Type what you hear','Gosht','Meat','Gosht',4);
  ar('el05','Form: "I am drinking water"','Ez av vedixwim',
    ['av','Ez','vedixwim'],'vedixwim = I drink',5);
  fi('el05','Ez av ___ (I am drinking water)','vedixwim','vedixwim = I drink',6);
  mc('el05','What does "Ez birçî me" mean?','I am hungry',
    ['I am hungry','I am thirsty','I am full','I am tired'],'birçî = hungry',7);

  // EN L06 — Colors & Adjectives
  lesson('el06','en2','en-ku','Reng û Rengdêr','Colors and Adjectives','🎨','A1','Sor = Red, Kesk = Green, Shin = Blue.');
  mc('el06','What does "Sor" mean?','Red',['Red','Blue','Green','Black'],null,1);
  mt('el06','Match colors',
    [{k:'Sor',t:'Red'},{k:'Kesk',t:'Green'},{k:'Shin',t:'Blue'},{k:'Spi',t:'White'}],2);
  ls('el06','Type what you hear','Resh','Black','Resh',3);
  mc('el06','What does "Mezin" mean?','Big',['Big','Small','Long','Short'],null,4);
  mt('el06','Match adjectives',
    [{k:'Mezin',t:'Big'},{k:'Biçûk',t:'Small'},{k:'Germ',t:'Hot'},{k:'Sar',t:'Cold'}],5);
  ar('el06','Form: "The house is big"','Xanî mezin e',
    ['mezin','Xanî','e'],'Adjectives follow the noun in Kurdish',6);
  fi('el06','Xanî ___ e (The house is big)','mezin','mezin = big',7);

  // EN L07 — Daily Life
  lesson('el07','en2','en-ku','Jiyana Rojane','Daily Life','☀️','A1','Ez diçim = I am going. Key verbs for daily conversation!');
  mc('el07','What does "Ez diçim" mean?','I am going',['I am going','I am coming','I am sitting','I am sleeping'],null,1);
  mc('el07','How do you say "What time is it?"','Saet çend e?',
    ['Saet çend e?','Roj çi ye?','Hewa çawa ye?','Tu çi dixwazî?'],null,2);
  mt('el07','Match daily verbs',
    [{k:'Diçim',t:'I go'},{k:'Têm',t:'I come'},{k:'Dixwim',t:'I eat'},{k:'Radizim',t:'I sleep'}],3);
  ls('el07','Type what you hear','Îro','Today','Îro',4);
  ar('el07','Form: "Today I am going to school"','Îro ez diçim dibistanê',
    ['dibistanê','Îro','diçim','ez'],'dibistanê = to school',5);
  fi('el07','___ ez diçim dibistanê (Today I go to school)','Îro','Îro = today',6);
  mc('el07','What does "Hewa çawa ye?" mean?','How is the weather?',
    ['How is the weather?','What time is it?','What day is it?','Where are you going?'],null,7);

  // EN L08 — Question Words
  lesson('el08','en2','en-ku','Peyivên Pirsiyariyê','Question Words','❓','A1','Çi=What, Kî=Who, Çawa=How, Li ku=Where.');
  mc('el08','What does "Çi" mean?','What',['What','Who','How','Where'],null,1);
  mt('el08','Match question words',
    [{k:'Çi',t:'What'},{k:'Kî',t:'Who'},{k:'Çawa',t:'How'},{k:'Li ku',t:'Where'}],2);
  mc('el08','What does "Kengê" mean?','When',['When','Why','How','How much'],null,3);
  mt('el08','Match more question words',
    [{k:'Kengê',t:'When'},{k:'Çima',t:'Why'},{k:'Çiqas',t:'How much'},{k:'Kîjan',t:'Which'}],4);
  ar('el08','Form: "What is this?"','Ev çi ye?',['ye?','çi','Ev'],'ye = is',5);
  ls('el08','Type what you hear','Çima?','Why?','Çima',6);
  fi('el08','___ çi ye? (What is this?)','Ev','Ev = this',7);

  // ════════════════════════════════════════════════════════════════════════════
  // Vocabulary (DE→KU)
  // ════════════════════════════════════════════════════════════════════════════

  // Unit 1 — Grundlagen
  const V1 = [
    ['Silav','Hallo','si-LAV','interjection'],
    ['Spas','Danke','SPAS','interjection'],
    ['Bele','Ja','be-LE','adverb'],
    ['Na','Nein','NA','adverb'],
    ['Xatirê te','Tschüss','xa-ti-RÊ te','interjection'],
    ['Sibê bash','Guten Morgen','si-BÊ bash','phrase'],
    ['Şev bash','Gute Nacht','ŞHEV bash','phrase'],
    ['Êvar bash','Guten Abend','Ê-var bash','phrase'],
    ['Bibore','Entschuldigung','bi-BO-re','interjection'],
    ['Navê min','Ich heiße','NA-vê min','phrase'],
    ['Tu çawa yî?','Wie geht\'s dir?','tu CHA-wa YÎ','phrase'],
    ['Bash im','Mir geht es gut','BASH im','phrase'],
    ['Ne bash e','Nicht gut','ne BASH e','phrase'],
    ['Gelek spas','Vielen Dank','ge-LEK spas','phrase'],
    ['Yek','Eins','YEK','number'],
    ['Du','Zwei','DU','number'],
    ['Se','Drei','SE','number'],
    ['Car','Vier','CHAR','number'],
    ['Pênc','Fünf','PÊNCH','number'],
    ['Şeş','Sechs','ŞHEŞ','number'],
    ['Heft','Sieben','HEFT','number'],
    ['Heşt','Acht','HEŞT','number'],
    ['Neh','Neun','NEH','number'],
    ['Deh','Zehn','DEH','number'],
    ['Bîst','Zwanzig','BÎST','number'],
    ['Sed','Hundert','SED','number'],
    ['Sor','Rot','SOR','adjective'],
    ['Kesk','Grün','KESK','adjective'],
    ['Shin','Blau','SHIN','adjective'],
    ['Spi','Weiß','SPI','adjective'],
    ['Resh','Schwarz','RESH','adjective'],
    ['Zer','Gelb','ZER','adjective'],
  ];
  V1.forEach(([k,t,p,wt]) => vocab('de-ku','u1',k,t,p,wt,'A1'));

  // Unit 2 — Essen
  const V2 = [
    ['Av','Wasser','AV','noun'],
    ['Çay','Tee','CHAY','noun'],
    ['Şîr','Milch','ŞHÎR','noun'],
    ['Qehwe','Kaffee','qeh-WE','noun'],
    ['Ava fêkî','Fruchtsaft','a-va FÊ-kî','noun'],
    ['Nan','Brot','NAN','noun'],
    ['Sêv','Apfel','SÊV','noun'],
    ['Gosht','Fleisch','GOSHT','noun'],
    ['Hêk','Ei','HÊK','noun'],
    ['Penîr','Käse','pe-NÎR','noun'],
    ['Rûn','Butter','RÛN','noun'],
    ['Tirî','Trauben','ti-RÎ','noun'],
    ['Birçî','Hungrig','bir-ÇÎ','adjective'],
    ['Tî','Durstig','TÎ','adjective'],
    ['Hesab','Rechnung','he-SAB','noun'],
    ['Xwarin','Essen','xwa-RIN','noun'],
    ['Giran','Teuer','gi-RAN','adjective'],
    ['Erzan','Günstig','er-ZAN','adjective'],
  ];
  V2.forEach(([k,t,p,wt]) => vocab('de-ku','u2',k,t,p,wt,'A1'));

  // Unit 3 — Familie
  const V3 = [
    ['Bav','Vater','BAV','noun'],
    ['Dê','Mutter','DÊ','noun'],
    ['Bira','Bruder','bi-RA','noun'],
    ['Xwişk','Schwester','XWIŞHK','noun'],
    ['Bapîr','Großvater','ba-PÎR','noun'],
    ['Dapîr','Großmutter','da-PÎR','noun'],
    ['Apê','Onkel (väterl.)','A-pê','noun'],
    ['Xaltî','Tante (mütterl.)','xal-TÎ','noun'],
    ['Ser','Kopf','SER','noun'],
    ['Çav','Auge','CHAV','noun'],
    ['Guh','Ohr','GUH','noun'],
    ['Dev','Mund','DEV','noun'],
    ['Dest','Hand','DEST','noun'],
    ['Lingê','Bein/Fuß','lin-GÊ','noun'],
    ['Dil','Herz','DIL','noun'],
    ['Mamoste','Lehrer/in','ma-MOS-te','noun'],
    ['Doktor','Arzt/Ärztin','dok-TOR','noun'],
    ['Polîs','Polizist','po-LÎS','noun'],
    ['Mezin','Groß','me-ZIN','adjective'],
    ['Biçûk','Klein','bi-ÇÛK','adjective'],
    ['Spehî','Schön','spe-HÎ','adjective'],
    ['Baş','Gut','BASH','adjective'],
    ['Xirap','Schlecht','xi-RAP','adjective'],
  ];
  V3.forEach(([k,t,p,wt]) => vocab('de-ku','u3',k,t,p,wt,'A1'));

  // Unit 4 — Alltag
  const V4 = [
    ['Saet','Uhr/Stunde','SA-et','noun'],
    ['Sibeh','Morgen','si-BEH','noun'],
    ['Nîvro','Mittag','nîv-RO','noun'],
    ['Êvar','Abend','Ê-var','noun'],
    ['Şev','Nacht','ŞHEV','noun'],
    ['Duşem','Montag','du-ŞHEM','noun'],
    ['Sêşem','Dienstag','sê-ŞHEM','noun'],
    ['Çarşem','Mittwoch','çar-ŞHEM','noun'],
    ['Pêncşem','Donnerstag','pênc-ŞHEM','noun'],
    ['Înî','Freitag','Î-nî','noun'],
    ['Şemî','Samstag','şhe-MÎ','noun'],
    ['Yekşem','Sonntag','yek-ŞHEM','noun'],
    ['Baran','Regen','ba-RAN','noun'],
    ['Berf','Schnee','BERF','noun'],
    ['Tav','Sonne','TAV','noun'],
    ['Ba','Wind','BA','noun'],
    ['Germ','Heiß','GERM','adjective'],
    ['Sar','Kalt','SAR','adjective'],
    ['Bazêr','Markt/Basar','ba-ZÊR','noun'],
    ['Dibistan','Schule','di-bis-TAN','noun'],
    ['Nexweşxane','Krankenhaus','nexweş-XA-ne','noun'],
    ['Camî','Moschee','ca-MÎ','noun'],
    ['Pirtûkxane','Bibliothek','pir-tûk-XA-ne','noun'],
    ['Rast','Rechts','RAST','adverb'],
    ['Çep','Links','ÇHEP','adverb'],
    ['Rêkxistin','Geradeaus','rêk-xis-TIN','adverb'],
  ];
  V4.forEach(([k,t,p,wt]) => vocab('de-ku','u4',k,t,p,wt,'A1'));

  // Unit 5 — Sprache
  const V5 = [
    ['Axaftin','Sprechen','a-xaf-TIN','verb'],
    ['Fêm kirin','Verstehen','fêm ki-RIN','verb'],
    ['Xwendin','Lesen','xwen-DIN','verb'],
    ['Nivîsîn','Schreiben','ni-vî-SÎN','verb'],
    ['Diçim','Ich gehe','di-ÇHIM','verb'],
    ['Têm','Ich komme','TÊM','verb'],
    ['Dixwim','Ich esse','di-XWIM','verb'],
    ['Vedixwim','Ich trinke','ve-di-XWIM','verb'],
    ['Radizim','Ich schlafe','ra-di-ZIM','verb'],
    ['Dixwazim','Ich möchte','di-xwa-ZIM','verb'],
    ['Çi','Was','ÇHI','pronoun'],
    ['Kî','Wer','KÎ','pronoun'],
    ['Çawa','Wie','CHA-wa','adverb'],
    ['Li ku','Wo','li KU','adverb'],
    ['Kengê','Wann','ken-GÊ','adverb'],
    ['Çima','Warum','çhi-MA','adverb'],
    ['Hîn bûn','Lernen','hîn BÛN','verb'],
    ['Ziman','Sprache','zi-MAN','noun'],
  ];
  V5.forEach(([k,t,p,wt]) => vocab('de-ku','u5',k,t,p,wt,'A1'));

  // TR & EN vocab (minimal)
  [
    ['tr-ku','tr1','Silav','Merhaba','si-LAV'],
    ['tr-ku','tr1','Spas','Teşekkür','SPAS'],
    ['tr-ku','tr1','Bele','Evet','be-LE'],
    ['tr-ku','tr1','Na','Hayır','NA'],
    ['tr-ku','tr1','Av','Su','AV'],
    ['tr-ku','tr1','Nan','Ekmek','NAN'],
    ['tr-ku','tr2','Îro','Bugün','Î-ro'],
    ['tr-ku','tr2','Diçim','Gidiyorum','di-ÇHIM'],
    ['en-ku','en1','Silav','Hello','si-LAV'],
    ['en-ku','en1','Spas','Thank you','SPAS'],
    ['en-ku','en1','Bele','Yes','be-LE'],
    ['en-ku','en1','Na','No','NA'],
    ['en-ku','en2','Av','Water','AV'],
    ['en-ku','en2','Nan','Bread','NAN'],
    ['en-ku','en2','Îro','Today','Î-ro'],
    ['en-ku','en2','Diçim','I go','di-ÇHIM'],
  ].forEach(([pair,unit,k,t,p]) => vocab(pair,unit,k,t,p));

  saveToDisk();

  const stats = {
    pairs:   db.prepare('SELECT COUNT(*) n FROM language_pairs').get().n,
    units:   db.prepare('SELECT COUNT(*) n FROM units').get().n,
    lessons: db.prepare('SELECT COUNT(*) n FROM lessons').get().n,
    ex:      db.prepare('SELECT COUNT(*) n FROM exercises').get().n,
    vocab:   db.prepare('SELECT COUNT(*) n FROM vocabulary').get().n,
  };

  console.log('✅  Seed abgeschlossen!\n');
  console.log(`   Sprachpaare:  ${stats.pairs}`);
  console.log(`   Einheiten:    ${stats.units}`);
  console.log(`   Lektionen:    ${stats.lessons}`);
  console.log(`   Übungen:      ${stats.ex}  ← (war 43, jetzt ${stats.ex})`);
  console.log(`   Vokabeln:     ${stats.vocab}`);
  console.log('\n   Admin:   admin@kurdolingo.de  /  admin123');
  console.log('   Demo:    demo@kurdolingo.de   /  demo123\n');
}

// Als Skript direkt ausführbar: node src/seed.js
// Als Modul importierbar: require('./seed').run()
if (require.main === module) {
  run().catch(e => { console.error('Seed-Fehler:', e); process.exit(1); });
}

module.exports = { run };
