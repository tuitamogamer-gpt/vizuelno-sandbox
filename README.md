# Forma — Vizuelno komuniciranje

Studentski web studio za prvi kolokvijum: od radne ideje do obrazloženog vizuelnog identiteta. Next.js App Router, React, TypeScript, IndexedDB i server-side Pika API Club integracija. Prilagođen računaru i telefonu.

## Šta radi

- Pristup zajedničkim kodom, provjerenim isključivo na serveru; potpisana HttpOnly sesija traje sedam dana.
- Individualni projekti: ideja, publika, vizija, misija, strategija, 3–5 ciljeva i slogan.
- Paleta 2–4 boje, WCAG provjera kontrasta, generisani logotip ili početni geometrijski oblik, tipografske probe, memorandum i društvena objava.
- Obrazloženja, izvori, AI deklaracija, kontrolna lista popunjenosti (nije automatska ocjena).
- Automatsko lokalno čuvanje, JSON izvoz/uvoz, kopiranje i brisanje projekata.
- Dokument za štampu/PDF, SVG logotip i samostalni HTML predložak za drugi kolokvijum.
- Generisanje unutar koraka: vizuelni smjer, studija palete, logotip, tipografski plakat, memorandum i društvena objava. Brief se sastavlja iz projekta i može se uređivati.
- Playground bez obaveznog projekta: slobodan prompt, četiri modela, pet formata, posljednjih 12 rezultata, poređenje dvije slike, preuzimanje i dodavanje projektu.
- Procjena cijene prije generisanja, jedna slika po potvrdi, praćenje zadatka i preuzimanje rezultata.
- API postavke s direktnim ulazom u vlasnikove Vercel environment variables i besplatnom provjerom veze.

## Pokretanje

Node.js 22+ (Vercel: 24.x) i npm.

```sh
npm ci
cp .env.example .env.local
# Podesiti ACCESS_CODE i slučajni SESSION_SECRET (najmanje 32 znaka).
npm run dev
```

Obavezne serverske varijable: `ACCESS_CODE`, `SESSION_SECRET`. Nijedna nema `NEXT_PUBLIC_` prefiks. Generiši tajnu npr. `openssl rand -base64 48` i sačuvaj je samo u lokalnom `.env.local` ili Vercel environment variables. Datoteke `.env*` i `.vercel` nisu u Gitu.

Opcione varijable:

| Varijabla | Namjena |
| --- | --- |
| `PIKA_API_KEY` | Pika API Club ključ; bez njega je generisanje isključeno, ostatak aplikacije radi. |
| `PIKA_MAX_IMAGE_USD` | Najviša dozvoljena ponuđena cijena jedne slike; podrazumijevano `0.25`. |

## Podaci i predaja

Radovi su u **IndexedDB-u ovog preglednika**, uključujući kompresovane slike. Nema centralne baze, studentskih naloga, automatske predaje ili sinhronizacije između uređaja. Zajednički kod zaključava aplikaciju, ali nije individualni studentski nalog.

Student preuzima `.forma.json` za rezervnu kopiju ili drugi računar. Uvoz kreira novu kopiju, nikada ne prepisuje postojeći projekat. Na zajedničkom računaru student treba izvesti i obrisati svoj projekat; odjava ne briše podatke. PDF se predaje kroz kanal dogovoren na nastavi. „Izvezi dokument / PDF“ otvara dijalog štampe; odabrati „Save as PDF / Sačuvaj kao PDF“ i po potrebi isključiti zaglavlja i podnožja preglednika.

Projekti nisu poslati na server. Samo brief koji student potvrdi za AI ide kroz zaštićenu serversku rutu do Pike. API ključ se nikada ne šalje pregledniku. Napravljene skice su lokalno sačuvane uz odgovarajući korak projekta. Playground čuva do 12 eksperimenata, uključujući prompt, model, format i dostupnu konačnu cijenu; stariji se zamjenjuju. JSON arhiva Playgrounda služi za preuzimanje, a pojedinačni rezultat može se dodati projektu za nastavak rada. Uvoz arhive Playgrounda nije implementiran. Pika job i quote tokeni su vezani za sesiju i nisu u JSON izvozu.

## Pika integracija

Podržane operacije (tačni ID-jevi iz zvaničnog kataloga):

| Model u interfejsu | Pika operacija | Postavke |
| --- | --- | --- |
| GPT Image 2.5 | `openai/gpt-image-2.5-sunburst/text-to-image` | Sunburst, 1K, medium, PNG |
| Nano Banana 2.1 | `google/gemini-nano-banana-2.1/text-to-image` | 1K, minimal thinking, PNG |
| Seedream 5 Pro | `bytedance/seedream-5.0-pro/text-to-image` | 5.0 Pro, size 1K |
| Ideogram 4.5 | `ideogram/ideogram-4.5/text-to-image` | medium, magic prompt off, eksplicitne dimenzije |

Formati: 1:1, 3:4, 4:3, 16:9 i 9:16. Jedna slika po zahtjevu. Server prihvata samo navedene modele i formate; svaki adapter koristi vlastitu dokumentovanu šemu. GPT i Nano koriste obračun po tokenima pa je prikazana cijena procjena. Dostupan konačni trošak prikazuje se uz rezultat.

