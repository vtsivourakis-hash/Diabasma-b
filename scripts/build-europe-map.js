#!/usr/bin/env node
// Φτιάχνει το src/europe-map.json: ο χάρτης της Ευρώπης για τα σχήματα "map" των καρτών.
// Πηγή: Natural Earth (δημόσιο κτήμα, https://www.naturalearthdata.com), τα σύνορα από την οπτική της Ελλάδας
// (ne_10m_admin_0_countries_grc: ενιαία Κύπρος, το Κοσσυφοπέδιο στη Σερβία, η Κριμαία στην Ουκρανία),
// και ποτάμια από τα ne_10m_rivers_lake_centerlines και ne_10m_rivers_europe.
// Χρήση: node scripts/build-europe-map.js <φάκελος με τα .geojson>
// Τα .geojson δεν μπαίνουν στο αποθετήριο· μόνο το αποτέλεσμα (src/europe-map.json).
const fs = require("fs"), path = require("path");
const dir = process.argv[2];
if (!dir) { console.error("Χρήση: node scripts/build-europe-map.js <φάκελος με τα .geojson>"); process.exit(1); }
const read = f => JSON.parse(fs.readFileSync(path.join(dir, f + ".geojson"), "utf8"));

// Περιοχή του χάρτη (μοίρες) και προβολή: ισοδύναμη αζιμουθιακή του Lambert με κέντρο 15° Α, 52° Β.
const BOX = {w: -25, e: 62, s: 33, n: 72}, LON0 = 15, LAT0 = 52, W = 1000, TOL = 0.5;
// Περισσότερη λεπτομέρεια για την Ελλάδα και τη γειτονιά της (χάρτες σε μεγέθυνση), λιγότερη για τις μακρινές χώρες
const DETAIL = new Set(["GRC", "CYP", "ALB", "MKD", "BGR", "TUR", "SRB", "MNE", "BIH", "HRV", "SVN", "ROU", "ITA", "MLT"]), TOL_DETAIL = 0.18;
const COARSE = new Set(["NOR", "RUS", "ISL", "SWE", "FIN", "SJM", "GRL"]), TOL_COARSE = 0.8;
const FAR = new Set(["IRN", "IRQ", "SAU", "EGY", "LBY", "DZA", "TKM", "UZB", "KAZ", "SYR", "JOR", "ISR", "PSX", "LBN", "TUN", "MAR"]), TOL_FAR = 1.2;
const rad = Math.PI / 180, sin0 = Math.sin(LAT0 * rad), cos0 = Math.cos(LAT0 * rad);
function laea(lon, lat) {
  const l = (lon - LON0) * rad, p = lat * rad;
  const k = Math.sqrt(2 / (1 + sin0 * Math.sin(p) + cos0 * Math.cos(p) * Math.cos(l)));
  return [k * Math.cos(p) * Math.sin(l), -k * (cos0 * Math.sin(p) - sin0 * Math.cos(p) * Math.cos(l))];
}
// Όρια της προβολής: δείγματα πάνω στις άκρες του BOX
let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
for (let i = 0; i <= 100; i++) for (const [lon, lat] of [[BOX.w + (BOX.e - BOX.w) * i / 100, BOX.s], [BOX.w + (BOX.e - BOX.w) * i / 100, BOX.n], [BOX.w, BOX.s + (BOX.n - BOX.s) * i / 100], [BOX.e, BOX.s + (BOX.n - BOX.s) * i / 100]]) {
  const [x, y] = laea(lon, lat); mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mny = Math.min(mny, y); mxy = Math.max(mxy, y);
}
const K = W / (mxx - mnx), H = Math.round((mxy - mny) * K);
const proj = (lon, lat) => { const [x, y] = laea(lon, lat); return [(x - mnx) * K, (y - mny) * K]; };

// Αποκοπή δακτυλίου στο BOX (Sutherland–Hodgman, σε μοίρες)
function clipRing(ring) {
  const edges = [[p => p[0] >= BOX.w, (a, b) => cutX(a, b, BOX.w)], [p => p[0] <= BOX.e, (a, b) => cutX(a, b, BOX.e)], [p => p[1] >= BOX.s, (a, b) => cutY(a, b, BOX.s)], [p => p[1] <= BOX.n, (a, b) => cutY(a, b, BOX.n)]];
  let out = ring;
  for (const [inside, cut] of edges) {
    const inp = out; out = [];
    for (let i = 0; i < inp.length; i++) {
      const a = inp[i], b = inp[(i + 1) % inp.length];
      if (inside(b)) { if (!inside(a)) out.push(cut(a, b)); out.push(b); } else if (inside(a)) out.push(cut(a, b));
    }
    if (!out.length) break;
  }
  return out;
}
const cutX = (a, b, x) => [x, a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0])];
const cutY = (a, b, y) => [a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]), y];

