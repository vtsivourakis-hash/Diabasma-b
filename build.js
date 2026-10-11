// Χτίζει το index.html από το src/template.html και τα αρχεία του content/.
// Χρήση: node build.js   (χωρίς εξαρτήσεις, Node 18+)
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "content");
const C = {};
for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json")).sort()) {
  // F-1.1.json -> "F/1.1", M-A1.2.json -> "M/A1.2", A-r3.json -> "A/r3"
  const key = f.replace(/\.json$/, "").replace("-", "/");
  const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  for (const field of ["title", "exTitle", "summary", "quiz", "ex"]) {
    if (!(field in data)) throw new Error(`${f}: λείπει το πεδίο "${field}"`);
  }
  data.quiz.forEach((q, i) => {
    if (!q.q || !q.c || !Array.isArray(q.w) || q.w.length < 2) throw new Error(`${f}: η ερώτηση ${i + 1} θέλει q, c και τουλάχιστον 2 λάθος απαντήσεις στο w`);
    if (q.w.includes(q.c)) throw new Error(`${f}: στην ερώτηση ${i + 1} η σωστή απάντηση υπάρχει και στις λάθος`);
  });
  data.ex.forEach((e, i) => {
    if ("topic" in e && !(e.topic >= 0 && e.topic < data.summary.length)) throw new Error(`${f}: η άσκηση ${i + 1} δείχνει σε θέμα ${e.topic} που δεν υπάρχει`);
  });
  C[key] = data;
}

const template = fs.readFileSync(path.join(__dirname, "src", "template.html"), "utf8");
if (!template.includes("/*__DATA__*/")) throw new Error("Το template δεν έχει το /*__DATA__*/");
const html = template.replace("/*__DATA__*/", JSON.stringify(C));

// Έλεγχος ότι το JavaScript της σελίδας είναι συντακτικά σωστό
new Function(html.split("<script>")[1].split("</script>")[0]);

fs.writeFileSync(path.join(__dirname, "index.html"), html);
console.log(`OK: ${Object.keys(C).length} ενότητες -> index.html (${html.length} bytes)`);
