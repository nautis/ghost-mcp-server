# WatchSpotting Source URL Validation Report
**Date:** 2026-02-16
**Total sightings scanned:** 1,284 (1,038 unique URLs)
**Method:** HTTP HEAD/GET requests + Puppeteer headless Chrome second pass

---

## CONFIRMED 404 — 15 URLs, 17 sightings

faw_ids: [131]
https://www.hodinkee.com/articles/the-seiko-6105-captain-willard-apocalypse-now

faw_ids: [147]
https://www.watchuseek.com/threads/suunto-core-in-the-equalizer.1495432/

faw_ids: [276]
https://www.omegawatches.com/planet-omega/cinema/the-girl-with-the-dragon-tattoo

faw_ids: [470]
https://wornandwound.com/the-watches-of-jumanji-the-next-level/

faw_ids: [471]
https://www.gq-magazine.co.uk/article/free-guys-best-style-moments

faw_ids: [609]
https://www.hollywoodreporter.com/lifestyle/style/men-black-film-watches-history-1217985/

faw_ids: [677]
https://www.gq-magazine.co.uk/article/glass-onion-watches

faw_ids: [709]
https://www.deployant.com/hamilton-pulsar-watch-willy-brandts-watch-james-bond-and-the-men-in-black

faw_ids: [933]
https://casiofanmag.com/news/g-shock-news/dw-5600-on-jarhead/

faw_ids: [935]
https://casiofanmag.com/news/collection/casio-sfx-10-on-jackal/

faw_ids: [1676]
https://www.watchtime.com/featured/rush-chris-hemsworth-watch/

faw_ids: [485]
https://ultimateactionmovies.com/die-hard-watch-significance/

faw_ids: [894, 895]
https://thenexthour.net/original/watch-the-watch-jessica-chastain-in-miss-sloane/
NOTE: stored in DB as HTML: <a href="https://thenexthour.net/original/watch-the-watch-jessica-chastain-in-miss-sloane/">The Next Hour</a>

faw_ids: [937]
https://watchpaper.com/2014/02/01/two-hamilton-watches-staring-in-action-thriller-jack-ryan-shadow-recruit/

---

## DEAD DOMAIN — 2 URLs, 2 sightings

faw_ids: [979]
https://watch-pocket.com/iwc-aquatimer-and-lucky-number-slevin/
DNS lookup failed for watch-pocket.com

faw_ids: [2018]
https://montfreak.montres-de-luxe.com/montres-de-cinema-montres-de-stars/shotgun-wedding-la-longines-de-josh-duhamel/
DNS lookup failed for montfreak.montres-de-luxe.com

---

## MALFORMED (two URLs stitched together) — 1 entry, 2 sightings

faw_ids: [52, 53]
Stored as: https://www.fratellowatches.com/speedmaster-in-movies/%20and%20https://deployant.com/spot-the-watch-jason-statham-with-a-couple-of-notable-timepieces-in-the-mechanic-resurrection/
Should be split:
  faw 52 (Jessica Alba, Omega Speedmaster) → https://www.fratellowatches.com/speedmaster-in-movies/
  faw 53 (Jason Statham, Omega Speedmaster) → https://deployant.com/spot-the-watch-jason-statham-with-a-couple-of-notable-timepieces-in-the-mechanic-resurrection/

---

## NEEDS MORE SPECIFIC URL — 1 sighting

faw_ids: [1406]
https://vipfanauctions.com/past-auctions/
URL is live but too generic — should point to a specific auction lot

---

## FIX URL — 1 sighting

faw_ids: [1003]
Current: https://www-montres--de--luxe-com.translate.goog/American-Gangster-Josh-Brolin-porte-une-IWC-Portofino_a10418.html
Fix to: https://www.montres-de-luxe.com/American-Gangster-Josh-Brolin-porte-une-IWC-Portofino_a10418.html
