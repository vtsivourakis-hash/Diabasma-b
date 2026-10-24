// Χτίζει το index.html από το src/template.html και τα αρχεία του content/.
// Χρήση: node build.js   (χωρίς εξαρτήσεις, Node 18+)
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "content");
const curriculum = JSON.parse(fs.readFileSync(path.join(__dirname, "src", "curriculum.json"), "utf8"));
const explanations = JSON.parse(fs.readFileSync(path.join(__dirname, "src", "explanations.json"), "utf8"));
for (const [key, explanation] of Object.entries(explanations)) {
  const [gradeId, subjectId, bookText, sectionText] = key.split("/");
  const grade = curriculum.grades.find(item => item.id === gradeId);
  const subject = grade?.subjects.find(item => item.id === subjectId);
  if (!subject?.books[Number(bookText)]?.sections[Number(sectionText)]) throw new Error(`explanations.json: άγνωστη διαδρομή ${key}`);
  if (!["core", "modified", "optional"].includes(explanation.status)) throw new Error(`explanations.json: ${key} έχει άγνωστο status`);
  for (const field of ["simple", "remember", "example", "syllabusNote"]) if (!explanation[field]) throw new Error(`explanations.json: ${key} θέλει ${field}`);
}
const officialContent = {};
for (const file of fs.readdirSync(path.join(__dirname, "src")).filter(name => /^official-lessons(?:-.+)?\.json$/.test(name)).sort()) {
  const entries = JSON.parse(fs.readFileSync(path.join(__dirname, "src", file), "utf8"));
  for (const [key, value] of Object.entries(entries)) {
    if (officialContent[key]) throw new Error(`${file}: διπλό μάθημα ${key}`);
    officialContent[key] = value;
  }
}
// Ενότητες που διδάσκονται σε άλλη τάξη (π.χ. το κεφ. 5-6 του βιβλίου Βιολογίας Α΄ στη Β΄): ίδιο περιεχόμενο, δύο διαδρομές.
const sectionAt = key => {
  const [gradeId, subjectId, bookText, sectionText] = key.split("/");
  const book = curriculum.grades.find(item => item.id === gradeId)?.subjects.find(item => item.id === subjectId)?.books[Number(bookText)];
  return book && book.sections[Number(sectionText)] ? { book, section: book.sections[Number(sectionText)] } : null;
};
const sharedFile = path.join(__dirname, "src", "shared-units.json");
if (fs.existsSync(sharedFile)) {
  for (const [key, from] of Object.entries(JSON.parse(fs.readFileSync(sharedFile, "utf8")).units)) {
    const a = sectionAt(key), b = sectionAt(from);
    if (!a || !b) throw new Error(`shared-units.json: άγνωστη διαδρομή ${!a ? key : from}`);
    if (a.book.id !== b.book.id || a.section.url !== b.section.url) throw new Error(`shared-units.json: το ${key} και το ${from} δεν είναι η ίδια ενότητα του ίδιου βιβλίου`);
    if (officialContent[key]) throw new Error(`shared-units.json: το ${key} έχει ήδη δικό του περιεχόμενο`);
    if (officialContent[from]) officialContent[key] = officialContent[from];
  }
}
// Σχήμα κάρτας ("fig"): τύπος, alt, explain και τα δεδομένα κάθε τύπου (βλ. figure() στο src/catalogue.js)
function checkFig(f, at) {
    if (!f.alt) throw new Error(`${at} θέλει alt (περιγραφή για αναγνώστες οθόνης)`);
    if (!f.explain) throw new Error(`${at} θέλει explain (πώς διαβάζεται το σχήμα, για το κουτί «Στο σχήμα»)`);
    if (f.type === "balance") {
      if (!(f.steps?.length >= 1 && f.steps.length <= 3) || f.steps.some(st => !st.eq || ![st.l, st.r].every(side => Array.isArray(side) && side.length === 2 && Number.isInteger(side[0]) && Number.isInteger(side[1]) && side[0] >= 0 && side[0] <= 3 && side[1] >= 0 && side[1] <= 12 && side[0] + side[1] > 0))) throw new Error(`${at}: θέλει 1–3 βήματα {eq, l:[x, n], r:[x, n]} με x ≤ 3 και n ≤ 12`);
    } else if (f.type === "line") {
      if (!(f.max > f.min)) throw new Error(`${at}: θέλει min < max`);
      for (const v of [...(f.points || []).map(p => p.x), ...(f.arrows || []).flatMap(a => [a.from, a.to])]) if (!(v >= f.min && v <= f.max)) throw new Error(`${at}: το ${v} είναι έξω από τον άξονα`);
    } else if (f.type === "forces") {
      if (!f.forces?.length || f.forces.some(g => !["up", "down", "left", "right"].includes(g.dir) || !(g.len > 0) || !g.label)) throw new Error(`${at}: κάθε δύναμη θέλει dir, len, label`);
    } else if (f.type === "compose") {
      if (!(f.a?.len > 0 && f.b?.len > 0 && f.a.label && f.b.label && f.r)) throw new Error(`${at}: θέλει a, b (len, label) και r`);
    } else if (f.type === "depth") {
      if (!(f.h > 0) || (f.points || []).some(p => !(p.h >= 0 && p.h <= f.h) || !p.label)) throw new Error(`${at}: θέλει h και σημεία με βάθος από 0 έως h`);
    } else if (f.type === "buoy") {
      if (!f.air || !f.water) throw new Error(`${at}: θέλει air και water`);
    } else if (f.type === "press") {
      if (!f.f1 || !f.f2) throw new Error(`${at}: θέλει f1 και f2`);
    } else if (f.type === "scales") {
      if (!f.rows?.length || f.rows.some(r => typeof r.c !== "number" || !r.label)) throw new Error(`${at}: κάθε γραμμή θέλει c (°C) και label`);
    } else if (f.type === "energy") {
      if (!f.cols?.length || f.cols.some(c => !c.label || !(("u" in c) || ("k" in c)) || [c.u, c.k].some(v => v !== undefined && !(v >= 0)))) throw new Error(`${at}: κάθε στήλη θέλει label και u ή k (≥ 0)`);
    } else if (f.type === "chain") {
      if (!(f.steps?.length >= 2)) throw new Error(`${at}: θέλει τουλάχιστον 2 βήματα`);
    } else if (f.type === "split") {
      if (!f.total || !f.parts?.length || f.parts.some(p => !(p.v > 0) || !p.label)) throw new Error(`${at}: θέλει total και μέρη με v > 0 και label`);
    } else if (f.type !== "vessels") throw new Error(`${at}: άγνωστος τύπος ${f.type}`);
}
// Τα πεδία της κάρτας για τη ροή «μία ιδέα σε κάθε κάρτα»: more (κι άλλα παραδείγματα), alt («Πες το μου αλλιώς»),
// και "topic" στις λυμένες και στις ερωτήσεις (σε ποια κάρτα ανήκουν)
function checkCards(name, lesson) {
  const n = lesson.summary.length;
  lesson.summary.forEach((card, i) => {
    const at = `${name}: κάρτα ${i + 1}`;
    if (card.fig) checkFig(card.fig, `${at}, σχήμα`);
    if (card.more && (!Array.isArray(card.more) || card.more.some(t => typeof t !== "string" || !t))) throw new Error(`${at}: το more θέλει λίστα με κείμενα`);
    const a = card.alt;
    if (a) {
      if (!a.t) throw new Error(`${at}: το alt θέλει t (η άλλη ματιά)`);
      if (a.q && (!a.q.q || !a.q.c || a.q.w?.length !== 3 || !a.q.why || a.q.w.includes(a.q.c))) throw new Error(`${at}: η ερώτηση του alt θέλει q, c, 3 διαφορετικές λάθος απαντήσεις και why`);
    }
  });
  for (const [list, what] of [[lesson.quiz, "ερώτηση"], [lesson.ex, "άσκηση"]]) list.forEach((x, i) => {
    if (typeof x.topic === "number" && !(Number.isInteger(x.topic) && x.topic >= 0 && x.topic < n)) throw new Error(`${name}: η ${what} ${i + 1} δείχνει σε κάρτα ${x.topic} που δεν υπάρχει`);
  });
}
for (const [key, lesson] of Object.entries(officialContent)) {
  const [gradeId, subjectId, bookText, sectionText] = key.split("/");
  const grade = curriculum.grades.find(item => item.id === gradeId);
  const subject = grade?.subjects.find(item => item.id === subjectId);
  const section = subject?.books[Number(bookText)]?.sections[Number(sectionText)];
  if (!section) throw new Error(`official-lessons.json: άγνωστη διαδρομή ${key}`);
  for (const field of ["title", "summary", "vocab", "quiz", "exTitle", "ex"]) {
    if (!lesson[field]?.length) throw new Error(`official-lessons.json: ${key} θέλει ${field}`);
  }
  lesson.summary.forEach((card, index) => {
    for (const field of ["h", "t", "ex", "def"]) if (!card[field]) throw new Error(`${key}: η κάρτα ${index + 1} θέλει ${field}`);
  });
  checkCards(key, lesson);
  if (lesson.grammar) {
    if (!lesson.grammar.length) throw new Error(`${key}: το grammar δεν μπορεί να είναι κενό`);
    lesson.grammar.forEach((card, index) => {
      for (const field of ["h", "t", "ex", "def"]) if (!card[field]) throw new Error(`${key}: η κάρτα γραμματικής ${index + 1} θέλει ${field}`);
    });
  }
  lesson.quiz.forEach((question, index) => {
    if (!question.q || !question.c || question.w?.length !== 3 || !question.why) throw new Error(`${key}: η ερώτηση ${index + 1} θέλει q, c, 3 λάθος απαντήσεις και why`);
  });
  lesson.ex.forEach((exercise, index) => {
    if (!exercise.q || !exercise.ans || !exercise.steps?.length || ![1,2,3].includes(exercise.lvl)) throw new Error(`${key}: η άσκηση ${index + 1} δεν είναι πλήρης`);
  });
}
const { validateCurriculum } = require("./scripts/validate-curriculum");
validateCurriculum(curriculum);

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
  // Το όνομα του αρχείου είναι η ενότητα του βιβλίου: B-math-0-2.json -> "B/math/0/2"
  const key = f.replace(/\.json$/, "").split("-").join("/");
  const raw = fs.readFileSync(path.join(dir, f), "utf8");
  const data = JSON.parse(raw);
  // "also": άλλες ενότητες του ίδιου βιβλίου που καλύπτει η ίδια ενότητα (π.χ. η ραψωδία Α σε τρία κομμάτια)
  for (const k of [key, ...(data.also || [])]) {
    if (!sectionAt(k)) throw new Error(`${f}: άγνωστη ενότητα βιβλίου ${k}`);
    if (officialContent[k]) throw new Error(`${f}: το ${k} έχει ήδη περιεχόμενο στα official-lessons`);
  }
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
  checkCards(f, data);
  for (const m of raw.matchAll(/\{\{[^|}]+\|([^}]+)\}\}/g)) {
    if (!G[m[1]]) throw new Error(`${f}: η λέξη γραμματικής "${m[0]}" δείχνει σε "${m[1]}", που δεν υπάρχει στο _grammar.json`);
  }
  C[key] = data;
}

