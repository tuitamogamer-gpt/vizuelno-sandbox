# Forma — Vizuelno komuniciranje

Studentski web studio za prvi kolokvijum: od radne ideje do obrazloženog vizuelnog identiteta. Next.js App Router, React, TypeScript, IndexedDB i server-side Pika API Club integracija. Prilagođen računaru i telefonu.

## Šta radi

- Pristup zajedničkim kodom, provjerenim isključivo na serveru; potpisana HttpOnly sesija traje sedam dana.
- Individualni projekti: ideja, publika, vizija, misija, strategija, 3–5 ciljeva i slogan.
- Paleta 2–4 boje, WCAG provjera kontrasta, vlastiti logotip ili početni geometrijski oblik, tipografske probe, memorandum i društvena objava.
- Obrazloženja, izvori, AI deklaracija, kontrolna lista popunjenosti (nije automatska ocjena).
- Automatsko lokalno čuvanje, JSON izvoz/uvoz, kopiranje i brisanje projekata.
- Dokument za štampu/PDF, SVG logotip i samostalni HTML predložak za drugi kolokvijum.
- AI atelje: priprema briefa, cijena prije generisanja, jedna Pika skica po potvrdi, praćenje zadatka i preuzimanje rezultata.

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

Projekti nisu poslati na server. Samo brief koji student potvrdi za AI ide kroz zaštićenu serversku rutu do Pike. API ključ se nikada ne šalje pregledniku. Napravljene skice su lokalno sačuvane uz projekat. Pika job i quote tokeni su vezani za sesiju i nisu u JSON izvozu.

## Pika integracija

Izabrana operacija: `google/gemini-3.1-flash-image/text-to-image` (Nano Banana 2), jedna PNG slika, 1K, 1:1, minimal thinking. Server ne prihvata proizvoljan model, URL ili rezoluciju iz preglednika.

1. `GET /api/ai/status` javlja da li je ključ konfigurisan.
2. `POST /api/ai/quote` provjerava aktuelnu cijenu, dostupni kredit i limit po slici. Vraća potpisanu ponudu vezanu za brief i sesiju, važeću 10 minuta.
3. Student potvrđuje jednu skicu i prikazanu cijenu. `POST /api/ai/generate` ponovo provjerava ponudu, koristi stabilan idempotency key i vraća potpisanu potvrdu zadatka.
4. `POST /api/ai/job` provjerava zadatak iz iste sesije. `POST /api/ai/result` preuzima sliku samo s dozvoljenih Pika domena, ograničenu na 8 MB. Ključ ide samo na Pika API domen, nikada na CDN.

Greška veze ne pokreće automatski novo generisanje. Nepotvrđeni submit ostaje sačuvan i može se ponoviti s istim idempotency key-em. Ako je potvrda cijene u međuvremenu istekla, provjeriti Pika dashboard prije novog pokušaja. Job token traje 7 dana i zahtijeva originalnu aktivnu sesiju. Lokalna skica ostaje dostupna nakon isteka sesije.

Login i AI imaju dodatna ograničenja pokušaja **po serverskoj instanci**; ona nisu globalna potrošačka kvota. Za veće grupe postaviti ograničenje kredita/zahtjeva na Pika API ključu i po potrebi Vercel firewall pravila. Limit po slici nije ukupni budžet. Živa naplativa generacija nije testirana jer ključ još nije dodat.

Zvanične specifikacije provjerene 4. novembra 2026:
- https://dev.pika.art/llms.txt
- https://dev.pika.art/llms/google/gemini-3.1-flash-image/text-to-image
- https://api.dev.pika.art/catalog/apis/google/gemini-3.1-flash-image/text-to-image?expand=inputs
- https://dev.pika.art/openapi.json

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

Playwright čita pristupni kod iz lokalnog okruženja. `TEST_BASE_URL` može promijeniti adresu testa. Testovi pokrivaju pristup, CSRF, čuvanje nakon reload-a, uvoz/izvoz, brisanje, štampu, mobilni raspored i nedostupan AI bez ključa. Provider testovi koriste lažne odgovore i ne troše Pika kredit.

## Nastavni izvori

Sadržaj je prilagođen dogovorima iz Wispr Flow zapisa od 15, 22. i 29. oktobra 2026. Tačan rok nije izmišljen: aplikacija navodi samo drugu polovinu novembra i upućuje na nastavu. Noviji dogovor o praktičnom bloku ima prednost nad ranijim planom. Udžbenik, transkripti i lični primjeri studenata nisu kopirani u aplikaciju. Primjer „Bora“ je izmišljen i jasno označen kao edukativni.

Mapiranje zahtjeva i izvora: [docs/teaching-notes.md](docs/teaching-notes.md).