Generisanje koristi tekstualni opis projekta. Nema image-to-image slanja logotipa: za tačan znak i fontove memorandum i društvena objava imaju precizne HTML/CSS predloške. AI slika služi za istraživanje kompozicije. Slike palete ne mijenjaju stvarne HEX vrijednosti, a generisana slova ne mijenjaju izbor fontova. Generisani logo student eksplicitno postavlja kao aktivni znak. Vizuali drugih koraka automatski se čuvaju u odgovarajućem koraku i ulaze u PDF/JSON.

1. `GET /api/ai/status` javlja da li je ključ konfigurisan.
2. `POST /api/ai/quote` provjerava aktuelnu cijenu, dostupni kredit i limit po slici. Vraća potpisanu ponudu vezanu za model, format, brief, ID zahtjeva i sesiju, važeću 10 minuta.
3. Student potvrđuje jednu skicu i prikazanu cijenu. `POST /api/ai/generate` ponovo provjerava ponudu, koristi stabilan idempotency key i vraća potpisanu potvrdu zadatka.
4. `POST /api/ai/job` provjerava zadatak iz iste sesije. `POST /api/ai/result` preuzima sliku samo s dozvoljenih Pika domena, ograničenu na 8 MB. Ključ ide samo na Pika API domen, nikada na CDN.

Greška veze ne pokreće automatski novo generisanje. Nepotvrđeni submit ostaje sačuvan i može se ponoviti s istim idempotency key-em. Ako je potvrda cijene u međuvremenu istekla, provjeriti Pika dashboard prije novog pokušaja. Job token traje 7 dana i zahtijeva originalnu aktivnu sesiju. Lokalna skica ostaje dostupna nakon isteka sesije.

Login i AI imaju dodatna ograničenja pokušaja **po serverskoj instanci**; ona nisu globalna potrošačka kvota. Za veće grupe postaviti ograničenje kredita/zahtjeva na Pika API ključu i po potrebi Vercel firewall pravila. Limit po slici nije ukupni budžet. Živa naplativa generacija nije testirana jer ključ još nije dodat.

Zvanične specifikacije provjerene 4. novembra 2026:
- https://dev.pika.art/llms.txt
- https://dev.pika.art/llms/google/gemini-nano-banana-2.1/text-to-image
- https://api.dev.pika.art/catalog/apis/google/gemini-nano-banana-2.1/text-to-image?expand=inputs
- https://dev.pika.art/openapi.json

## Unos ključa

U aplikaciji otvori **API postavke** ili `/postavke`. Dugme vodi direktno na [Environment Variables ovog projekta](https://vercel.com/tuitamogamer-7851s-projects/vizuelno-komuniciranje/settings/environment-variables). Vlasnik kroz svoj Vercel nalog dodaje `PIKA_API_KEY` za Production i Preview, zatim radi Redeploy posljednje produkcijske objave. Nakon statusa Ready osvježiti aplikaciju i kliknuti „Provjeri Pika vezu“. Provjera poziva samo billing balance, ne generiše sliku i ne otkriva ključ ili saldo pregledniku. Isti postupak služi za zamjenu ključa.

## Vercel

Uvezi privatni GitHub repozitorijum kao Next.js projekat. Build: `npm run build`, Node 24.x. U Environment Variables dodaj `ACCESS_CODE` i `SESSION_SECRET` za Production i Preview. Opcioni Pika ključ dodaj kada bude spreman, a zatim uradi redeploy.

Produkcijska domena treba biti dostupna studentima bez Vercel naloga; aplikacija sama traži pristupni kod. Vercel zaštitu zadrži za preview deployment-e. Svaki push na povezanu `main` granu pokreće build.

## Provjere

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run dev -- --port 3001
# U drugom terminalu:
npm run test:e2e
```

Playwright čita pristupni kod iz lokalnog okruženja. `TEST_BASE_URL` može promijeniti adresu testa. Testovi pokrivaju pristup, CSRF, čuvanje nakon reload-a, uvoz/izvoz, brisanje, štampu, mobilni raspored i nedostupan AI bez ključa. Provider testovi koriste lažne odgovore i ne troše Pika kredit. Adapteri se provjeravaju protiv snimka zvaničnih šema sva četiri modela (`tests/fixtures/pika-catalog-2026-11-04.json`). Browser testovi provjeravaju odvojene vizuale po koracima, promjenu modela i cijene, galeriju i poređenje, obnovu nakon reload-a, prenos u projekat i uklanjanje session tokena iz izvoza.

## Nastavni izvori

Sadržaj je prilagođen dogovorima iz Wispr Flow zapisa od 15, 22. i 29. oktobra 2026. Tačan rok nije izmišljen: aplikacija navodi samo drugu polovinu novembra i upućuje na nastavu. Noviji dogovor o praktičnom bloku ima prednost nad ranijim planom. Udžbenik, transkripti i lični primjeri studenata nisu kopirani u aplikaciju. Primjer „Bora“ je izmišljen i jasno označen kao edukativni.

Mapiranje zahtjeva i izvora: [docs/teaching-notes.md](docs/teaching-notes.md).