// Βοήθεια για τις ασκήσεις του βιβλίου (src/book-help-*.json): κλειδί ενότητας -> λίστα ασκήσεων.
// Κάθε άσκηση: ref (πού είναι στο βιβλίο), lvl, topic (θέμα της περίληψης), hints (βοήθειες {h,t} ή επιλογή {q,c,w[2],why}), result.
const bookHelp = {};
for (const file of fs.readdirSync(path.join(__dirname, "src")).filter(name => /^book-help-.+\.json$/.test(name)).sort()) {
  for (const [key, items] of Object.entries(JSON.parse(fs.readFileSync(path.join(__dirname, "src", file), "utf8")))) {
    const unit = C[key] || officialContent[key];
    if (!unit) throw new Error(`${file}: άγνωστη ενότητα ${key}`);
    if (bookHelp[key]) throw new Error(`${file}: διπλή ενότητα ${key}`);
    if (!items.length) throw new Error(`${file}: ${key} χωρίς ασκήσεις`);
    items.forEach((it, i) => {
      const at = `${file}: ${key}, άσκηση ${i + 1}`;
      if (!it.ref || !it.result) throw new Error(`${at} θέλει ref και result`);
      if (![1, 2, 3].includes(it.lvl)) throw new Error(`${at} θέλει lvl 1, 2 ή 3`);
      if (!(Number.isInteger(it.topic) && it.topic >= 0 && it.topic < unit.summary.length)) throw new Error(`${at}: το topic ${it.topic} δεν υπάρχει`);
      if (!Array.isArray(it.hints) || it.hints.length < 3) throw new Error(`${at} θέλει τουλάχιστον 3 βοήθειες`);
      if (!it.hints.some(h => h.q)) throw new Error(`${at} θέλει τουλάχιστον μία βοήθεια-επιλογή (q, c, w, why)`);
      it.hints.forEach((h, j) => {
        if (h.q ? !(h.c && h.why && Array.isArray(h.w) && h.w.length === 2 && !h.w.includes(h.c)) : !(h.h && h.t)) throw new Error(`${at}, βοήθεια ${j + 1}: θέλει h και t, ή q, c, 2 λάθος στο w και why`);
      });
    });
    bookHelp[key] = items;
  }
}

