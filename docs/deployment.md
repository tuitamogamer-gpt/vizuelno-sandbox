# Git, Google nalozi i trajno čuvanje

Postojeći Vercel projekat: `vizuelno-komuniciranje`, tim `tuitamogamer-7851s-projects`. Produkcija: https://vizuelno-komuniciranje.vercel.app. Nastaviti koristiti taj projekat da domena i sačuvani Pika ključ ostanu povezani.

## 1. GitHub

Kreirati prazan privatni repozitorijum na nalogu s dozvolom za pisanje, bez početnog README-a. U direktorijumu projekta:

```sh
git remote add origin https://github.com/VLASNIK/REPOZITORIJUM.git
git push -u origin main
```

U postojećem Vercel projektu otvoriti **Settings → Git → Connect Git Repository**, odabrati taj repozitorijum i `main` kao Production Branch. GitHub aplikaciji Vercel omogućiti pristup konkretnom repozitorijumu. Provjeriti prvi automatski deployment. Povezivanje samo lokalnog `origin` nije dovoljno za automatske objave na Vercelu.

`.env*`, `.vercel`, artefakti i browser tragovi su ignorisani. U Git ide samo `.env.example` bez vrijednosti tajni. GitHub Actions izvršava lint, TypeScript, unit testove, build i odvojene integracijske testove naloga. Vercel varijable se ne kopiraju u GitHub.

## 2. PostgreSQL

Povezati **Neon Postgres** kroz Vercel Marketplace / Storage ili upotrijebiti postojeću PostgreSQL bazu. Dodati njenu connection string vrijednost kao **Sensitive** `DATABASE_URL` u produkciji. Koristiti TLS i pooler konekciju koju daje provajder. Ne unositi javni `NEXT_PUBLIC_DATABASE_URL`.

Prvi build uz bazu pravi Better Auth tabele s prefiksom `forma_` i tabele iz `db/course.sql`. Migracije su aditivne i zaključane PostgreSQL advisory lockom. Nepodržane promjene auth šeme prekidaju build, umjesto automatskog uklanjanja podataka. Mogu se pokrenuti i ručno: `npm run db:migrate`. Korisnik baze mora imati dozvolu za kreiranje/izmjenu tabela. Za veću grupu pratiti prostor i konekcije baze; slike se trenutno čuvaju u PostgreSQL `bytea` kolonama, do 50 MB po nalogu. Podesiti rezervne kopije kod provajdera baze.

## 3. Google OAuth

U [Google Auth Platform](https://console.cloud.google.com/auth/clients):

1. Izabrati ili napraviti Google Cloud projekat. Podesiti naziv aplikacije, kontakt i OAuth consent screen.
2. Publiku izabrati prema stvarnim studentskim nalozima. `Internal` radi samo za naloge iste Workspace organizacije. U `External / Testing` dodati studentske naloge u test users; za širu upotrebu završiti Googleov postupak objave.
3. Kreirati OAuth Client ID tipa **Web application**.
4. Authorized JavaScript origin: `https://vizuelno-komuniciranje.vercel.app`.
5. Authorized redirect URI, tačno:

```
https://vizuelno-komuniciranje.vercel.app/api/auth/callback/google
```

6. Na [Vercel Environment Variables](https://vercel.com/tuitamogamer-7851s-projects/vizuelno-komuniciranje/settings/environment-variables) dodati `GOOGLE_CLIENT_ID` i Sensitive `GOOGLE_CLIENT_SECRET`.
7. Dodati `BETTER_AUTH_URL=https://vizuelno-komuniciranje.vercel.app` i preporučeno zaseban Sensitive `BETTER_AUTH_SECRET`, slučajnu vrijednost od najmanje 32 znaka. Bez njega se koristi postojeći `SESSION_SECRET`.
8. U `INSTRUCTOR_EMAILS` unijeti tačne potvrđene Google emailove nastavnika, odvojene zarezom. Prvi prijavljeni korisnik **ne postaje** automatski nastavnik.
9. Zadržati `ACCESS_CODE` i `SESSION_SECRET`; potrebni su za upis, lokalni pristup i AI potvrde. Pika ključ ostaje serverski `PIKA_API_KEY`.
10. Uraditi Redeploy. U aplikaciji otvoriti **API postavke → Google prijava i studentski radovi**. Status Google postavki potvrđuje prisustvo varijabli; tek stvarna prijava provjerava OAuth konfiguraciju kod Googlea.

Nastavnik i studenti koriste **Nastavi s Google nalogom**, zatim kod predmeta pri prvom upisu. Nastavnički nalog dobija dodatni pregled u meniju. U drugom pregledniku prijaviti isti studentski nalog i provjeriti da se projekat učitava. Testirati i jednu predaju te komentar nastavnika.

Za lokalni razvoj podesiti `BETTER_AUTH_URL=http://localhost:3000` i registrovati `http://localhost:3000/api/auth/callback/google` u razvojnom OAuth klijentu. Preview okruženja treba da imaju zasebnu bazu i stabilnu preview domenu registrovanu u Googleu.

## Integracijski testovi naloga

Testovi rade samo s bazom na `localhost` / `127.0.0.1` čiji naziv završava sa `_test`. Nema skrivenog testnog login endpointa u aplikaciji; Playwright direktno pripremi testne korisnike i Better Auth sesije u izdvojenoj bazi.

Kreirati `.env.account-test` (Git ga ignoriše), s testnim vrijednostima:

```
DATABASE_URL=postgresql://TEST_USER:TEST_PASSWORD@localhost:54329/forma_test
BETTER_AUTH_URL=http://localhost:3002
BETTER_AUTH_SECRET=<slučajna testna tajna od 32+ znaka>
SESSION_SECRET=<druga slučajna testna tajna od 32+ znaka>
ACCESS_CODE=<testni kod>
GOOGLE_CLIENT_ID=test-client.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=test-only-secret
INSTRUCTOR_EMAILS=teacher@example.test
```

```sh
npx tsx scripts/with-account-test-env.ts npm run db:migrate
npm run build
npx tsx scripts/with-account-test-env.ts npm run start -- --port 3002
# U drugom terminalu:
npx tsx scripts/with-account-test-env.ts npm run test:accounts
```

Prave Google OAuth tajne nisu potrebne za ove testove. Provjera stvarnog Google naloga ostaje dio verifikacije produkcijskog povezivanja. Testne slike i svi Pika odgovori u browser testovima su simulirani i ne troše kredit.
