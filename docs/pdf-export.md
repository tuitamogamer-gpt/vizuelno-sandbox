# PDF prvog kolokvijuma

Student otvara **Pregled i izvoz → PDF za prvi kolokvijum**, ili **Izvezi → Kolokvijum 01 (.pdf)**. PDF se preuzima direktno, bez dijaloga za štampu i bez trošenja AI kredita.

Dokument sadrži naslovnicu, podatke o autoru, broj indeksa i grupu (ako su uneseni), datum, sedam cjelina vizuelnog identiteta, paletu sa HEX/RGB vrijednostima i provjerom kontrasta, odabrani logotip, primjere izabranih fontova, raspored memoranduma, izvore i osvrt. Prazna polja ostaju označena. Preuzimanje ne šalje rad nastavniku.

U svakom vizuelnom koraku postoji **Istorija generisanih slika**. Svaka slika ima pregled, model, opis i datum; vraćanje ranijeg rezultata ne troši AI kredit. Nove generacije ne uklanjaju starije slike. Student može sam ukloniti pojedinačnu sliku nakon potvrde; slika tada nestaje i iz izbora za PDF, dok već preuzeti dokumenti i predate verzije ostaju nepromijenjeni. Slika postavljena kao logotip projekta ne može se ukloniti dok se ne zamijeni. Istorija Playgrounda takođe zadržava ranije slike dok ih student sam ne ukloni.

Student označava **Uključi u PDF** uz pojedinačnu sliku. U prozoru za izvoz može pregledati i promijeniti izbor, označiti sve ili poništiti izbor. Nove slike i ranije sačuvani projekti počinju bez označenih slika. Samo označene slike ulaze u PDF, uključujući logotip na naslovnici, u poglavlju o znaku i na memorandumu. Bez označenih slika izvoze se tekst, paleta i tipografski primjeri; geometrijski predložak ostaje dostupan u projektima bez rasterskog logotipa.

Izbor je sačuvan uz projekat u lokalnoj kopiji, na nalogu kada je sinhronizacija podešena, te u JSON/ZIP arhivi i snimku predaje. Izbor prati identitet slike i ne mijenja se vraćanjem varijante ili promjenom jezika. Prilog sa promptovima sadrži samo opise označenih slika. Nečitljiva označena slika zaustavlja izvoz uz poruku; neoznačena se ne obrađuje.

Pregled predate verzije ima zasebno dugme **PDF predate verzije**. Početni izbor potiče iz nepromjenljivog snimka predaje. Promjene izbora u tom prozoru važe samo za preuzeti PDF i ne mijenjaju predaju. Metapodaci o autoru, grupi i datumu uneseni u izvoz važe samo za taj PDF.

Sve opcije dostupne su na srpskom, engleskom i ruskom; autorski opisi ostaju na izvornom jeziku.

## Format i implementacija

- A4, numeracija svih stranica, zaglavlje, sadržaj sa vezama i PDF oznake poglavlja.
- Tekst je moguće označiti i pretražiti; dugi opisi i URL-ovi prelaze na narednu stranicu.
- Noto Sans Regular/Bold ugrađeni su u dokument, uključujući Latin Extended i ćirilicu. Licenca i porijeklo nalaze se u `public/fonts/pdf/`.
- Logotip i fontovski primjeri pripremaju se iz stvarnih izbora projekta. WebP vizuali konvertuju se u PNG, uz očuvan odnos stranica. Slike se obrađuju redom radi manjeg utroška memorije na telefonu.
- PDF renderer se učitava tek na zahtjev. Obrada se odvija u pregledniku; privatni ključevi, job/quote tokeni i troškovi generisanja ne ulaze u PDF.
- Za prvo učitavanje izvoznog alata i fontova potrebna je veza s aplikacijom. PDF zatim sadrži ugrađene resurse. Ako učitavanje fontova bude prekinuto, ponovni pokušaj radi bez osvježavanja stranice i zadržava unesene podatke.
- `src/lib/pdf/package.json` označava izvozni modul kao ESM; PDF test koristi `.mts` zbog ESM zavisnosti renderera. Ostatak aplikacije zadržava postojeći modulni režim.

## Provjera

`npm test` provjerava stvarne PDF datoteke: Unicode tekst, A4 dimenzije, tekst unutar stranice, sadržaj poglavlja, numeraciju, interne destinacije, slike, dugi tekst, maksimalno duge podatke na naslovnici, varijante, promptove i oznaku predaje. Playwright provjerava preuzimanje i pregled na računaru i telefonu, WebP slike, nečitljiv vizual i preuzimanje predate verzije iz nastavničkog pregleda.

Drugi kolokvijum nije dio ovog PDF izvoza.
