# Forma — Vizuelno komuniciranje

[Aplikacija](https://vizuelno-komuniciranje.vercel.app) · [GitHub repozitorijum](https://github.com/tuitamogamer-gpt/vizuelno-sandbox) · [Automatske provjere](https://github.com/tuitamogamer-gpt/vizuelno-sandbox/actions/workflows/ci.yml)

Studentski web studio za prvi kolokvijum: od radne ideje do obrazloženog vizuelnog identiteta. Next.js App Router, React, TypeScript, IndexedDB, PostgreSQL, Google OAuth preko Better Auth i serverska Pika API Club integracija. Prilagođen računaru i telefonu.

## Šta radi

- Pristup zajedničkim kodom, provjerenim isključivo na serveru; potpisana HttpOnly sesija traje sedam dana.
- Google nalog i upis kodom predmeta, privatni projekti i Playground na svim uređajima, profil s indeksom i grupom. Lokalni režim uz kod ostaje dostupan.
- Predaja sačuvanih verzija, istorija komentara, nastavnički pregled napretka i obrazložene povratne informacije po pet kriterijuma.
- Individualni projekti: ideja, publika, vizija, misija, strategija, 3–5 ciljeva i slogan.
- Paleta 2–4 boje, WCAG provjera kontrasta, generisani logotip ili početni geometrijski oblik, tipografske probe, memorandum i društvena objava.
- Obrazloženja, izvori, AI deklaracija, kontrolna lista popunjenosti (nije automatska ocjena).
- Automatsko lokalno čuvanje, JSON izvoz/uvoz, kopiranje i brisanje projekata; pretraga, status i sortiranje.
- URL čuva projekat i korak: osvježavanje stranice i dugme Nazad vraćaju isti ekran. Početna stranica nastavlja posljednji uređivani projekat.
- Čitljiviji interfejs, navigacija tastaturom i mobilni meni s kontrolom fokusa; obavještenje o prekidu interneta uz nastavak lokalnog uređivanja.
- Direktan PDF prvog kolokvijuma sa naslovnicom, numeracijom, ugrađenim fontovima i AI vizualima, SVG logotip i samostalni HTML predložak za drugi kolokvijum. Komplet identiteta u ZIP-u obuhvata projekat, samostalnu knjigu identiteta, paletu, dizajn tokene, logotip, sve sačuvane varijante s opisima i web predložak.
- Generisanje unutar koraka: vizuelni smjer, studija palete, logotip, tipografski plakat, memorandum i društvena objava. Brief se sastavlja iz projekta i može se uređivati. Svaki korak čuva odabrani rezultat i dvije prethodne varijante; izbor ranijeg rezultata ne pokreće novo generisanje.
- Playground bez obaveznog projekta: slobodan prompt, četiri modela, pet formata, do 24 rezultata, favoriti, pretraga i filter po modelu, poređenje dvije slike, veliki pregled, preuzimanje i dodavanje projektu. Arhiva se može izvesti i uvesti, a opis sastaviti iz postojećeg projekta.
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

## Nalozi, podaci i predaja

**Google nalog:** potvrđena Google prijava, zatim jednokratni upis kodom predmeta. Projekti i Playground pripadaju korisniku i sinhronizuju se u PostgreSQL bazu. Na uređaju ostaje odvojena IndexedDB kopija po nalogu. Student može uređivati već otvorenu aplikaciju bez interneta; promjene se šalju kada se veza vrati. Početno otvaranje aplikacije i Google prijava zahtijevaju internet.

Sinhronizacija koristi provjeru revizije i stabilni ID izmjene. Istovremena dorada na dva uređaja otvara izbor verzije. Projekat se može sačuvati kao zasebna lokalna kopija prije preuzimanja verzije s naloga; Playground arhivu treba prethodno izvesti. Slike se deduplikuju unutar naloga. Limit je 30 aktivnih projekata i 50 MB vizuala po nalogu. Brisanje projekta ne briše već predate verzije; neiskorištene slike uklanjaju se nakon 24 sata pri narednoj izmjeni ili unosu slike.

**Predaja:** korak „Pregled i izvoz“ traži popunjenu kontrolnu listu i završene AI zahtjeve. Server zamrzava sačuvanu verziju. Dalje izmjene ne mijenjaju predaju; ponovna predaja nove revizije dobija novi broj verzije. Nastavnik vidi zbirni napredak i predate radove, komentariše koncept, identitet, tipografiju, primjenu i obrazloženje. Oznake su smjernice za doradu, ne automatske ocjene. Student dobija komentar u aplikaciji; nema automatskih email poruka.

Nastavničku ulogu određuje isključivo serverski `INSTRUCTOR_EMAILS`. Student nema pristup tuđim dokumentima, slikama, predajama ili listi studenata. Nastavnik vidi sadržaj predatih verzija; privatni nacrti nisu dostupni nastavničkoj API ruti. Predaje ostaju dostupne u bazi nakon brisanja aktivnog projekta. Administrativno brisanje naloga i politika čuvanja baze nisu automatizovani; vlasnik upravlja bazom i njenim rezervnim kopijama.

**Lokalni režim uz kod:** radovi ostaju samo u IndexedDB-u tog preglednika i nisu automatski predati ili preneseni na nalog. Nakon Google prijave student izričito bira lokalne projekte za kopiranje. Originali ostaju lokalno. Na zajedničkom računaru prenijeti ili izvesti svoje radove, zatim obrisati lokalne originale. Odjava Google naloga prvo provjerava sinhronizaciju, opoziva sesiju i uklanja lokalnu kopiju tog naloga. Radovi iz lokalnog režima ostaju na uređaju.

JSON izvoz i uvoz ostaju dostupni u oba režima; uvoz pravi novu kopiju. ZIP paket sadrži projekat, knjigu identiteta, web predložak, paletu i vizuale. PDF se preuzima u koraku „Pregled i izvoz“ → „PDF za prvi kolokvijum“, ili iz menija „Izvezi“. Prozor sadrži pregled dokumenta, podatke o studentu i izbor AI vizuala, ranijih varijanti i promptova. Nastavnik i student mogu preuzeti PDF sačuvane predaje iz njenog pregleda. Izvoz PDF-a ne predaje rad automatski. Playground čuva 24 rezultata i favoriti se ne uklanjaju automatski. Izvezeni projekti i arhive ne sadrže tokene za pokretanje ili praćenje AI zahtjeva.

Upute za aktiviranje Google prijave i Git veze: [docs/deployment.md](docs/deployment.md).

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

Zahtjev mora uspješno biti sačuvan u IndexedDB prije slanja modelu; greška lokalnog čuvanja blokira plaćeni poziv. Greška veze ne pokreće automatski novo generisanje. Nepotvrđeni submit ostaje sačuvan i može se ponoviti s istim idempotency key-em. Ako je potvrda cijene u međuvremenu istekla, provjeriti Pika dashboard prije novog pokušaja. Job token traje 7 dana. U lokalnom režimu zahtijeva originalnu aktivnu sesiju; uz Google nalog vezan je za ID korisnika i može se nastaviti na drugom uređaju istog naloga. Lokalna skica ostaje dostupna nakon isteka sesije.

Login i AI imaju dodatna ograničenja pokušaja **po serverskoj instanci**; ona nisu globalna potrošačka kvota. Za veće grupe postaviti ograničenje kredita/zahtjeva na Pika API ključu i po potrebi Vercel firewall pravila. Limit po slici nije ukupni budžet. Produkcijska veza s Pika API Club i ponude za sva četiri modela provjerene su 4. novembra 2026. Ključ je sačuvan kao Sensitive varijabla u Vercel Production i Preview okruženju. Provjera veze i cijena nije pokretala plaćeno generisanje; tok generisanja, praćenja zadatka i preuzimanja dodatno je pokriven testovima sa simuliranim odgovorima.

Zvanične specifikacije provjerene 4. novembra 2026:
- https://dev.pika.art/llms.txt
- https://dev.pika.art/llms/google/gemini-nano-banana-2.1/text-to-image
- https://api.dev.pika.art/catalog/apis/google/gemini-nano-banana-2.1/text-to-image?expand=inputs
- https://dev.pika.art/openapi.json

## Unos ključa

U aplikaciji otvori **API postavke** ili `/postavke`. Dugme vodi direktno na [Environment Variables ovog projekta](https://vercel.com/tuitamogamer-7851s-projects/vizuelno-komuniciranje/settings/environment-variables). Vlasnik kroz svoj Vercel nalog dodaje `PIKA_API_KEY` za Production i Preview, zatim radi Redeploy posljednje produkcijske objave. Nakon statusa Ready osvježiti aplikaciju i kliknuti „Provjeri Pika vezu“. Provjera poziva samo billing balance, ne generiše sliku i ne otkriva ključ ili saldo pregledniku. Isti postupak služi za zamjenu ključa.

## Vercel

Poveži GitHub repozitorijum s postojećim Vercel projektom (Settings → Git). Build: `npm run build`, Node 24.x. U Environment Variables dodaj `ACCESS_CODE` i `SESSION_SECRET` za Production i Preview. Opcioni Pika ključ dodaj kada bude spreman, a zatim uradi redeploy.

Produkcijska domena treba biti dostupna studentima bez Vercel naloga; aplikacija sama traži pristupni kod. Vercel zaštitu zadrži za preview deployment-e. Svaki push na povezanu `main` granu pokreće build. Build pokreće aditivne migracije kada postoji `DATABASE_URL`; bez baze ostaje lokalni režim. Google OAuth koristi stabilnu domenu iz `BETTER_AUTH_URL`. Za preview koristi zasebnu bazu i OAuth klijent; ne povezivati proizvoljne preview domene s produkcijskim studentskim podacima.

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

Playwright čita pristupni kod iz lokalnog okruženja. `TEST_BASE_URL` može promijeniti adresu testa. Testovi pokrivaju pristup, CSRF, čuvanje nakon reload-a, uvoz/izvoz, brisanje, direktan PDF izvoz i pregled, mobilni raspored i nedostupan AI bez ključa. Provider testovi koriste lažne odgovore i ne troše Pika kredit. Adapteri se provjeravaju protiv snimka zvaničnih šema sva četiri modela (`tests/fixtures/pika-catalog-2026-11-04.json`). Browser testovi provjeravaju odvojene vizuale po koracima, promjenu modela i cijene, galeriju i poređenje, obnovu nakon reload-a, istoriju navigacije, prenos u projekat, tri varijante, ZIP paket, favorite, filtere i uvoz arhive, offline uređivanje i uklanjanje session tokena iz izvoza. Poseban test simulira punu lokalnu memoriju i potvrđuje da plaćeni poziv nije poslat. Testovi sa lokalnim serverom koriste različite testne IP adrese radi izolacije login limita.

Testovi naloga koriste izdvojeni lokalni PostgreSQL, stvarne serverske rute i potpisane sesije testnih korisnika. Provjeravaju izolaciju podataka, upis kodom, OAuth state/PKCE parametre, opoziv sesije, revizije, dva uređaja, prekid veze, predaju i nastavnički komentar. Ne automatizuju stvarni Google login i ne koriste produkcijsku bazu. Pokretanje: [docs/deployment.md](docs/deployment.md).

## Nastavni izvori

Sadržaj je prilagođen dogovorima iz Wispr Flow zapisa od 15, 22. i 29. oktobra 2026. Tačan rok nije izmišljen: aplikacija navodi samo drugu polovinu novembra i upućuje na nastavu. Noviji dogovor o praktičnom bloku ima prednost nad ranijim planom. Udžbenik, transkripti i lični primjeri studenata nisu kopirani u aplikaciju. Primjer „Bora“ je izmišljen i jasno označen kao edukativni.

Mapiranje zahtjeva i izvora: [docs/teaching-notes.md](docs/teaching-notes.md).
