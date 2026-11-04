# PDF prvog kolokvijuma

Student otvara **Pregled i izvoz → PDF za prvi kolokvijum**, ili **Izvezi → Kolokvijum 01 (.pdf)**. PDF se preuzima direktno, bez dijaloga za štampu i bez trošenja AI kredita.

Dokument sadrži naslovnicu, podatke o autoru, broj indeksa i grupu (ako su uneseni), datum, sedam cjelina vizuelnog identiteta, paletu sa HEX/RGB vrijednostima i provjerom kontrasta, odabrani logotip, primjere izabranih fontova, raspored memoranduma, izvore i osvrt. Prazna polja ostaju označena. Preuzimanje ne šalje rad nastavniku.

Odabrani AI vizuali uključeni su po početnim postavkama. Ranije varijante i prilog sa promptovima uključuju se po izboru. Vizuali imaju naziv modela i oznaku AI skice. Odabrani logotip ostaje dio identiteta i kada se isključe ostali AI vizuali. Nečitljiva slika zaustavlja izvoz uz poruku; ne preskače se tiho.

Pregled predate verzije ima zasebno dugme **PDF predate verzije**. Izvoz koristi učitani, nepromjenljivi snimak predaje, označen brojem verzije i datumom. Podaci u prozoru za izvoz ne mijenjaju projekat ili nalog.

## Format i implementacija

- A4, numeracija svih stranica, zaglavlje, sadržaj sa vezama i PDF oznake poglavlja.
- Tekst je moguće označiti i pretražiti; dugi opisi i URL-ovi prelaze na narednu stranicu.
- Noto Sans Regular/Bold ugrađeni su u dokument, uključujući Latin Extended i ćirilicu. Licenca i porijeklo nalaze se u `public/fonts/pdf/`.
- Logotip i fontovski primjeri pripremaju se iz stvarnih izbora projekta. WebP vizuali konvertuju se u PNG, uz očuvan odnos stranica. Slike se obrađuju redom radi manjeg utroška memorije na telefonu.
- PDF renderer se učitava tek na zahtjev. Obrada se odvija u pregledniku; privatni ključevi, job/quote tokeni i troškovi generisanja ne ulaze u PDF.
- Za prvo učitavanje izvoznog alata i fontova potrebna je veza s aplikacijom. PDF zatim sadrži ugrađene resurse.
- `src/lib/pdf/package.json` označava izvozni modul kao ESM; PDF test koristi `.mts` zbog ESM zavisnosti renderera. Ostatak aplikacije zadržava postojeći modulni režim.

## Provjera

`npm test` provjerava stvarne PDF datoteke: Unicode tekst, A4 dimenzije, tekst unutar stranice, sadržaj poglavlja, numeraciju, interne destinacije, slike, dugi tekst, maksimalno duge podatke na naslovnici, varijante, promptove i oznaku predaje. Playwright provjerava preuzimanje i pregled na računaru i telefonu, WebP slike, nečitljiv vizual i preuzimanje predate verzije iz nastavničkog pregleda.

Drugi kolokvijum nije dio ovog PDF izvoza.