const template = fs.readFileSync(path.join(__dirname, "src", "template.html"), "utf8");
for (const mark of ["/*__DATA__*/", "/*__GRAMMAR__*/", "/*__BOOK_HELP__*/", "/*__CATALOGUE_JS__*/", "/*__CATALOGUE_CSS__*/", "/*__PLAN_JS__*/", "/*__PLAN_CSS__*/"]) {
  if (!template.includes(mark)) throw new Error(`Το template δεν έχει το ${mark}`);
}
const json = value => JSON.stringify(value).replace(/</g, "\\u003c");
const catalogueJS = fs.readFileSync(path.join(__dirname,"src","catalogue.js"),"utf8")
  .replace("/*__CURRICULUM__*/", () => json(curriculum))
  .replace("/*__OFFICIAL_CONTENT__*/", () => json(officialContent))
  .replace("/*__EXPLANATIONS__*/", () => json(explanations));
const html = template.replace("/*__DATA__*/", () => json(C)).replace("/*__GRAMMAR__*/", () => json(G)).replace("/*__BOOK_HELP__*/", () => json(bookHelp))
  .replace("/*__CATALOGUE_JS__*/", () => catalogueJS)
  .replace("/*__CATALOGUE_CSS__*/", () => fs.readFileSync(path.join(__dirname,"src","catalogue.css"),"utf8"))
  .replace("/*__APP_CSS__*/", () => fs.readFileSync(path.join(__dirname,"src","app.css"),"utf8"))
  .replace("/*__APP_JS__*/", () => fs.readFileSync(path.join(__dirname,"src","app.js"),"utf8"))
  .replace("/*__PLAN_CSS__*/", () => fs.readFileSync(path.join(__dirname,"src","plan.css"),"utf8"))
  .replace("/*__PLAN_JS__*/", () => fs.readFileSync(path.join(__dirname,"src","plan.js"),"utf8"));

// Έλεγχος ότι κάθε <script> της σελίδας είναι συντακτικά σωστό
for (const s of html.split("<script>").slice(1)) new Function(s.split("</script>")[0]);

fs.writeFileSync(path.join(__dirname, "index.html"), html);
require("./scripts/build-local-app")(html, __dirname);
console.log(`OK: ${Object.keys(officialContent).length + Object.keys(C).length} μαθήματα (${Object.keys(C).length} με κάρτες από το content/), ${Object.keys(G).length} πίνακες γραμματικής -> index.html (${html.length} bytes)`);
