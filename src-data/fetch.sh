#!/bin/sh
# Downloads the Scripture sources extract.py and audit.py read (not kept in git; ~15 MB). GitHub only.
cd "$(dirname "$0")"
for b in Ps Prov Lam; do curl -sS -o wlc_$b.xml https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc/$b.xml; done
curl -sS -o kjv_Psalms.json https://raw.githubusercontent.com/aruljohn/Bible-kjv/master/Psalms.json
curl -sS -o eng-kjv.osis.xml https://raw.githubusercontent.com/seven1m/open-bibles/master/eng-kjv.osis.xml
curl -sS -o kjv3.json https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json
curl -sS -o kjv4.json https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/KJV.json
# then: python3 extract.py (writes ../letter-data.js) ; cd .. && python3 build.py && cd src-data && python3 audit.py
