# Dorada studija — novembar 2026.

Radni tok ostaje zasnovan na smjernicama s nastave. Ova dorada olakšava nastavak rada, izbor vizuala i pripremu predaje.

- Početna stranica nastavlja posljednji projekat i korak. URL i istorija preglednika prate navigaciju; osvježavanje ne vraća studenta na početak.
- Vizuelni koraci čuvaju aktivni rezultat i istoriju svih prethodnih varijanti, uz pojedinačan izbor za finalni PDF. Vraćanje varijante ne šalje zahtjev modelu. Logotip se i dalje eksplicitno postavlja kao aktivni znak.
- Playground čuva istoriju bez automatskog zamjenjivanja, favorite, pretragu, filter po modelu, veliki pregled i ponovno korištenje opisa. Arhivu je moguće uvesti bez prepisivanja postojećeg rada. Opis se može sastaviti iz projekta.
- ZIP komplet sadrži JSON projekat, knjigu identiteta u samostalnom HTML-u, SVG i rasterski logotip kada postoji, paletu, dizajn tokene, sačuvane varijante s opisima i web predložak. Font datoteke nisu dio ZIP-a. PDF prvog kolokvijuma se preuzima zasebno i sadrži ugrađene fontove.
- Zahtjev se mora uspješno sačuvati lokalno prije poziva modela. Prekid veze nastavlja isti zahtjev. Preuzimanje originala dostupno je dok važe sesija i Pika zadatak.
- Krupniji tekst, jasniji kontrast, navigacija tastaturom, mobilni meni s fokusom i obavještenje o offline radu poboljšavaju rad na manjem ekranu.

## Provjera

Unit testovi pokrivaju migraciju podataka, istoriju i izbor slika za PDF, favorite, bezbjedan uvoz arhive, navigaciju, sadržaj ZIP-a i uklanjanje session tokena iz svih izvoza. Browser testovi prolaze kroz nastavak rada, dugme Nazad, reload, offline uređivanje, mobilni meni, varijante, originalnu sliku, ZIP preuzimanje i arhivu Playgrounda. Poseban test odbija upis u IndexedDB i provjerava da plaćeni zahtjev nije poslat.

Lokalni snimci ekrana prije i poslije dorade nalaze se u ignorisanom direktorijumu `artifacts/refinement/`. Slike u browser provjerama su testni primjeri sa simuliranim odgovorima, ne rezultati plaćenog generisanja. Prikazi su pregledani na 1440 px i 390 px.

## Granice

Radovi ostaju sačuvani lokalno. Kada su Google prijava i baza podešene, istorija i izbor za PDF čuvaju se uz nalog i predatu verziju. Raspoloživi prostor preglednika i kvota naloga ograničavaju skladištenje; aplikacija prijavljuje neuspjelo čuvanje. Ranije odbačene slike iz perioda ograničenja na tri varijante nije moguće vratiti iz projekta. Broj popunjenih elemenata nije ocjena. Zajednički pristupni kod nije individualni nalog. Generisanje se obavlja preko postojeće serverske Pika veze; API ključ nije dio izvornog koda, ZIP-a ni arhiva radova.

# Dorada — 10. novembar 2026.

Nastavak dorade prije roka za prvi kolokvijum. Promjene pomažu studentu da sam upravlja sačuvanim radom i provjeri cjelinu prije predaje; ne mijenjaju zahtjeve kolokvijuma.

- **Uklanjanje slike iz istorije.** Istorija koraka i dalje ništa ne briše automatski, ali student može ukloniti nepotrebnu sliku. Prozor za potvrdu prikazuje sliku i nudi preuzimanje. Uklonjena slika nestaje iz izbora za PDF; ako je bila odabrana varijanta, odabrana postaje najnovija preostala slika, bez novog generisanja. Slika postavljena kao logotip ostaje zaštićena. Uz nalog, uklonjene slike prestaju zauzimati kvotu kada ih više ne koristi nijedan projekat ni predaja.
- **Kontrast svih parova boja.** Korak „Paleta boja“ prikazuje svaki par s omjerom i WCAG nivoom (AAA, AA, AA za veliki tekst, nije za tekst). Klik na par prikazuje ga u provjeri. Kada par nema 4,5:1, aplikacija predlaže najbližu nijansu boje teksta istog tona. Student je može primijeniti na boju teksta ili dodati kao novu boju; ništa se ne mijenja bez klika.
- **Savjeti prije predaje.** Korak „Pregled i izvoz“ upozorava na viziju ili misiju dužu od dvije rečenice (smjernica s nastave), paletu bez para za čitljiv tekst, memorandum bez kontakta, font bez ćirilice uz ćirilični tekst, te AI vizuale bez opisa upotrebe AI alata ili s ostavljenim mjestom „[opiši izmjene]“. Svaki savjet vodi na odgovarajući korak. Savjeti nisu ocjena i ne blokiraju izvoz ni predaju.
- **Prostor u pregledniku.** U lokalnom režimu prozor „Sačuvano lokalno“ prikazuje zauzeti prostor i nudi zahtjev za trajno čuvanje. Zahtjev se šalje tek na klik studenta.
- **Tastatura.** Kartice „Memorandum / Društvena objava“ i nastavničke kartice imaju pravilne panele i reaguju na strelice, Home i End. Meniji projekta i izvoza zatvaraju se tipkom Escape i vraćaju fokus na dugme.
- **Manje posla pri čuvanju.** Lokalno čuvanje više ne validira cijeli projekat dvaput pri svakoj izmjeni; to smanjuje rad preglednika kod projekata s mnogo sačuvanih slika.

## Provjera

Unit testovi pokrivaju uklanjanje slike (aktivna varijanta, završeni zadatak, prazna istorija), WCAG nivoe i prijedlog nijanse na hiljadama nasumičnih parova, brojanje rečenica i savjete na sva tri jezika, te navigaciju kartica. Browser testovi prolaze kroz potvrdu uklanjanja i zaštitu logotipa nakon reload-a, primjenu i dodavanje predložene nijanse, savjete koji se mijenjaju dok student piše, zahtjev za trajno čuvanje i rad kartica i menija s tastature. Svi AI odgovori u testovima su simulirani.

## Granice

Brojanje rečenica je približno: skraćenice poput „npr.“ ne prekidaju rečenicu, ali neke druge skraćenice mogu. Odluka o trajnom čuvanju pripada pregledniku; ako je odbije, rezervna JSON kopija ostaje preporuka. Prijedlog nijanse cilja 4,5:1 za standardni tekst i mijenja samo svjetlinu boje.
