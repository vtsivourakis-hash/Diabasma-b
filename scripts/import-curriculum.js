// Refresh public catalogue metadata; textbooks stay on the Ministry's servers.
// Run: node --use-system-ca scripts/import-curriculum.js (Node 22.19+).
const fs = require('node:fs');
const path = require('node:path');
const config = require('../src/curriculum-config.json');
const ORIGIN = 'https://ebooks.edu.gr';
const meta = (items, key) => items.find(m => m.key === key)?.value || '';
const decode = text => text.replace(/<[^>]*>/g, '').replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp|ndash|mdash|hellip);/gi, (_, entity) => {
  if (entity[0] === '#') return String.fromCodePoint(entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1)));
  return {amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' ',ndash:'–',mdash:'—',hellip:'…'}[entity.toLowerCase()];
}).replace(/\s+/g, ' ').trim();
const titleCase = title => title.charAt(0) + title.slice(1).toLocaleLowerCase('el');
async function read(url, json = false) {
  const response = await fetch(url, {signal: AbortSignal.timeout(25000)});
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return json ? response.json() : response.text();
}
function apiUrl(code) {
  const p = new URLSearchParams();
  for (const value of ['course.lom.classification-grade','expression.lom.classification-digitalExpression','manifestation.lom.lifecycle-status']) p.append('query_field[]', value);
  for (const value of ['equals','in_val','equals']) p.append('query_op[]', value);
  for (const value of [code,"'4','5','6','15','17','18'",'1']) p.append('query_val[]', value);
  for (const [key,value] of Object.entries({limit:'-1',offset:'0',expand:'all,metadata',filters:'none',selected_columns:'m1.*',selected_elements:"'title','technical-location','relation-hasThumbnail','identifier'",selected_collections:"'course','work','expression','manifestation'"})) p.set(key,value);
  return `${ORIGIN}/ebooks/rest/get-items-info-2?${p}`;
}
function parseContents(html, base) {
  const links = new Map();
  // The official HTML reader exposes its complete navigation in select[name=section].
  const select = html.match(/<select\b[^>]*name=["']section["'][^>]*>([\s\S]*?)<\/select>/i);
  if (!select) return [];
  for (const option of select[1].matchAll(/<option\b[^>]*value=["']([^"']+)["'][^>]*>([\s\S]*?)<\/option>/gi)) {
    const url = new URL(decode(option[1]), base);
    const title = decode(option[2]);
    if (url.origin !== ORIGIN || !url.pathname.startsWith(new URL(base).pathname) || !title) continue;
    // Repeated destinations are headings for the same page: retain the specific label.
    links.set(url.href, {title, url:url.href});
  }
  return [...links.values()];
}
async function main() {
  const pages = await Promise.all(config.grades.map(async grade => ({grade,items:await read(apiUrl(grade.code),true)})));
  const grades = pages.map(({grade,items}, index) => {
    if (!Array.isArray(items) || items.length < 20) throw new Error(`Incomplete catalogue: ${grade.id}`);
    const subjects = config.subjects.filter(s => s.hours[index]).map(subject => {
      const books = new Map();
      for (const item of items) {
        if (!item.Courses.some(c => subject.match.includes(meta(c.metadataCourse,'course.dc.title')))) continue;
        const title = meta(item.metadata,'work.dc.title');
        if (/ΚΑΘΗΓΗΤΗ|ΔΑΣΚΑΛΟΥ|ΕΚΠΑΙΔΕΥΤΙΚΟΥ/.test(title)) continue;
        const id = meta(item.metadata,'work.dc.identifier.uri');
        const book = books.get(id) || {id, title:titleCase(title), source:`${ORIGIN}/ebooks/handle/${id}`, formats:[], sections:[]};
        const view = item.manifestation_view_url;
        const download = item.manifestation_download_url;
        const kind = view?.includes('/html/') ? 'html' : download?.endsWith('.pdf') ? 'pdf' : download?.endsWith('.zip') ? 'audio' : null;
        if (!kind) continue;
        const url = `${ORIGIN}/ebooks${kind === 'html' ? view : download}`;
        if (!book.formats.some(f => f.url === url)) book.formats.push({kind,url,id:meta(item.metadata,'manifestation.dc.identifier.uri'),label:meta(item.metadata,'expression.dc.title')});
        books.set(id,book);
      }
      const {match, hours, descriptions, legacy, ...fields} = subject;
      return {...fields, hours:hours[index], description:descriptions?.[index] || '', legacy:grade.id === 'B' ? legacy || null : null, books:[...books.values()].sort((a,b)=>a.title.localeCompare(b.title,'el'))};
    });
    return {...grade, catalogueUrl:`${ORIGIN}/ebooks/v2/class-main.jsp?classcode=${grade.code}`, subjects};
  });
  const cache = new Map();
  const queue = grades.flatMap(g=>g.subjects.flatMap(s=>s.books));
  const warnings = [];
  async function worker() {
    while (queue.length) {
      const book = queue.shift();
      const html = book.formats.filter(f=>f.kind==='html').sort((a,b)=>Number(a.label.startsWith('μη '))-Number(b.label.startsWith('μη ')))[0];
      if (!html) continue;
      if (!cache.has(html.url)) cache.set(html.url, read(html.url).then(text=>parseContents(text,html.url)));
      try { book.sections = await cache.get(html.url); }
      catch (error) { warnings.push(`${book.title}: ${error.message}`); }
    }
  }
  await Promise.all(Array.from({length:4},worker));
  if (warnings.length) throw new Error(`Catalogue not written: ${warnings.join('\n')}`);
  const output = {schoolYear:config.schoolYear, verifiedOn:config.verifiedOn, timetableUrl:config.timetableUrl, guidanceUrl:config.guidanceUrl, grades};
  fs.writeFileSync(path.join(__dirname,'../src/curriculum.json'), JSON.stringify(output,null,2)+'\n');
  const books = grades.flatMap(g=>g.subjects.flatMap(s=>s.books));
  console.log(`Imported ${grades.length} grades, ${grades.reduce((n,g)=>n+g.subjects.length,0)} subject entries, ${books.length} books/resources, ${books.reduce((n,b)=>n+b.sections.length,0)} section links.`);
}
if (require.main === module) main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports = {parseContents};
