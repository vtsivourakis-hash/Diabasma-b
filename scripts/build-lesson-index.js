// Build the list of teachable lessons from the official ebook catalogue.
// Reference books and front/back matter remain linked in the catalogue, but are
// not presented as authored lessons.
const fs = require('node:fs');
const path = require('node:path');

const curriculum = require('../src/curriculum.json');
const output = path.join(__dirname, '../src/lessons.json');

const fold = value => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('el').replace(/ς/g, 'σ').replace(/[^a-zα-ω0-9]+/g, ' ').trim();

const SUPPORT_BOOK = [
  /γραμματικη/, /λεξικο/, /συντακτικο/, /ιστορια νεοελληνικησ λογοτεχνιασ/,
  /ιστορια αρχαιασ ελληνικησ γραμματειασ/, /τετραδιο/, /εργαστηριακοσ οδηγος/,
  /γλωσσαριο/, /audio/, /cd audio/
];
const NON_LESSON = [
  /^εξωφυλλο/, /^περιεχομενα$/, /εξωφυλλο περιεχομενα/, /εισαγωγη περιεχομενα/, /^προλογοσ/,
  /^εισαγωγικο σημειωμα/, /^σημειωμα/, /^οδηγιεσ/, /^βιβλιογραφια/,
  /^ευρετηριο/, /^παραρτημα/, /^απαντησεισ/, /^λυσεισ/, /^πηγεσ$/,
  /συντελεστεσ/, /συγγραφικη ομαδα/, /εικονογραφηση/, /διορθωσεισ/,
  /ανακεφαλαιωση/, /επαναληπτικεσ ερωτησεισ αυτοαξιολογησησ/, /^αυτοαξιολογηση$/,
  /ηλεκτρονικο βιβλιο$/, /^επιμετρο$/, /^παραλληλα κειμενα$/, /^λεξιλογιο$/,
  /^αρχικοι χρονοι ρηματων$/, /^συγκεντρωτικοι πινακεσ φαινομενων$/,
  /^[α-ω]\d+\s+(?!\d)/
];

function isSupportBook(title){
  const value = fold(title);
  return SUPPORT_BOOK.some(rule => rule.test(value));
}
function isLesson(title){
  const value = fold(title);
  return value.length > 2 && !NON_LESSON.some(rule => rule.test(value));
}

const grades = curriculum.grades.map(grade => ({
  id: grade.id,
  subjects: grade.subjects.map(subject => ({
    id: subject.id,
    books: subject.books.map((book, bookIndex) => ({
      bookIndex,
      role: isSupportBook(book.title) ? 'reference' : 'course',
      lessons: book.sections.map((section, sectionIndex) => ({
        sectionIndex,
        title: section.title,
        url: section.url
      })).filter(section => isLesson(section.title))
    })).filter(book => book.lessons.length)
  })).filter(subject => subject.books.length)
}));

const result = {
  generatedFrom: 'src/curriculum.json',
  grades
};
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');

for (const grade of grades) {
  const course = grade.subjects.flatMap(s => s.books).filter(b => b.role === 'course').reduce((n,b) => n + b.lessons.length, 0);
  const reference = grade.subjects.flatMap(s => s.books).filter(b => b.role === 'reference').reduce((n,b) => n + b.lessons.length, 0);
  console.log(`${grade.id}: ${course} course lessons; ${reference} reference sections`);
}

module.exports = {fold,isSupportBook,isLesson};
