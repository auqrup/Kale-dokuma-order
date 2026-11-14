/* ============================================================
   shared.js  -  ORTAK SABİTLER (Kale Dokuma)
   index.html, siparis.html ve fabrika.html ÜÇÜ DE bu dosyayı yükler:  <script src="shared.js?v=N"></script>

   KURALLAR (README bölüm 0):
   - FIXED_COLORS (28 sabit renk) DEĞİŞTİRİLEMEZ / SİLİNEMEZ / yeniden adlandırılamaz. Sadece sona yeni sabit renk eklenmesi gerekirse buradan eklenir.
     (Kullanıcının eklediği "ek renkler" Firebase'de kale_colors_v2'dedir, burada değil.)
   - Bu dosyada herhangi bir şeyi değiştirirseniz SHARED_VERSION'ı artırın VE 3 sayfadaki "shared.js?v=N" sayısını aynı yapın
     (python3 check.py bunu kontrol eder). Bu dosyayı GitHub'a diğer dosyalarla AYNI klasöre yükleyin.
   ============================================================ */
const SHARED_VERSION = 1;

/* "0" = renk yok / boş (rengi olmayan kanat). Her sayfa kendi COLORS nesnesini bunlardan kurar:
   index.html / fabrika.html:  { "0": NO_COLOR_HEX, ...FIXED_COLORS }     siparis.html:  { ...FIXED_COLORS }  ("0" listede görünmesin) */
const NO_COLOR_HEX = "#475569";

const FIXED_COLORS = Object.freeze({
  "PETROL":"#084a68","ÖZBEK BORDO":"#300303","LACİVERT":"#090835",
  "AÇIK BORDO":"#ff2e2e","AÇIK GRİ":"#949ca8","PAST GRAY":"#c3c5c6",
  "SP GREY":"#323e3e","KOYU GRİ":"#1e1e1f","SİYAH":"#000000",
  "SİLKY(SARIBEJ)":"#d99b45","SARIBEJ":"#f1bf79","ŞEKER LT":"#fff2c2",
  "IVORY":"#f6f6ef","ŞEKER AYM":"#e9e3ce","VİZON":"#684f2c",
  "KOYU KAHVE":"#24160a","MARON":"#5b010b","ZÜMRÜT":"#073f74",
  "Z-BLUE":"#145090","FOWN (AÇIK BAL)":"#e4d79b","NEFTİ":"#082b16",
  "FISTIK YEŞİL":"#15b300","KREM":"#f5ebd1","GÜL":"#692b49",
  "B.GREEN":"#3a644c","CAM GÖBEĞİ":"#009e7e","SAXMAVİ":"#1100ff",
  "SOĞAN(ALTIN)":"#947400"
});

/* Şubeler (makine numarası = harf + numara: R1..R16, A1..A4, Y1..Y8, K1..K6) */
const BRANCHES = { R: { name: "Rüya", count: 16 }, A: { name: "Acar", count: 4 }, Y: { name: "Y. Acar", count: 8 }, K: { name: "Karaman", count: 6 } };

/* Makine genişlikleri: makine numarasına göre döner: WIDTHS[(num - 1) % 3] */
const WIDTHS = [140, 160, 200];

/* Çözgü (warp) renkleri */
const WARPS = { "SİYAH":"#0f172a", "BEYAZ":"#ffffff", "SARI":"#eab308" };

/* Üretim süresi tahmini: günlük üretim (tezgah boyu, m/gün; yaklaşık).
   200 cm: 240 · 140 cm: SİMLİ 210 / ŞPİNGEL 370 · 160 cm: SİMLİ 210 / ŞPİNGEL 350. Özellik seçilmemişse SİMLİ varsayılır. */
const DAILY = { 200: { simli: 240, spingel: 240 }, 140: { simli: 210, spingel: 370 }, 160: { simli: 210, spingel: 350 } };
