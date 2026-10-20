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
for (const mark of ["/*__DATA__*/", "/*__GRAMMAR__*/", "/*__CATALOGUE_JS__*/", "/*__CATALOGUE_CSS__*/"]) {
  if (!template.includes(mark)) throw new Error(`Το template δεν έχει το ${mark}`);
}
const json = value => JSON.stringify(value).replace(/</g, "\\u003c");
const catalogueJS = fs.readFileSync(path.join(__dirname,"src","catalogue.js"),"utf8")
  .replace("/*__CURRICULUM__*/", () => json(curriculum))
  .replace("/*__OFFICIAL_CONTENT__*/", () => json(officialContent))
  .replace("/*__EXPLANATIONS__*/", () => json(explanations));
const html = template.replace("/*__DATA__*/", () => json(C)).replace("/*__GRAMMAR__*/", () => json(G))
  .replace("/*__CATALOGUE_JS__*/", () => catalogueJS)
  .replace("/*__CATALOGUE_CSS__*/", () => fs.readFileSync(path.join(__dirname,"src","catalogue.css"),"utf8"))
  .replace("/*__APP_CSS__*/", () => fs.readFileSync(path.join(__dirname,"src","app.css"),"utf8"))
  .replace("/*__APP_JS__*/", () => fs.readFileSync(path.join(__dirname,"src","app.js"),"utf8"));

// Έλεγχος ότι κάθε <script> της σελίδας είναι συντακτικά σωστό
for (const s of html.split("<script>").slice(1)) new Function(s.split("</script>")[0]);

fs.writeFileSync(path.join(__dirname, "index.html"), html);
require("./scripts/build-local-app")(html, __dirname);
console.log(`OK: ${Object.keys(C).length} παλιές ενότητες, ${Object.keys(officialContent).length} νέα επίσημα μαθήματα, ${Object.keys(G).length} πίνακες γραμματικής -> index.html (${html.length} bytes)`);
