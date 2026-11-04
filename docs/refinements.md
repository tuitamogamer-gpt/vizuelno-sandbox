# Dorada studija — novembar 2026.

Radni tok ostaje zasnovan na smjernicama s nastave. Ova dorada olakšava nastavak rada, izbor vizuala i pripremu predaje.

- Početna stranica nastavlja posljednji projekat i korak. URL i istorija preglednika prate navigaciju; osvježavanje ne vraća studenta na početak.
- Vizuelni koraci čuvaju aktivni rezultat i dvije prethodne varijante. Vraćanje varijante ne šalje zahtjev modelu. Logotip se i dalje eksplicitno postavlja kao aktivni znak.
- Playground ima 24 mjesta, favorite zaštićene od automatskog zamjenjivanja, pretragu, filter po modelu, veliki pregled i ponovno korištenje opisa. Arhivu je moguće uvesti bez prepisivanja postojećeg rada. Opis se može sastaviti iz projekta.
- ZIP komplet sadrži JSON projekat, knjigu identiteta u samostalnom HTML-u, SVG i rasterski logotip kada postoji, paletu, dizajn tokene, sačuvane varijante s opisima i web predložak. Font datoteke nisu dio ZIP-a. PDF prvog kolokvijuma se preuzima zasebno i sadrži ugrađene fontove.
- Zahtjev se mora uspješno sačuvati lokalno prije poziva modela. Prekid veze nastavlja isti zahtjev. Preuzimanje originala dostupno je dok važe sesija i Pika zadatak.
- Krupniji tekst, jasniji kontrast, navigacija tastaturom, mobilni meni s fokusom i obavještenje o offline radu poboljšavaju rad na manjem ekranu.

## Provjera

Unit testovi pokrivaju migraciju podataka, tri varijante, favorite, bezbjedan uvoz arhive, navigaciju, sadržaj ZIP-a i uklanjanje session tokena iz svih izvoza. Browser testovi prolaze kroz nastavak rada, dugme Nazad, reload, offline uređivanje, mobilni meni, varijante, originalnu sliku, ZIP preuzimanje i arhivu Playgrounda. Poseban test odbija upis u IndexedDB i provjerava da plaćeni zahtjev nije poslat.

Lokalni snimci ekrana prije i poslije dorade nalaze se u ignorisanom direktorijumu `artifacts/refinement/`. Slike u browser provjerama su testni primjeri sa simuliranim odgovorima, ne rezultati plaćenog generisanja. Prikazi su pregledani na 1440 px i 390 px.

## Granice

Radovi ostaju u pregledniku studenta; nema sinhronizacije, centralne baze ili automatske predaje nastavniku. Broj popunjenih elemenata nije ocjena. Zajednički pristupni kod nije individualni nalog. Generisanje se obavlja preko postojeće serverske Pika veze; API ključ nije dio izvornog koda, ZIP-a ni arhiva radova.
