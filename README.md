# Kale Dokuma – Factory Management Web Apps

Two single-file HTML apps for a weaving factory (velvet prayer rugs / carpets / fabric rolls).
Owner speaks Arabic (discussion) and Turkish (UI + code strings). Works from a phone.
This file is a hand-over document: read it first, then the header comment inside each HTML file.

## 1. What exists

| File | Purpose | URL |
|---|---|---|
| `index.html` | **Makineler** – live status of all looms | https://auqrup.github.io/Kale-dokuma-order/ |
| `siparis.html` | **Sipariş Yönlendirme** – order intake + routing orders to looms | https://auqrup.github.io/Kale-dokuma-order/siparis.html |
| `fabrika.html` | **Atölye** – READ-ONLY factory-floor view (one big card per loom: customer in large type, loom id, main color(s), width) + short "Rapor" of which customers are being worked for now | https://auqrup.github.io/Kale-dokuma-order/fabrika.html |

- Hosting: **GitHub Pages** (free, public repo `Kale-dokuma-order`, account `auqrup`). Both files live in the SAME repo.
  (An older separate repo `NEW-ORDER` was abandoned/deleted – verify it no longer exists.)
- Backend: **Firebase Realtime Database + Firebase Auth**, project `fabrika-e9b49`, **Spark (free) plan, no billing**.
- No build step, no framework. Plain HTML/CSS/JS, Firebase compat SDK 9.23.0 from gstatic.
- `index.html` deliberately has NO link to `siparis.html` (owner's decision). `siparis.html` links back to the machines page.
- Both pages have `<meta name="robots" content="noindex,nofollow">`.

## 2. Factory model

- 34 looms in 4 branches: **R** Rüya (R1–R16), **A** Acar (A1–A4), **Y** Y. Acar (Y1–Y8), **K** Karaman (K1–K6).
- Loom widths: 140 / 160 / 200 cm (default `WIDTHS[(num-1)%3]`, editable per loom).
- **140 cm looms have TWO WINGS (kanat)**: 6 colors (`colors[0..2]` wing 1: main + 2 sub; `colors[3..5]` wing 2). 160/200 cm looms have 4 colors (`colors[0]` = main).
- Each loom: status (`running|stopped|yarn|maint`), current customer, next customer, colors, 2 warp (çözgü) colors, `lastModified`.
- Color `"0"` = no yarn / none. Fixed palettes `COLORS` (22 named colors) and `WARPS` (SİYAH / BEYAZ / SARI) in both files – keep them in sync.
- **Only K1 (Karaman 1)** makes full 140 cm wide products; every other 140 cm loom makes 70 cm-wide pieces (two wings).

## 3. Firebase data layout and write ownership

Convention enforced only in code (rules are per-UID, not per-path):

| Path | Written by | Read by |
|---|---|---|
| `kale_dokuma_live_v2/<loomId>` | index.html | both |
| `kale_customers_pool_v2` | **siparis.html** (customer list: add / delete; written with transactions) | both (index.html read-only: select from the list) |
| `kale_events_v1` | index.html (notification log, last 50 events) | index.html |
| `kale_colors_v2` | index.html ("🎨 Renkler" window) – ONLY the extra colors `{v:2,list:[{name,hex}]}` | both (siparis.html read-only) |
| `kale_siparis_v1/orders/<orderId>` | siparis.html | both (index.html read-only) |

New code must respect this split. **Customer management (add/delete) lives ONLY in siparis.html** ("👥 Müşteri listesi" on the home screen and in the customer step; owner decision). A customer cannot be deleted while he has an order or is written on a loom (current/next customer); customer NAMES cannot be changed (add the correct one, delete the wrong one) because a name is stored inside looms (written by index.html) and orders (written by siparis.html) and neither page may write the other's data. Starting an order with a typed new name adds it to the list automatically. index.html has no customer manager any more: the loom edit window only selects from the list (plus names already on looms).

Order object: `{id, cust, created (ms), due ("YYYY-MM-DD" or empty = expected finish date, set by hand on the order screen), saved, lines[], ...}`; each line: `{id, k (product key), color, qty, done, asg{loomId:true}, ok[], mt{loomId:[across, metersPerPiece]}, pn, full, comp?}`.
`comp:{of:<lineId>, m:<loomId>}` marks an auto-generated companion line (see 5).

## 4. Security (current state – IMPORTANT)

- Login = **Firebase Authentication, Email/Password**, 3 users created by the owner in the console. Anyone can't self-register usefully because of the UID rules below.
- Pages show a full-screen login. Data listeners start **only after** `onAuthStateChanged` returns a user (`startData()`); sign-out button (🚪) clears local caches and reloads. A permission error shows a toast and signs out.
- Realtime Database **rules** (published):

```
{
  "rules": {
    ".read":  "auth != null && (auth.uid === 'EdG7ayzNH0XchXV0MNX8PuEfTV03' || auth.uid === 'YryrJb1QendfrpfYPYLKVybzcRY2' || auth.uid === 'j6DWM2ydtwfZRuDijernRvS25wo1')",
    ".write": "auth != null && (auth.uid === 'EdG7ayzNH0XchXV0MNX8PuEfTV03' || auth.uid === 'YryrJb1QendfrpfYPYLKVybzcRY2' || auth.uid === 'j6DWM2ydtwfZRuDijernRvS25wo1')"
  }
}
```

- To add an employee: create user in Authentication → Users, add the UID to both rule lines, Publish. To remove: delete the user and remove the UID.
- The Firebase web config/apiKey in the code is public by design (GitHub Pages is public); security comes from the rules, not from hiding the key.
- The old SHA-256 PIN lock was removed (it was only a UI lock). 
- Optional hardening not yet done: restrict the API key to the site origin in Google Cloud Console; consider disabling user sign-up if the console offers it.

## 5. siparis.html business logic

- Flow: customer (searchable chips) → product/size cards → **colors (multi-select, per-color qty)** → results per line. Colors currently loaded on eligible looms are listed first.
- Product table `P[]` at top of the file (editable): seccade 70×110 (140cm, two 70-wide pieces side by side), 80×120 (160cm), **cemaat seccadesi 110×200 (200 cm looms ONLY; piece is 200 wide × 110 long, 1.1 m per piece; not on the `ONLY100` loom)**, kadife halı group: **60×80** (see below), 100×200 / 100×300 / 100×400 (200cm looms 2 across; on the `ONLY100` loom 1 across), 140×200 (FULL140 only), 160×250, 200×300, 200×400, **AFGAN SET2 148×200, AFGAN SET3 172×200, AFGAN SET4 200×196** (regular 200 cm looms, not A3; 200 cm is across the loom, one piece across, length = the other number), Rulo (fabric is ordered by NUMBER OF ROLLS: 140→40 m, 160→35 m, 200→30 m).
- **60×80 rug (200 cm looms only)**: three columns across the loom, 60 + 80 + 60. Side columns hold pieces 60 wide × 80 long; the middle column holds pieces rotated (80 wide × 60 long). One repeat (devir) is 480 cm long and yields 6 + 8 + 6 = 20 pieces → 0.24 m per piece (500 pieces ≈ 25 repeats = 120 m). Partial repeats round up; all meter figures are approximate. Implemented with `opts:{ac:20, cyc:4.8, note:"6+8+6"}` (`ac` = pieces per repeat, `cyc` = metres per repeat).
- Carpets (2×3, 2×4 etc.) are woven first as one continuous fabric with pieces in sequence, then cut by hand – that is why meters = rows × piece length.
- Config constants: `FULL140 = ["K1"]` (K1 = Karaman 1, the only 140 cm loom that makes a full 140-wide piece such as 140×200; it also makes 70×110 as two 70-wide pieces); `ONLY100 = ["A3"]` – Acar 3 is the single 200 cm loom that only makes 100 cm-wide carpets (100×200, 100×300, 100×400, one piece across). Because of its jacquard settings it does NOT make 200-wide carpets (200×300, 200×400), the 110×200 congregational rug, or 60×80, but it DOES make 200-wide fabric rolls.
- Matching uses **main color + width only**. Sub-colors and warp are shown for the owner's visual judgment and never affect ranking.
- **140 cm wing rule**: if a color exists on only one wing, the other wing inevitably produces its own color, so the customer must accept that output. `suggest()` scores: 2 = both wings same color; 1.5 = other wing's color matches another line of the same order (auto-paired); 1 = other wing mismatched (warning with forced qty); 0 = no match. Full-140 products need both wings identical (2) or 0.
- **Companion lines**: when a line is assigned (📌) to a 140 cm loom whose other wing has a different non-"0" color not covered by another line, a companion line (same customer, same qty, `comp:{of,m}`) is created automatically. Deleting/unassigning the original deletes it; editing the original's qty updates it. It counts toward the customer's remaining total. **"Yapılan" (done) is LINKED** between original and companion(s): changing it on either sets the same value on the others (owner decision), and a new companion starts with the original's done value.
- Meters: flat products = rows × piece length; rolls = rows × roll length. Per-loom totals in the machine page exclude companion lines (they print on the same rows).
- Color step of siparis.html: the list "Şu an makinelerde takılı renkler" shows EVERY eligible machine on its OWN card (owner decision – even if several machines have exactly identical colors; an earlier version merged identical machines into one line and was reverted). `availColors` returns one item per (color, machine) with `rs:[r]`; cards of the same color are listed together, free machines first, then in loom order. Each card shows the ordered color, the machine's colors (`sigHtml`: "Alt:" or K1:/K2: with main colors bold; roll cards also show the loom width) and a machine chip with a tiny dot + name of warp color 1 (çözgü 1, display only). Tapping any card toggles that main COLOR (selection is per color, so all cards of that color highlight).
- Result screen: exact color matches (and partial wing matches ◐) as cards; looms needing a color change are collapsed into one gray line with an expand button. Assigned looms always show.
- Orders live in Firebase (`kale_siparis_v1/orders`) and are cached in localStorage (`kale_siparis_local_v1`); first load migrates any old local-only orders. Manual backup/restore: buttons "📤 Yedek al" / "📥 Geri yükle" (JSON text).

## 5b. Production-time estimate, Mini seccade, report, save flow (siparis.html) 

- **Daily output (loom length, approximate)** – constants `DAILY` in BOTH pages (keep identical): 200 cm = 240 m/day; 140 cm = SİMLİ 210 / ŞPİNGEL 370; 160 cm = SİMLİ 210 / ŞPİNGEL 350. The loom property `extra` (`spingel`/`simli`, set in the machine edit window) selects the rate; if it is not set on a 140/160 loom SİMLİ is assumed and the text says "(simli varsayıldı)". Estimated duration = meters (`lineM`) ÷ daily rate, shown on suggestion cards, on assigned order lines, in the machine's "Siparişler" window total (index.html) and in the report.
- **Mini seccade 70 × 30**: new product (`k:"mini"`), 140 cm looms only, two pieces across (one per wing, same wing/companion logic as seccade 70×110), 0.3 m per piece.
- **Save order**: "Siparişi kaydet" now saves, shows "Sipariş başarıyla eklendi ✓" and returns to the home screen (assign machines afterwards by opening the order).
- **Report** ("📊 Sipariş raporu" on the home screen): on-screen report view + "🖨️ PDF / Yazdır" (uses `#printSection` + `@media print`, same technique as index.html). Sections: KPIs, attention list (overdue orders, unassigned lines, assignments needing a color change), open orders with per-line machine/meters/duration, machine workload table, completed orders, footnote with the assumptions.

## 5c. fabrika.html (Atölye) – third page, READ-ONLY

- Writes NOTHING to Firebase (verified: no set/update/remove/transaction calls). Reads `kale_dokuma_live_v2` (looms) and `kale_colors_v2` (extra colors). Same Firebase Auth login as the other pages (session is shared on the same origin).
- Layout: header (live pill, "📊 Rapor", fullscreen ⛶, sign-out 🚪), then one section per branch (Rüya, Acar, Y. Acar, Karaman). Each loom = one card: color stripe on top (main color; 140 cm looms show both wing main colors), loom id badge + a small status dot (green running / red stopped / orange no yarn / purple maintenance) at the top, the CURRENT customer in large uppercase type in the middle ("BOŞTA" if none), and at the bottom the main color name(s) with dot(s) and the loom width.
- "Rapor": KPIs (active customers, machines with a customer, running/total, idle), customers being worked for now (machine chips with status dot, main colors, widths, warning if some machines are not running), next customers ("Sıradaki"), idle machines; "🖨️ PDF / Yazdır" (`#printSection` + `@media print`).
- The `COLORS` constant must stay identical in index.html, siparis.html and fabrika.html.

## 6. index.html features

- Dark theme, gold accent `--ac:#f0c674`, page background `#061314`, Manrope font, card grid gap 10 px. Top stripe = loom color 1 (15 px), bottom stripe = warp color 1 (5 px).
- **"🎨 Renkler" window** (header button): lists every color with counts "ana N · alt M"; tapping a color shows which looms use it as MAIN color (index 0, and index 3 = wing-2 main on 140 cm looms) and which as SUB color. **The color list is now FROZEN**: the 28 final colors (as exported by the owner on 2026-10-11, including his renames/hex changes such as ÖZBEK BORDO, Z-BLUE, KREM, GÜL, B.GREEN, CAM GÖBEĞİ, SAXMAVİ, SOĞAN(ALTIN)) are the `COLORS` constant in BOTH index.html and siparis.html (keep them identical; siparis has no "0" entry). Fixed colors cannot be edited, renamed or deleted. The owner can only ADD new colors (name auto-uppercased, case-insensitive uniqueness, color picker) – these "extra" colors are stored as `{v:2, list:[{name,hex}]}` in `kale_colors_v2` and may be deleted again (loom cells using it become "0", confirm dialog also counts order lines). On load, index.html auto-prunes `kale_colors_v2` entries whose name is already a fixed color (cleans the old full list). Loading order matters: extra colors are loaded BEFORE looms, cached in localStorage `kale_colors_extra_cache`, and `rawColors` keeps raw loom color lists so looms are re-validated if extras arrive later (otherwise looms with an unknown color name would be read as "0" and could be overwritten). siparis.html applies the same logic read-only. To change the fixed list in future: edit the `COLORS` constant in both files (never rename a color that exists in orders).
- **Notifications (🔔 in the header)**: log node `kale_events_v1` = last 50 events `{t,u,k,m,x}` (time, author = email prefix, kind, loom id, Turkish text); only index.html writes it. Kinds: `cust` (current customer changed), `next` (next customer changed), `stop` (status changed to stopped / no yarn / maintenance – resuming creates no event), `color` (main color changed, or "Alt renkler değişti"), `order` (new order). Loom events are created in `saveLoom` by the user who made the change (`loomEvents(old,new)`, written after the loom write succeeds). New orders: siparis.html is NOT touched; index.html detects ids it has not seen yet (`checkNewOrders`, device-local `kale_seen_orders`; first run on a device marks existing orders as seen silently) and writes the event with the deterministic key `ord_<orderId>` and `t = order.created`, so several devices writing the same event collapse into one record (also catches orders saved while nobody had this page open). Every client prunes the log to 50 (multi-path delete). On other users' devices a banner appears for 7 s ("⛔ R9: Durdu: Duruş (veli)", tap opens the list) and the bell shows an unread badge; read state is per device (`kale_notif_read`); your own changes never notify you. Notifications only reach people who have the page open (or see the badge on their next visit) – no phone push (that would need a paid backend).
- **Notification list dates**: events are grouped under day headings ("Bugün", "Dün", then dd.mm.yyyy) and each shows its time (HH:MM) and author. (An order event's time is the order's `created` time, i.e. when the order was started, not when it was saved.) Kind `restore` (🔄) is logged when a backup is restored.
- **Backup / restore ("💾 Yedek" button)**: machines page only. File `{app:"kale-makineler", v:1, created, looms:{R1..K6}, colors:[extra colors]}` – NO notifications, customer list or orders (customers/orders belong to siparis.html). "📤 Yedek al" downloads `makineler-yedek-<date>_<time>.json` (also shown as text for copy/paste). "📥 Geri yükle" (file or pasted text) validates the file (must be a kale-makineler v1 backup containing ALL 34 looms, otherwise nothing is changed), asks for confirmation showing the backup date, saves the current state on this device (`kale_prerestore_backup`, for "↩️ Son geri yüklemeyi geri al"), then writes looms + extra colors + one `restore` event in ONE atomic root `update()`. Extra colors are merged (never removed) so order lines keep their colors. Restore is refused while offline; if the write fails nothing changes locally.
- **Phone-oriented layout (index.html)**: scrolling header = title + sync pill + the 4 status counters; the sticky part is only `.stick` = search box + 🔔 + ☰ and one horizontally scrollable chip row (branches | size filters, ≥42 px tall). The ☰ menu sheet (`#menuModal`) holds the rarely used actions 💾 Yedek, 🎨 Renkler, 🖨️ PDF / Yazdır and 🚪 Çıkış (same element ids as before, so the handlers are unchanged; each also closes the menu). The loom edit window has a sticky footer (`.sheet-foot`: İptal + ✓ Kaydet), 46 px inputs and uppercase section labels; inputs are 16 px on phones to stop iOS zoom. Sticky bars inside padded sheets use `top/bottom:0` + negative margins (negative offsets would clip them). Layout was NOT verified in a real browser by the assistant.
- Color dropdowns in the loom edit window (main/sub colors and warp colors) are sorted in Turkish alphabetical order with "0 (İplik Yok)" always first (`optsHtml` + `trCompare`).
- Loom property `extra` (`"spingel"` / `"simli"` / `""`): two ✅ toggle buttons ŞPİNGEL and SİMLİ in the loom edit window; it is shown ONLY in the edit window, at the very BOTTOM of it (owner explicitly does NOT want it on cards or in print); selecting one clears the other, tapping the selected one clears it. Not used by siparis.html.
- Filters by branch/width; the search box matches customer, loom id, MAIN color and the FIRST sub color (140 cm looms: both wings, indexes 0,1,3,4) with loose letter matching (ş=s, ı=i, ç=c, ğ=g, ö=o, ü=u); stats (running/stopped/no yarn/maintenance), print/PDF report, customer manager (dropdown-based customer fields).
- "📋 Siparişler (N)" button per loom: read-only modal listing orders whose width matches AND whose color equals the loom's CURRENT main color (exact matches only – owner decided not to show "possible with change" on this page), with assigned orders, remaining qty, meters, and a warning if an assigned color no longer matches.

## 7. Open items / pending

1. ~~`ONLY100` loom ID~~ – RESOLVED: A3. Owner is testing the pages and will send all remaining notes in one batch; code was last revised for the answers above (110×200, 60×80, rolls).
2. ~~Where the 110×200 congregational rug is produced~~ – RESOLVED: 200 cm looms only, 110 cm long.
3. ~~Rolls on 140 cm wing looms~~ – RESOLVED: a 140 loom weaves ONE 140-wide fabric; each 70 cm half (wing) can have its own color and the fabric is cut down the middle. If the customer wants a color present on only one wing, the other wing's color inevitably comes out too – the customer either accepts both or the order is declined. Same logic as seccade (companion line).
4. ~~Linking "Yapılan" between companion and original~~ – RESOLVED: linked (see 5).
5. Possible future: lightweight order-form fields (fabric code, meters, dates) instead of PDF uploads – deferred.
6. Optional security hardening (API-key origin restriction).

## 8. Operations

- Deploy: upload changed file(s) via GitHub web UI (Add file → Upload files, same file name) → Commit. Pages updates in about a minute. GitHub Copilot commit-message suggestions were disabled in the owner's settings.
- Backups (owner's routine): orders → "📤 Yedek al" (siparis.html) weekly; machines → "💾 Yedek" (index.html) before big changes; whole database → Firebase console Realtime Database ⋮ → Export JSON monthly.
- **Testing caveat**: all code was verified only with Node syntax checks and simulated-DOM logic tests, never in a real browser by the assistant; the owner tests on the live site and reports back. Login and rule changes were tested live and work.

## 9. Working with the owner

Arabic-speaking, uses a phone, prefers short step-by-step instructions, no paid services (free tiers only), tests every upload and reports back conversationally. Keep UI strings in Turkish. Always change one thing at a time and keep the two pages' shared constants (colors, branches, widths) in sync.

## 10. Firebase cleanup (owner does this by hand in the console, after a backup)

Used by the code: `kale_dokuma_live_v2`, `kale_customers_pool_v2`, `kale_colors_v2`, `kale_siparis_v1` (created when the first order is saved). Obsolete leftovers from older versions that no code reads: `factory_looms_live`, `factory_looms_live_v4 … _v20` (13 nodes), `kale_dokuma_live_v1`, `kale_customers_v4`, `kale_customers_pool_v1`, `kale_customers_migrated_v4`, `kale_colors_v1`. Safe to delete after a fresh Export JSON.
