// Χτίζει το index.html από το src/template.html και τα αρχεία του content/.
// Χρήση: node build.js   (χωρίς εξαρτήσεις, Node 18+)
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "content");

// Πίνακες γραμματικής (κλίσεις, συζυγίες). Στα κείμενα μια λέξη γίνεται «κουμπί» γραμματικής με {{τύπος|κλειδί}}.
const G = JSON.parse(fs.readFileSync(path.join(dir, "_grammar.json"), "utf8"));
for (const [k, g] of Object.entries(G)) {
  if (!g.lemma || !g.book) throw new Error(`_grammar.json: το "${k}" θέλει lemma και book`);
  if (!g.tenses && !(g.sg && g.pl)) throw new Error(`_grammar.json: το "${k}" θέλει tenses (ρήμα) ή sg/pl (όνομα)`);
  for (const t of g.tenses || []) for (const [m, f] of t.moods) if (f.length !== 6) throw new Error(`_grammar.json: ${k}, ${t.n}, ${m}: θέλει 6 πρόσωπα`);
  for (const n of ["sg", "pl"]) if (g[n] && g[n].length !== 5) throw new Error(`_grammar.json: ${k}.${n}: θέλει 5 πτώσεις`);
}

const C = {};
for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json") && !f.startsWith("_")).sort()) {
  // F-1.1.json -> "F/1.1", M-A1.2.json -> "M/A1.2", A-r3.json -> "A/r3"
  const key = f.replace(/\.json$/, "").replace("-", "/");
  const raw = fs.readFileSync(path.join(dir, f), "utf8");
  const data = JSON.parse(raw);
  for (const field of ["title", "exTitle", "summary", "quiz", "ex"]) {
    if (!(field in data)) throw new Error(`${f}: λείπει το πεδίο "${field}"`);
  }
  data.quiz.forEach((q, i) => {
    if (!q.q || !q.c || !Array.isArray(q.w) || q.w.length < 2) throw new Error(`${f}: η ερώτηση ${i + 1} θέλει q, c και τουλάχιστον 2 λάθος απαντήσεις στο w`);
    if (q.w.includes(q.c)) throw new Error(`${f}: στην ερώτηση ${i + 1} η σωστή απάντηση υπάρχει και στις λάθος`);
  });
  for (const [i, v] of (data.vocab || []).entries()) {
    if (!Array.isArray(v) || v.length !== 3) throw new Error(`${f}: η λέξη ${i + 1} του vocab θέλει [λέξη, σημασία, λέξεις των νέων ελληνικών]`);
  }
  data.ex.forEach((e, i) => {
    if ("topic" in e && !(e.topic >= 0 && e.topic < data.summary.length)) throw new Error(`${f}: η άσκηση ${i + 1} δείχνει σε θέμα ${e.topic} που δεν υπάρχει`);
    if (![1, 2, 3].includes(e.lvl)) throw new Error(`${f}: η άσκηση ${i + 1} θέλει "lvl": 1 (Εύκολη), 2 (Μέτρια) ή 3 (Δύσκολη)`);
  });
  for (const m of raw.matchAll(/\{\{[^|}]+\|([^}]+)\}\}/g)) {
    if (!G[m[1]]) throw new Error(`${f}: η λέξη γραμματικής "${m[0]}" δείχνει σε "${m[1]}", που δεν υπάρχει στο _grammar.json`);
  }
  C[key] = data;
}

const template = fs.readFileSync(path.join(__dirname, "src", "template.html"), "utf8");
for (const mark of ["/*__DATA__*/", "/*__GRAMMAR__*/"]) {
  if (!template.includes(mark)) throw new Error(`Το template δεν έχει το ${mark}`);
}
const html = template.replace("/*__DATA__*/", JSON.stringify(C)).replace("/*__GRAMMAR__*/", JSON.stringify(G));

// Έλεγχος ότι κάθε <script> της σελίδας είναι συντακτικά σωστό
for (const s of html.split("<script>").slice(1)) new Function(s.split("</script>")[0]);

fs.writeFileSync(path.join(__dirname, "index.html"), html);
console.log(`OK: ${Object.keys(C).length} ενότητες, ${Object.keys(G).length} πίνακες γραμματικής -> index.html (${html.length} bytes)`);
