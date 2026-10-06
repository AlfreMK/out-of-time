# Spanish translation guide

How the game's Spanish is written. The mechanics (dictionaries, `keys.ts`, `msg()`, typed names) are
described in `src/i18n/index.ts` and in AGENTS.md ("Languages").

**Adding or changing English text:** run `npm run i18n`, then `npm run typecheck`: it lists every
Spanish entry that's now missing (new or changed English) or left over (removed English). Text built
from values goes in `messages.ts` (and `es/messages.ts`), never in a template literal elsewhere
(`npm run validate` rejects it). Item, character and era names live in `es/names.ts`, keyed by id.

## Variant and tone

- **Neutral Latin American Spanish.** Tuteo (tú, never vos), "ustedes" (never vosotros). Neutral vocabulary: computadora, celular, auto, manejar, jugo. No regional slang (no "cachai", "che", "güey", "vale", "tío").
- Natural and lively, like a well-localized indie game, not a literal translation. Keep each character's voice: Andrew is a curious, slightly nerdy scientist with dry humor; Pike is tired and bitter; Yuki is a sharp hacker; Pip only makes noises (*snort*), translate the action words (e.g. '*determined snort*' → '*resoplido decidido*').
- Formality: strangers, elders, authority figures and medieval/1553 speakers usually use "usted"; friends and kids use "tú". Pick what fits the scene and stay consistent within a conversation.
- Keep it about as long as the English. A line wraps to 3 rows of ~58 characters in the dialogue box (longer lines continue on another page automatically, but don't pad).
- Punctuation: Spanish opening marks ¿ ¡. Keep "..." as three dots. Use proper accents and ñ. Numbers: "66 millones de años"; thousands with a space or written out.
- Speech-bubble barks are short: keep them short.

## Tokens you must keep exactly

- `{interact}`, `{sneak}`, `{use}`, `{throw}`, `{back}`... (word in braces): button glyph tokens. Keep them verbatim, place them where they read naturally.
- `\n` line breaks: keep them.
- Text in other languages stays as is, with the SAME value as the key: German guard/forester barks and shouts, the Spanish soldiers' lines (already Spanish: keep identical), Japanese/romaji announcements and words (Irasshai, Mamonaku...), Mapudungun words (mari mari, peñi, chaltu may, lof, lawen, weichafe, wingka, pewkallal), Latin. If a following English line is Andrew's earpiece translating a Spanish line, translate it naturally (it can become a reaction or a paraphrase, since the player now understands the Spanish).

## Cologne 1248 villagers: German-accented Spanish

In English, Andrew's translator earpiece renders the villagers' Middle High German as German-accented English ("zis", "ze"). In Spanish, mirror it with German-accented Spanish. Keep it LIGHT and readable:
- German interjections and short words: ja, nein, gut, ach, mein Herr, Gott im Himmel, danke, bitte.
- Occasional "z" for "s" in short, common words (zí, ezto, eze, ezta, pazar) — a few per line, not every s.
- Never so heavy that a kid can't read it. Brother Albert (Albertus Magnus) and Brother Thomas (Aquinas) are learned clerics: little or no accent. Guards' barks stay in German (identical values).

## Glossary (use these exact names)

Items: Hardened Resin = Resina endurecida · Obsidian = Obsidiana · Meteoric Iron = Hierro meteórico · Medicinal Fern = Helecho medicinal · Field Recorder = Grabadora de campo · Nav Module = Módulo de navegación · Rye Bread = Pan de centeno · Pebbles = Piedritas · Charcoal = Carbón vegetal · Bronze Gear = Engranaje de bronce · Quicksilver = Azogue · Shield = Escudo · Spinning Top = Trompo · Firewood = Leña · Gold Nugget = Pepita de oro · Lodestone = Piedra imán · Pifilka = Pifilka · Foye Bark = Corteza de foye · Maqui = Maqui · Pali Ball = Pelota de palín · Optical Clock = Reloj óptico · Superconductor = Superconductor · Power Cell = Celda de energía · Cyberdeck = Cyberdeck · Pike's Notes = Notas de Pike · Water Flask = Cantimplora · Quartz Crystal = Cristal de cuarzo · Field Emitter = Emisor de campo · Temporal Core = Núcleo temporal.

Characters: Andrew, Nora, Pike (Dr. Aaron Pike), Pip, Agnes, Jakob, Meister Ulrich, Old Gertrud = la vieja Gertrud, Brother Albert = Fray Alberto (Albertus Magnus = Alberto Magno), Brother Thomas = Fray Tomás (Thomas Aquinas = Tomás de Aquino, "the Dumb Ox" = "el Buey Mudo"), Gate Guard = Guardia de la puerta, Guard = Guardia, Brutus, Forester = Guardabosques, Hound = Sabueso, Lautaro (Leftraru), Machi = la machi, Rayen, Ayelén, Kid = Niño, Weichafe, Scout = Explorador, Soldier = Soldado, Rider = Jinete, Yuki, Hacker, Priest = Sacerdote, Vendor = Vendedor, Commuter = Oficinista, Courier = Repartidor, Passer-by = Transeúnte, Security Bot = Bot de seguridad, Drone = Dron, Camera = Cámara, Nomad = Nómada, Museum bot = Bot del museo, Hoshi Kirara (keep). Archbishop Konrad von Hochstaden (keep), Valdivia, Caupolicán, Hachikō.

Places and eras: Late Cretaceous = Cretácico tardío · Hell Creek, Laramidia (keep) · Middle Ages = Edad Media · Cologne = Colonia · Holy Roman Empire = Sacro Imperio Romano Germánico · Araucanía · Fort Tucapel = fuerte Tucapel · Concepción · Neo-Tokyo = Neo-Tokio · Tokyo = Tokio · Shibuya · Yamanote Line = línea Yamanote · Madrid · The Long Drought = La Gran Sequía · Manzanares · Geneva = Ginebra · Mongolia, China, Mexico = México · Chicxulub.

Story terms: time machine = máquina del tiempo · (time) window = ventana · jump = salto · Chronos Institute = Instituto Chronos · Chronos Corp (keep) · the Chronos Leaks = las Filtraciones de Chronos · Test Run #47 = Prueba #47 · stability = estabilidad · translator earpiece = auricular traductor · the Institute = el Instituto · field logs = registros de campo · telemetry = telemetría · checkpoint = punto de control.

Science and history: keep scientific names in italics-free plain text as in English (Dakotaraptor, Anzu wyliei, Thescelosaurus, Edmontosaurus, Champsosaurus, Ankylosaurus, Pachycephalosaurus, T. rex, Quetzalcoatlus). raptor = raptor · dromaeosaur = dromeosaurio · hadrosaur = hadrosaurio · oviraptorosaur = oviraptorosaurio · choristodere = coristodero · pterosaur = pterosaurio · ammonite = amonita · trilobite = trilobite · Iberian lynx = lince ibérico · dodo = dodo · fern = helecho · horsetail = cola de caballo · conifer = conífera · tree fern = helecho arborescente · amber = ámbar · resin = resina · meteorite = meteorito · K–Pg extinction = extinción del K-Pg · Cross of Burgundy = Cruz de Borgoña · morion = morrión · cuirass = coraza · arquebus = arcabuz · heater shield = escudo de heráldica / escudo triangular · bell-founder = fundidor de campanas · rye bread = pan de centeno · charcoal kiln = carbonera · Bannforst = coto de caza (Bannforst) · ruka = ruka (plural rukas) · trutruka = trutruka · palín · quila · coihue · foye/canelo · maqui · pudú · charqui · scurvy = escorbuto · ema = ema (tablillas de deseos) · torii · yatai · ramen, yakitori, takoyaki, binchōtan · optical lattice clock = reloj óptico de red · REBCO tape = cinta REBCO · quartz oscillator = oscilador de cuarzo · piezoelectric = piezoeléctrico · Metro = metro.

Accuracy is a top priority: never change a fact, date, number or name while translating.