// Απλοποίηση Douglas–Peucker σε μονάδες του χάρτη
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let md = 0, mi = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L; if (d > md) { md = d; mi = i; } }
    if (md > tol) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const r1 = v => Math.round(v * 10) / 10;
const ringPath = pts => "M" + pts.map(([x, y]) => r1(x) + " " + r1(y)).join("L") + "Z";
const linePath = pts => "M" + pts.map(([x, y]) => r1(x) + " " + r1(y)).join("L");
const area = pts => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);

// Χώρες
const NAMES = {IRL: "Ιρλανδία", BIH: "Βοσνία-Ερζεγοβίνη", MKD: "Βόρεια Μακεδονία", CZE: "Τσεχία", GBR: "Ηνωμένο Βασίλειο"};
const countries = {};
for (const f of read("ne_10m_admin_0_countries_grc").features) {
  const p = f.properties, a3 = p.ADM0_A3, g = f.geometry;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  let d = "";
  for (const poly of polys) for (const ring of poly) {
    const c = clipRing(ring); if (c.length < 3) continue;
    const tol = DETAIL.has(a3) ? TOL_DETAIL : FAR.has(a3) ? TOL_FAR : COARSE.has(a3) ? TOL_COARSE : TOL;
    const pts = simplify(c.map(([lon, lat]) => proj(lon, lat)), tol);
    if (pts.length < 3 || area(pts) < (DETAIL.has(a3) ? 0.05 : 0.6)) continue;
    d += ringPath(pts);
  }
  if (!d) continue;
  const inBox = p.LABEL_X > BOX.w && p.LABEL_X < BOX.e && p.LABEL_Y > BOX.s && p.LABEL_Y < BOX.n;
  const [lx, ly] = inBox ? proj(p.LABEL_X, p.LABEL_Y) : [null, null];
  countries[a3] = {n: NAMES[a3] || p.NAME_EL || p.NAME, d, ...(inBox ? {lx: r1(lx), ly: r1(ly)} : {})};
}

// Ποτάμια: τα κομμάτια ενώνονται ανά όνομα (λατινικά, όπως στο Natural Earth)
const RIVERS = {
  Danube: ["Danube", "Donau"], Sava: ["Sava"], Rhine: ["Rhine", "Rhein", "Rhin"], Elbe: ["Elbe"], Oder: ["Oder"], Vistula: ["Vistula"],
  Volga: ["Volga"], Dnieper: ["Dnipro", "Dnepre"], Don: ["Don"], Loire: ["Loire"], Seine: ["Seine"], Rhone: ["Rhône"], Po: ["Po"], Thames: ["Thames"],
  Tagus: ["Tajo", "Tejo"], Evros: ["Evros", "Maritsa"], Strymonas: ["Strymnas", "Strimonas"], Nestos: ["Mesta"], Ardas: ["Arda"],
  Aliakmonas: ["Haliacmon"], Acheloos: ["Acheloos"]
};
const alias = {}; for (const [k, v] of Object.entries(RIVERS)) for (const n of v) alias[n] = k;
const rivers = {};
for (const file of ["ne_10m_rivers_lake_centerlines", "ne_10m_rivers_europe"]) for (const f of read(file).features) {
  const k = alias[f.properties.name]; if (!k) continue;
  const g = f.geometry, lines = g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : [];
  for (const line of lines) {
    const pts = line.filter(([lon, lat]) => lon >= BOX.w && lon <= BOX.e && lat >= BOX.s && lat <= BOX.n).map(([lon, lat]) => proj(lon, lat));
    if (pts.length < 2) continue;
    rivers[k] = (rivers[k] || "") + linePath(simplify(pts, TOL * 0.6));
  }
}
// Οι μεγάλες λίμνες, για να μη φαίνονται σαν στεριά
let lakes = "";
for (const f of read("ne_50m_lakes").features) {
  if ((f.properties.scalerank ?? 9) > 3) continue;
  const g = f.geometry, polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  for (const poly of polys) { const c = clipRing(poly[0]); if (c.length < 3) continue; const pts = simplify(c.map(([lon, lat]) => proj(lon, lat)), TOL); if (pts.length >= 3 && area(pts) > 4) lakes += ringPath(pts); }
}

const out = {source: "Natural Earth (δημόσιο κτήμα), σύνορα από την οπτική της Ελλάδας", box: BOX, lon0: LON0, lat0: LAT0, k: +K.toFixed(4), mnx: +mnx.toFixed(6), mny: +mny.toFixed(6), w: W, h: H, countries, rivers, lakes};
const file = path.join(__dirname, "..", "src", "europe-map.json");
fs.writeFileSync(file, JSON.stringify(out) + "\n");
console.log(`${file}: ${Object.keys(countries).length} χώρες, ${Object.keys(rivers).length} ποτάμια, ${(fs.statSync(file).size / 1024).toFixed(0)} KB, ${W}×${H}`);
const missing = Object.keys(RIVERS).filter(k => !rivers[k]); if (missing.length) console.log("Χωρίς δεδομένα:", missing.join(", "));
