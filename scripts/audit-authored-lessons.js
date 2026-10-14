// Reports authored coverage against the teachable lesson index.
// Use --require-complete as the final release gate.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = require('../src/lessons.json');
const authored = {};
for (const file of fs.readdirSync(path.join(root, 'src')).filter(name => /^official-lessons(?:-.+)?\.json$/.test(name))) {
  const entries = JSON.parse(fs.readFileSync(path.join(root, 'src', file), 'utf8'));
  for (const [key, value] of Object.entries(entries)) {
    if (authored[key]) throw new Error(`Duplicate authored lesson: ${key}`);
    authored[key] = value;
  }
}

let total = 0;
let ready = 0;
const missing = [];
for (const grade of index.grades) {
  for (const subject of grade.subjects) {
    let subjectTotal = 0;
    let subjectReady = 0;
    for (const book of subject.books.filter(item => item.role === 'course')) {
      for (const lesson of book.lessons) {
        const key = `${grade.id}/${subject.id}/${book.bookIndex}/${lesson.sectionIndex}`;
        total++;
        subjectTotal++;
        if (authored[key]) {
          ready++;
          subjectReady++;
        } else {
          missing.push({key,title:lesson.title});
        }
      }
    }
    if (subjectTotal) console.log(`${grade.id}/${subject.id}: ${subjectReady}/${subjectTotal}`);
  }
}
console.log(`TOTAL: ${ready}/${total} authored; ${missing.length} remaining`);
if (process.argv.includes('--json')) console.log(JSON.stringify({ready,total,missing}, null, 2));
if (process.argv.includes('--require-complete') && missing.length) process.exitCode = 1;
