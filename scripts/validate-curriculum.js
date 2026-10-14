const assert = require('node:assert/strict');
const config = require('../src/curriculum-config.json');
function validateCurriculum(catalogue) {
  assert.equal(catalogue.schoolYear,config.schoolYear);
  assert.deepEqual(catalogue.grades.map(g=>g.id),['A','B','C']);
  const safeUrl = value => {
    const url = new URL(value);
    assert.equal(url.protocol,'https:');
    assert.ok(['ebooks.edu.gr','www.iep.edu.gr','www2.iep.edu.gr','www.minedu.gov.gr'].includes(url.hostname),`Unexpected source: ${value}`);
  };
  safeUrl(catalogue.timetableUrl);safeUrl(catalogue.guidanceUrl);
  for(const [i,g] of catalogue.grades.entries()) {
    assert.equal(g.code,config.grades[i].code);
    safeUrl(g.catalogueUrl);
    assert.deepEqual(g.subjects.map(s=>s.id),config.subjects.filter(s=>s.hours[i]).map(s=>s.id));
    assert.equal(g.subjects.reduce((n,s)=>n+(s.choice?0:s.hours),0)+4,g.hours,`Timetable hours: ${g.id}`);
    for(const s of g.subjects) {
      assert.equal(s.hours,config.subjects.find(c=>c.id===s.id).hours[i]);
      assert.ok(s.books.length || s.resourceUrl,`Missing resources: ${g.id}/${s.id}`);
      if(s.resourceUrl) safeUrl(s.resourceUrl);
      if(s.legacy) assert.equal(g.id,'B');
      assert.equal(new Set(s.books.map(b=>b.id)).size,s.books.length);
      for(const b of s.books) {
        assert.ok(b.title && /^8547\/\d+$/.test(b.id));
        safeUrl(b.source);
        assert.ok(b.formats.length);
        b.formats.forEach(f=>{assert.ok(['html','pdf','audio'].includes(f.kind));safeUrl(f.url);});
        assert.equal(new Set(b.sections.map(x=>x.url)).size,b.sections.length);
        for(const section of b.sections) {
          assert.ok(section.title);safeUrl(section.url);
          assert.ok(b.formats.some(f=>f.kind==='html' && section.url.startsWith(f.url)),`Section outside book: ${section.url}`);
        }
      }
    }
  }
}
module.exports = {validateCurriculum};
