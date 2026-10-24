// All textbook content remains hosted by ebooks.edu.gr; only its index is bundled.
const CATALOGUE = /*__CURRICULUM__*/;
const OFFICIAL_CONTENT = /*__OFFICIAL_CONTENT__*/;
const EXPLANATIONS = /*__EXPLANATIONS__*/;
const getGrade = id => CATALOGUE.grades.find(g => g.id === id);
let selectedGrade = 'B';
try { const saved = JSON.parse(localStorage.getItem('diab-grade')); if(getGrade(saved)) selectedGrade = saved; } catch(e){}
const normalizeSearch = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el').replace(/ς/g,'σ');
const gradeSubject = (grade, id) => getGrade(grade)?.subjects.find(s => s.id === id);
const courseHref = (grade, id) => `#course/${grade}/${id}`;
const lessonHref = (grade, subject, book, section) => `#lesson/${grade}/${subject}/${book}/${section}`;
const external = (url, label, cls='') => `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label} <span aria-hidden="true">↗</span><span class="sr-only"> (νέα καρτέλα)</span></a>`;
function selectGrade(id){
  if(!getGrade(id)) return;
  selectedGrade = id;
  store.set('diab-grade', id);
}
function renderGradeNav(){
  $('#grade-nav').innerHTML = CATALOGUE.grades.map(g=>`<a href="#class/${g.id}"${g.id===selectedGrade?' aria-current="page"':''}>${g.label}</a>`).join('');
  $('#classes-tab').href = `#class/${selectedGrade}`;
  $('.logo').textContent = getGrade(selectedGrade).label.split(' ')[0];
}
function connectionNotice(){
  return `<p class="connection-note${navigator.onLine?'':' offline'}" data-connection>${navigator.onLine?'Τα επίσημα βιβλία ανοίγουν σε νέα καρτέλα και χρειάζονται σύνδεση στο διαδίκτυο.':'Είσαι εκτός σύνδεσης. Ο κατάλογος και οι αποθηκευμένες σημειώσεις λειτουργούν. Για τα επίσημα βιβλία χρειάζεται διαδίκτυο ή ένα PDF που έχεις ήδη κατεβάσει.'}</p>`;
}
for(const event of ['online','offline']) window.addEventListener(event,()=>document.querySelectorAll('[data-connection]').forEach(el=>{el.outerHTML=connectionNotice();}));
/* Χρώμα και εικονίδιο για κάθε μάθημα. Τα χρώματα είναι μεταβλητές (--c-…) και στα τρία μπλοκ του template. */
const SUBJECT_LOOK = {
  math:['violet','<path d="M3 13h3l3 7 5-16h7"/>'],
  physics:['cyan','<ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>'],
  chemistry:['lime','<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"/><path d="M7.5 15h9"/>'],
  biology:['green','<path d="M5 20c0-9 6-15 15-15 0 9-6 15-15 15z"/><path d="M5 20l8-8"/>'],
  geography:['blue','<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>'],
  history:['amber','<path d="M3 9l9-5 9 5"/><path d="M5 9h14M6 9v9M10 9v9M14 9v9M18 9v9M4 20h16"/>'],
  ancient:['pink','<path d="M7 4h11v13a3 3 0 0 1-3 3H6"/><path d="M6 20a3 3 0 0 1-3-3h11a3 3 0 0 0 3 3"/><path d="M10 8h5M10 12h5"/>'],
  translated:['pink','<path d="M20 4c-7 0-12 5-13 12l-3 4"/><path d="M7 16c4 0 9-3 11-8"/>'],
  language:['orange','<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>'],
  literature:['orange','<path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6v14"/>'],
  religion:['amber','<path d="M12 3c1.6 2 1.6 3.6 0 5-1.6-1.4-1.6-3 0-5z"/><path d="M9 11h6v10H9z"/>'],
  ethics:['amber','<path d="M12 4v16M6 20h12M5 8h14"/><path d="M5 8l-3 6h6zM19 8l-3 6h6z"/>'],
  english:['blue','<path d="M4 6h9M8.5 4v2M6 6c0 4 2.5 6.5 6 7.5M11 6c0 4-2.5 6.5-6 7.5"/><path d="M13 20l4-9 4 9M14.5 17h5"/>'],
  french:['blue','<path d="M4 6h9M8.5 4v2M6 6c0 4 2.5 6.5 6 7.5M11 6c0 4-2.5 6.5-6 7.5"/><path d="M13 20l4-9 4 9M14.5 17h5"/>'],
  german:['blue','<path d="M4 6h9M8.5 4v2M6 6c0 4 2.5 6.5 6 7.5M11 6c0 4-2.5 6.5-6 7.5"/><path d="M13 20l4-9 4 9M14.5 17h5"/>'],
  italian:['blue','<path d="M4 6h9M8.5 4v2M6 6c0 4 2.5 6.5 6 7.5M11 6c0 4-2.5 6.5-6 7.5"/><path d="M13 20l4-9 4 9M14.5 17h5"/>'],
  computing:['cyan','<path d="M3 4h18v12H3z"/><path d="M8 20h8M12 16v4"/>'],
  technology:['lime','<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>'],
  music:['pink','<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'],
  art:['orange','<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-.9 2-2s-1-1.6-1-2.6 1-1.4 2-1.4h2a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1" fill="currentColor"/><circle cx="10" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="7.5" r="1" fill="currentColor"/>'],
  pe:['green','<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.5 3 3.5 15 0 18M12 3c-3.5 3-3.5 15 0 18"/>'],
  skills:['violet','<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z"/>']
};
function subjectIcon(id,cls=''){
  const [c,paths]=SUBJECT_LOOK[id]||['violet','<circle cx="12" cy="12" r="8"/>'];
  return `<span class="subject-icon${cls?' '+cls:''}" style="--sc:var(--c-${c})" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg></span>`;
}
/* Τι θα βρει ο μαθητής σε κάθε ενότητα βιβλίου:
   full  = Πλήρες: περίληψη, λέξεις, ερωτήσεις και λυμένες, όλα γραμμένα για αυτή την ενότητα
   expl  = Εξήγηση: σύντομη εξήγηση· οι ερωτήσεις και οι δραστηριότητες είναι γενικές
   guide = Οδηγός: γενικές οδηγίες μελέτης· το περιεχόμενο είναι στο επίσημο βιβλίο
   Πλήρες περιεχόμενο έρχεται από τα official-lessons ή από το content/ (C), και μέσω του ALIAS για ενότητες που καλύπτει άλλη ενότητα. */
const lessonLevel = key => unitData(ALIAS[key] || key) ? 'full' : EXPLANATIONS[key] ? 'expl' : 'guide';
const LEVEL_CHIP = {full:'<span class="chip ok">Πλήρες</span>', expl:'<span class="chip expl">Εξήγηση</span>', guide:'<span class="chip">Οδηγός</span>'};
/* Αν ο μαθητής έχει λύσει το Quiz της ενότητας, δείχνουμε τον καλύτερο βαθμό του αντί για «Πλήρες» */
const lessonChip = key => { const u = ALIAS[key] || key, best = unitData(u) ? bestOf(u) : undefined; return best === undefined ? LEVEL_CHIP[lessonLevel(key)] : `<span class="chip score ${best >= 14 ? 'ok' : best >= 10 ? 'mid' : 'low'}" title="Ο καλύτερος βαθμός σου στις ερωτήσεις">${best}/20</span>`; };
const levelLegend = () => `<p class="level-legend">${LEVEL_CHIP.full} μελετάς από εδώ · ${LEVEL_CHIP.expl} σύντομη εξήγηση, εξάσκηση από το βιβλίο · ${LEVEL_CHIP.guide} μελετάς από το βιβλίο</p>`;
/* Μαθήματα χωρίς κάρτες, κουίζ και λυμένες: μόνο σύνδεσμος στο βιβλίο και μια γενική περιγραφή.
   Τα πρακτικά μαθήματα μαθαίνονται στην τάξη, και στις ξένες γλώσσες τα σχολεία χρησιμοποιούν συχνά δικά τους βιβλία. */
const INFO_ONLY = {
  art:'Στα Καλλιτεχνικά γνωρίζεις τα στοιχεία της εικόνας, όπως τη γραμμή, το χρώμα, το σχήμα και τη σύνθεση. Δουλεύεις με διάφορα υλικά και τεχνικές, π.χ. σχέδιο, ζωγραφική, κολάζ και κατασκευές, και μαθαίνεις να «διαβάζεις» έργα τέχνης από διάφορες εποχές. Το μάθημα είναι κυρίως πρακτικό: μετράει η συμμετοχή και η δημιουργική σου δουλειά στην τάξη.',
  music:'Στη Μουσική ακούς μουσική από την Ελλάδα και τον κόσμο και γνωρίζεις βασικά στοιχεία της, όπως ο ρυθμός, η μελωδία, τα όργανα και τα μουσικά είδη. Τραγουδάς, παίζεις και δημιουργείς. Το μάθημα γίνεται κυρίως στην τάξη, με ακρόαση και πράξη.',
  pe:'Στη Φυσική Αγωγή γυμνάζεσαι, μαθαίνεις ομαδικά και ατομικά αθλήματα και τους κανόνες τους, και καταλαβαίνεις πώς η άσκηση βοηθά την υγεία σου. Μετράει η συνεργασία και το ευ αγωνίζεσθαι. Το μάθημα γίνεται στο γήπεδο ή στο γυμναστήριο· χρειάζεσαι αθλητικά ρούχα και παπούτσια.',
  english:'Στα Αγγλικά αναπτύσσεις τέσσερις δεξιότητες: κατανοείς και παράγεις προφορικό και γραπτό λόγο, με λεξιλόγιο και γραμματική για καθημερινές περιστάσεις. Πολλά σχολεία χρησιμοποιούν και άλλα βιβλία, ανάλογα με το επίπεδο του τμήματος· ακολούθησε το βιβλίο που ορίζει ο/η καθηγητής σου.',
  french:'Στα Γαλλικά, ως δεύτερη ξένη γλώσσα, ξεκινάς από τα βασικά, όπως χαιρετισμούς, συστάσεις και καθημερινές φράσεις, και χτίζεις σιγά σιγά λεξιλόγιο και γραμματική. Πολλά σχολεία χρησιμοποιούν και άλλα βιβλία· ακολούθησε το βιβλίο του τμήματός σου.',
  german:'Στα Γερμανικά, ως δεύτερη ξένη γλώσσα, ξεκινάς από τα βασικά, όπως χαιρετισμούς, συστάσεις και καθημερινές φράσεις, και χτίζεις σιγά σιγά λεξιλόγιο και γραμματική. Πολλά σχολεία χρησιμοποιούν και άλλα βιβλία· ακολούθησε το βιβλίο του τμήματός σου.',
  italian:'Στα Ιταλικά, ως δεύτερη ξένη γλώσσα, ξεκινάς από τα βασικά, όπως χαιρετισμούς, συστάσεις και καθημερινές φράσεις, και χτίζεις σιγά σιγά λεξιλόγιο και γραμματική. Ακολούθησε το βιβλίο του τμήματός σου.'
};
function subjectCard(g,s){
  const indexed = s.books.reduce((n,b)=>n+b.sections.length,0);
  const keys = s.books.flatMap((b,bi)=>b.sections.map((_,si)=>`${g.id}/${s.id}/${bi}/${si}`));
  const full = keys.filter(key=>unitData(ALIAS[key] || key)).length;
  const expl = keys.filter(key=>lessonLevel(key)==='expl').length;
  const status = INFO_ONLY[s.id] ? (s.books.length ? 'Επίσημο βιβλίο και περιγραφή' : 'Περιγραφή μαθήματος') : full||expl ? [full?`${full} πλήρη`:'', expl?`${expl} εξηγήσεις`:'', `${indexed} στο βιβλίο`].filter(Boolean).join(' · ') : indexed ? `${indexed} οδηγοί μελέτης` : 'Υλικό ΙΕΠ';
  return `<a class="subject-card" href="${courseHref(g.id,s.id)}"><span class="subject-top">${subjectIcon(s.id)}<span>${s.hours} ${s.hours===1?'ώρα':'ώρες'} / εβδ.</span></span><strong>${esc(s.name)}</strong><span class="subject-detail">${esc(s.description || (s.choice==='language'?'2η ξένη γλώσσα':s.id==='ethics'?'Εναλλακτικά των Θρησκευτικών':s.books.length?'Κάρτες, κουίζ & επίσημα βιβλία':'Οδηγίες & εκπαιδευτικό υλικό'))}</span><span class="subject-status">${status} <span aria-hidden="true">→</span></span></a>`;
}
function renderCatalogue(){
  const g = getGrade(selectedGrade), el = $('#catalogue');
  el.innerHTML = `<div class="hero catalogue-hero has-art"><svg class="hero-art" viewBox="0 0 190 190" aria-hidden="true"><circle cx="120" cy="70" r="46" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="2"/><circle cx="120" cy="70" r="3" fill="#FBCFE8"/><line x1="120" y1="70" x2="166" y2="70" stroke="#FBCFE8" stroke-width="2" stroke-dasharray="4 4"/><path d="M58 150 L98 92 L138 150 Z" fill="rgba(236,72,153,.22)" stroke="rgba(255,255,255,.45)" stroke-width="2"/><path d="M98 92 L98 150" stroke="rgba(255,255,255,.35)" stroke-width="1.5" stroke-dasharray="3 4"/><rect x="94" y="144" width="6" height="6" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="1.2"/><path d="M150 112h28v28h-28z M150 112l10-10h28l-10 10 M178 112l10-10v28l-10 10" fill="rgba(196,181,253,.16)" stroke="rgba(255,255,255,.4)" stroke-width="1.6" stroke-linejoin="round"/></svg><span class="ref">Δημόσιο ημερήσιο Γυμνάσιο · ${CATALOGUE.schoolYear}</span><h2 class="ct">Η τάξη σου.<br>Όλα τα μαθήματα.</h2><p>Βρες το μάθημά σου και άνοιξε το επίσημο βιβλίο, τις ενότητες και τις ασκήσεις του.</p><div class="catalogue-meta"><span>${g.label}</span><span>${g.hours} ώρες / εβδομάδα</span><span>${g.subjects.length} μαθήματα & επιλογές</span></div></div>
    <a class="sch-card" href="#schedule">Το πρόγραμμα της εβδομάδας <span>Μόνο στη συσκευή σου →</span></a>
    <div class="catalogue-search"><label for="catalogue-query">Βρες μάθημα ή ενότητα</label><div class="search-row"><input id="catalogue-query" type="search" placeholder="π.χ. μαθηματικά, κλάσματα, Οδύσσεια" autocomplete="off"><button id="clear-query" type="button">Καθαρισμός</button></div><label class="search-scope"><input type="checkbox" id="all-grades"> Αναζήτηση και στις τρεις τάξεις</label></div>
    <p class="result-count" id="catalogue-count" role="status"></p><div id="catalogue-results"></div>
    <div class="catalogue-note"><p>Στις επιλογές θα βρεις Θρησκευτικά ή Ηθική και τις διαθέσιμες δεύτερες ξένες γλώσσες. Ακολουθείς όσα διδάσκονται στο τμήμα σου.</p><p>Ο κατάλογος περιλαμβάνει ολόκληρα τα βιβλία. Η διδακτέα ύλη καθορίζεται από τις ετήσιες οδηγίες και τον/την εκπαιδευτικό σου. <a href="#sources">Δες τις επίσημες πηγές</a>.</p></div>${connectionNotice()}`;
  const update = () => {
    const query = normalizeSearch($('#catalogue-query').value.trim());
    const grades = $('#all-grades').checked ? CATALOGUE.grades : [g];
    const results = $('#catalogue-results');
    if(!query){
      results.innerHTML = grades.map(grade=>`${grades.length>1?`<h2 class="ct">${grade.label}</h2>`:''}${[...new Set(grade.subjects.map(s=>s.group))].map(group=>`<section class="subject-group"><h3>${esc(group)}</h3><div class="subject-grid">${grade.subjects.filter(s=>s.group===group).map(s=>subjectCard(grade,s)).join('')}</div></section>`).join('')}`).join('');
      $('#catalogue-count').textContent = `${grades.reduce((n,grade)=>n+grade.subjects.length,0)} μαθήματα και διαθέσιμες επιλογές`;
      return;
    }
    const cards=[], hits=[];
    for(const grade of grades) for(const s of grade.subjects){
      if(normalizeSearch(`${s.name} ${s.description} ${s.books.map(b=>b.title).join(' ')}`).includes(query)) cards.push({grade,s});
      if(!INFO_ONLY[s.id]) for(const [bi,b] of s.books.entries()) for(const [si,section] of b.sections.entries()){
        if(normalizeSearch(section.title).includes(query)) hits.push({grade,s,b,section,bi,si});
      }
    }
    $('#catalogue-count').textContent = `${cards.length} μαθήματα · ${hits.length} ενότητες βιβλίων`;
    results.innerHTML = `${cards.length?`<div class="subject-grid">${cards.map(({grade,s})=>`<div>${grades.length>1?`<p class="result-count">${grade.label}</p>`:''}${subjectCard(grade,s)}</div>`).join('')}</div>`:''}${hits.length?`<section class="subject-group" style="margin-top:24px"><h3>Μαθήματα${hits.length>100?' · πρώτα 100 αποτελέσματα':''}</h3>${hits.slice(0,100).map(({grade,s,b,section,bi,si})=>`<a href="${lessonHref(grade.id,s.id,bi,si)}" class="search-hit">${esc(section.title)}<small>${grade.label} · ${esc(s.name)} · ${esc(b.title)}</small></a>`).join('')}</section>`:''}${!cards.length&&!hits.length?'<div class="empty-state"><h3>Δεν βρέθηκαν αποτελέσματα</h3><p>Δοκίμασε μια πιο σύντομη λέξη ή αναζήτησε σε όλες τις τάξεις.</p></div>':''}`;
  };
  $('#catalogue-query').oninput = update;
  $('#all-grades').onchange = update;
  $('#clear-query').onclick = ()=>{$('#catalogue-query').value='';update();$('#catalogue-query').focus();};
  update();
}
function renderCourse(grade,id){
  const g=getGrade(grade), s=gradeSubject(grade,id), el=$('#catalogue');
  if(!s){ el.innerHTML=`<div class="empty-state"><h2>Το μάθημα δεν βρέθηκε</h2><p>Διάλεξε ένα μάθημα από την τάξη σου.</p><a class="btn" href="#class/${selectedGrade}">Όλα τα μαθήματα</a></div>`;return; }
  document.title=`${s.name} · ${g.label} | Διάβασμα`;
  el.innerHTML=`<a class="back" href="#class/${grade}">← ${g.label} · Όλα τα μαθήματα</a><div class="hero catalogue-hero course-hero">${subjectIcon(s.id,'big')}<span class="ref">${g.label} · ${CATALOGUE.schoolYear}</span><h2 class="ct">${esc(s.name)}</h2>${s.description?`<p>${esc(s.description)}</p>`:''}<div class="catalogue-meta"><span>${s.hours} ${s.hours===1?'ώρα':'ώρες'} / εβδομάδα</span>${s.choice?'<span>Επιλογή του τμήματος</span>':''}</div></div>
    ${INFO_ONLY[s.id]?`<section class="book-card subject-about"><h3>Τι είναι αυτό το μάθημα</h3><p>${esc(INFO_ONLY[s.id])}</p></section>`:''}
    ${s.note?`<div class="catalogue-note">${esc(s.note)}</div>`:''}
    ${grade==='B'&&s.id==='ancient'?grammarIndex():''}
    ${connectionNotice()}
    ${s.books.length&&!INFO_ONLY[s.id]?'<div class="catalogue-search"><label for="lesson-query">Βρες μάθημα</label><div class="search-row"><input id="lesson-query" type="search" placeholder="Τίτλος ή λέξη-κλειδί" autocomplete="off"></div></div><p class="result-count" id="lesson-count" role="status"></p>':''}
    <div id="course-books"></div>
    ${s.resourceUrl?`<section class="book-card"><h3>${esc(s.resourceLabel)}</h3><p class="result-count">${s.books.length?'Πρόσθετες οδηγίες για το μάθημα.':'Το υλικό οργανώνεται μέσα από τις οδηγίες και τις δραστηριότητες του μαθήματος.'}</p><div class="book-actions">${external(s.resourceUrl,'Άνοιξε το επίσημο υλικό','primary')}</div></section>`:''}
    <div class="catalogue-note">Άνοιξε τα περιεχόμενα για να μεταβείς απευθείας σε μια ενότητα. Όπου διατίθεται μόνο PDF, όλες οι ενότητες βρίσκονται μέσα στο αρχείο. Η ύλη του τμήματός σου μπορεί να περιλαμβάνει επιλεγμένα κεφάλαια. ${external(CATALOGUE.guidanceUrl,'Οδηγίες διδασκαλίας ΙΕΠ')}.</div>`;
  const update=()=>{
    const query=normalizeSearch($('#lesson-query')?.value.trim()||'');
    let count=0;
    let lessons=0;
    const html=s.books.map((b,bi)=>{
      const matchesTitle=normalizeSearch(b.title).includes(query);
      const sections=b.sections.filter(section=>!query||matchesTitle||normalizeSearch(section.title).includes(query));
      if(query&&!matchesTitle&&!sections.length) return '';
      count++; lessons+=sections.length;
      const formats=[...b.formats].sort((a,b)=>({html:0,pdf:1,audio:2}[a.kind]-{html:0,pdf:1,audio:2}[b.kind]));
      return `<article class="book-card"><span class="book-ref">ΕΠΙΣΗΜΟ ΣΧΟΛΙΚΟ ΒΙΒΛΙΟ</span><h3>${esc(b.title)}</h3><div class="book-actions">${formats.map((f,i)=>external(f.url,f.kind==='html'?'Διάβασε online':f.kind==='pdf'?'Άνοιξε PDF':'Ηχητικό υλικό (ZIP)',i===0?'primary':'')).join('')}${external(b.source,'Στοιχεία βιβλίου')}</div>${INFO_ONLY[s.id]?'':sections.length?`${levelLegend()}<div class="lesson-list">${sections.map(section=>{const si=b.sections.indexOf(section),key=`${grade}/${id}/${bi}/${si}`,unit=ALIAS[key],optional=EXPLANATIONS[key]?.status==='optional';return `<a class="item lesson-item" href="${unit?'#lesson/'+unit:lessonHref(grade,id,bi,si)}"><span class="num">${String(si+1).padStart(2,'0')}</span><span class="tt">${esc(OFFICIAL_CONTENT[key]?.title||section.title)}${optional?'<small class="opt-note">Προαιρετικό στην ύλη 2026–2027</small>':''}</span>${lessonChip(key)}</a>`;}).join('')}</div>`:'<p class="result-count">Οι ενότητες και οι ασκήσεις περιλαμβάνονται στο πλήρες βιβλίο.</p>'}</article>`;
    }).join('');
    $('#course-books').innerHTML=html|| (query?'<div class="empty-state"><h3>Δεν βρέθηκε ενότητα</h3><p>Δοκίμασε άλλη λέξη ή άνοιξε το πλήρες PDF.</p></div>':'');
    if($('#lesson-count')) $('#lesson-count').textContent=`${lessons} μαθήματα · ${count} βιβλία και βοηθητικοί πόροι`;
  };
  if($('#lesson-query')) $('#lesson-query').oninput=update;
  update();
}

const officialState = {};
const officialWords = title => [...new Set(normalizeSearch(title).replace(/[^a-zα-ωάέήίόύώϊϋΐΰ0-9]+/gi,' ').split(' ').filter(w=>w.length>3 && !['στην','στον','τους','των','και','απο','προς','μιας','ενος','ενότητα','κεφάλαιο','εισαγωγη','περιεχομενα'].includes(w)))].slice(0,6);
function officialLesson(grade,subjectId,bookIndex,sectionIndex){
  const gradeData=getGrade(grade), subject=gradeSubject(grade,subjectId), book=subject?.books[bookIndex], section=book?.sections[sectionIndex];
  return gradeData&&subject&&book&&section ? {gradeData,subject,book,section,bookIndex:+bookIndex,sectionIndex:+sectionIndex} : null;
}
function officialQuiz(lesson){
  const {gradeData,subject,book,section,sectionIndex}=lesson;
  const siblings=book.sections.filter((_,i)=>i!==sectionIndex);
  const wrongSections=shuffle(siblings).slice(0,3).map(x=>x.title);
  const wrongSubjects=shuffle(gradeData.subjects.filter(x=>x.id!==subject.id)).slice(0,3).map(x=>x.name);
  const wrongGrades=CATALOGUE.grades.filter(x=>x.id!==gradeData.id).map(x=>x.label);
  const qs=[
    {q:'Ποιο είναι το θέμα αυτού του μαθήματος;',c:section.title,w:wrongSections,why:`Το μάθημα που άνοιξες είναι «${section.title}».`},
    {q:`Σε ποιο μάθημα ανήκει η ενότητα «${section.title}»;`,c:subject.name,w:wrongSubjects,why:`Ανήκει στο μάθημα «${subject.name}».`},
    {q:'Σε ποια τάξη βρίσκεται αυτό το μάθημα;',c:gradeData.label,w:wrongGrades.concat(['Δημοτικό']).slice(0,3),why:`Ο κατάλογος το εντάσσει στην ${gradeData.label}.`},
    {q:'Ποιο είναι το επίσημο βιβλίο αναφοράς;',c:book.title,w:shuffle(gradeData.subjects.flatMap(s=>s.books).filter(b=>b.id!==book.id)).slice(0,3).map(b=>b.title),why:`Η ενότητα ανοίγει μέσα από το βιβλίο «${book.title}».`}
  ];
  if(sectionIndex>0) qs.push({q:'Ποια ενότητα εμφανίζεται αμέσως πριν στο βιβλίο;',c:book.sections[sectionIndex-1].title,w:shuffle(siblings.filter(x=>x!==book.sections[sectionIndex-1])).slice(0,3).map(x=>x.title),why:'Αυτή είναι η προηγούμενη καταχώριση στα περιεχόμενα του επίσημου βιβλίου.'});
  if(sectionIndex<book.sections.length-1) qs.push({q:'Ποια ενότητα εμφανίζεται αμέσως μετά στο βιβλίο;',c:book.sections[sectionIndex+1].title,w:shuffle(siblings.filter(x=>x!==book.sections[sectionIndex+1])).slice(0,3).map(x=>x.title),why:'Αυτή είναι η επόμενη καταχώριση στα περιεχόμενα του επίσημου βιβλίου.'});
  const studyQuestions=[
    {q:'Ποια είναι η καλύτερη πρώτη κίνηση πριν μελετήσεις την ενότητα;',c:'Να διαβάσω τον τίτλο και να εντοπίσω τις βασικές έννοιες',w:['Να αποστηθίσω την τελευταία παράγραφο','Να παραλείψω τα παραδείγματα','Να ξεκινήσω χωρίς να ανοίξω το βιβλίο'],why:'Ο τίτλος και οι βασικές έννοιες δείχνουν τι χρειάζεται να κατανοήσεις.'},
    {q:'Πώς ελέγχεις αν κατάλαβες το μάθημα;',c:'Το εξηγώ με δικά μου λόγια και ελέγχω όσα ξέχασα',w:['Αντιγράφω το κείμενο χωρίς έλεγχο','Διαβάζω μόνο τον τίτλο','Κοιτάζω αμέσως όλες τις απαντήσεις'],why:'Η ανάκληση χωρίς βοήθεια δείχνει τι θυμάσαι και τι χρειάζεται επανάληψη.'}
  ];
  for(const q of studyQuestions) if(qs.length<6) qs.push(q);
  const fallbackAnswers=['Άλλη ενότητα του βιβλίου','Διαφορετικό σχολικό μάθημα','Καμία από τις παραπάνω'];
  return qs.slice(0,6).map(q=>({...q,w:[...q.w,...wrongSections,...fallbackAnswers].filter((x,i,a)=>x&&x!==q.c&&a.indexOf(x)===i).slice(0,3)}));
}
function officialBackToBook(key,redraw){
  const st=officialState[key],i=st.fromBook;
  st.view='book';st.fromBook=null;redraw();bhScroll(i);
}
window.addEventListener('popstate',e=>{
  const m=location.hash.match(/^#lesson\/([^/]+)\/([^/]+)\/(\d+)\/(\d+)$/);
  if(!m||(e.state&&e.state.theory))return;
  const key=m.slice(1).join('/'),st=officialState[key];
  if(st&&st.fromBook!=null&&!$('#catalogue').hidden)officialBackToBook(key,()=>renderOfficialLesson(m[1],m[2],m[3],m[4]));
});
function renderOfficialLesson(grade,subjectId,bookIndex,sectionIndex){
  const lesson=officialLesson(grade,subjectId,bookIndex,sectionIndex),el=$('#catalogue');
  if(!lesson){el.innerHTML='<div class="empty-state"><h2>Το μάθημα δεν βρέθηκε</h2><a class="btn" href="#class/'+selectedGrade+'">Όλα τα μαθήματα</a></div>';return;}
  const {gradeData:g,subject:s,book:b,section,sectionIndex:si}=lesson,key=`${grade}/${subjectId}/${bookIndex}/${sectionIndex}`,content=OFFICIAL_CONTENT[key],explanation=EXPLANATIONS[key];
  if(ALIAS[key]){ location.replace('#lesson/'+ALIAS[key]); return; }
  if(C[key]){ renderUnit(key); return; }
  if(INFO_ONLY[subjectId]){ location.replace(courseHref(grade,subjectId)); return; }
  const st=officialState[key]||(officialState[key]={view:'sum',card:0,gi:0,vi:0,picked:{},done:false,open:new Set()});
  const words=officialWords(section.title),prev=b.sections[si-1],next=b.sections[si+1];
  const genericCards=[
    {h:'Τι εξετάζει η ενότητα',t:`Η ενότητα οργανώνεται γύρω από το θέμα «${section.title}» και ανήκει στο μάθημα ${s.name}.`,ex:`Ξεκίνα εντοπίζοντας στο επίσημο βιβλίο πώς παρουσιάζεται το θέμα «${section.title}».`,def:`Μπορώ να εξηγήσω με δικά μου λόγια τι πραγματεύεται η ενότητα και σε ποιο ευρύτερο κεφάλαιο ανήκει.`},
    {h:'Βασικές έννοιες',t:words.length?`Οι έννοιες που πρέπει να ξεκαθαρίσεις πρώτα είναι: ${words.join(', ')}.`:'Εντόπισε τις βασικές έννοιες, τους ορισμούς και τις μεταξύ τους σχέσεις.',ex:'Γράψε για κάθε έννοια έναν σύντομο ορισμό και ένα παράδειγμα από το βιβλίο.',def:'Ορίζω κάθε βασική έννοια με ακρίβεια και εξηγώ τη σχέση της με το θέμα του μαθήματος.'},
    {h:'Η θέση του μαθήματος',t:`Το μάθημα βρίσκεται στο επίσημο βιβλίο «${b.title}». ${prev?`Προηγείται η ενότητα «${prev.title}».`:'Είναι η πρώτη καταχώριση του βιβλίου.'}`,ex:next?`Στη συνέχεια ακολουθεί η ενότητα «${next.title}».`:'Με αυτή την ενότητα ολοκληρώνονται τα περιεχόμενα του βιβλίου.',def:'Συνδέω το σημερινό θέμα με όσα προηγήθηκαν και εξηγώ πώς προετοιμάζει την επόμενη ενότητα.'},
    {h:'Κεντρική ιδέα και αποδείξεις',t:'Διάβασε κάθε παράγραφο και ξεχώρισε την κεντρική ιδέα από τα στοιχεία που τη στηρίζουν: ορισμούς, παραδείγματα, τύπους, γεγονότα ή επιχειρήματα.',ex:'Μετά από κάθε παράγραφο γράψε μία πρόταση που αρχίζει με «Το βασικό σημείο είναι…».',def:'Παρουσιάζω πρώτα την κεντρική ιδέα και έπειτα δύο συγκεκριμένα στοιχεία του βιβλίου που την τεκμηριώνουν.'},
    {h:'Έλεγχος κατανόησης',t:'Κλείσε το βιβλίο και εξήγησε το μάθημα χωρίς βοήθεια. Άνοιξέ το ξανά, σύγκρινε την απάντησή σου και συμπλήρωσε όσα παρέλειψες.',ex:'Χρησιμοποίησε διαφορετικό χρώμα για τις πληροφορίες που χρειάστηκε να προσθέσεις μετά τον έλεγχο.',def:'Η απάντησή μου έχει σωστή σειρά, βασικούς όρους και σαφή σύνδεση ανάμεσα στις ιδέες.'},
    {h:'Ολοκλήρωση της ενότητας',t:next?`Αφού κατανοήσεις το «${section.title}», μπορείς να συνεχίσεις στο «${next.title}».`:'Ολοκλήρωσες την τελευταία καταχώριση αυτού του βιβλίου.',ex:'Απάντησε στις ερωτήσεις και έπειτα δοκίμασε τις λυμένες δραστηριότητες χωρίς να ανοίξεις αμέσως τη λύση.',def:'Ελέγχω την απάντησή μου με το επίσημο βιβλίο και διορθώνω συγκεκριμένα τα σημεία που δεν θυμήθηκα.'}
  ],explanationCards=explanation?[
    {h:'Με απλά λόγια',t:explanation.simple,ex:explanation.example,def:explanation.remember},
    {h:'Τι χρειάζεται να θυμάσαι',t:explanation.remember,ex:explanation.example,def:explanation.remember},
    {h:'Σύνδεση με την επίσημη ύλη',t:explanation.syllabusNote,ex:'Άνοιξε την επίσημη σελίδα του βιβλίου για τα σχήματα, τις εφαρμογές και τις ασκήσεις που προτείνονται.',def:explanation.status==='optional'?'Η ενότητα είναι προαιρετική για το 2026–2027.':'Η εξήγηση ακολουθεί τις οδηγίες διδασκαλίας 2026–2027.'}
  ]:null,cards=content?.summary||explanationCards||genericCards,grammar=content?.grammar||[],hasGrammar=grammar.length>0;
  const quiz=content?.quiz||officialQuiz(lesson);
  let body='';
  const hasBook=!!BOOK_HELP[key],tabs=4+(hasGrammar?1:0)+(hasBook?1:0);
  if(st.view==='sum'){
    const c=cards[Math.min(st.card,cards.length-1)];
    body=`${st.fromBook!=null?'<button class="retex" data-oback>← Πίσω στην άσκηση του βιβλίου</button>':''}<div class="prog"><div class="bar"><i style="width:${Math.round((st.card+1)/cards.length*100)}%"></i></div><span>${st.card+1}/${cards.length}</span></div><div class="deck"><section class="blk slide"><span class="k">Θέμα ${st.card+1}</span><h3>${esc(c.h)}</h3><p>${esc(c.t)}</p><div class="box exb"><b>Παράδειγμα</b><p>${esc(c.ex)}</p></div><div class="box defb"><b>${esc(c.defLabel||'Στο διαγώνισμα γράφεις')}</b><p>${esc(c.def)}</p></div></section></div>${pager(st.card>0,st.card<cards.length-1,st.card===cards.length-1?`<button class="btn gold" data-oview="${hasGrammar?'grammar':'quiz'}">${hasGrammar?'Πάμε στη Γραμματική':'Πάμε στο Quiz'} →</button>`:'← σύρε →')}`;
  }else if(st.view==='grammar'&&hasGrammar){
    const gi=Math.min(st.gi,grammar.length-1),c=grammar[gi];
    body=`<div class="prog"><div class="bar" role="img" aria-label="Γραμματική ${gi+1} από ${grammar.length}"><i style="width:${Math.round((gi+1)/grammar.length*100)}%"></i></div><span>${gi+1}/${grammar.length}</span></div><div class="deck"><section class="blk slide"><span class="k">Γραμματική ${gi+1}</span><h3>${esc(c.h)}</h3><p>${esc(c.t)}</p><div class="box exb"><b>Παράδειγμα</b><p>${esc(c.ex)}</p></div><div class="box defb"><b>Κανόνας</b><p>${esc(c.def)}</p></div></section></div>${pager(gi>0,gi<grammar.length-1,gi===grammar.length-1?'<button class="btn gold" data-oview="voc">Πάμε στις Λέξεις →</button>':'← σύρε →')}`;
  }else if(st.view==='voc'){
    const vocab=content?.vocab?.length?content.vocab:[...new Set([...words,'βασική έννοια','κεντρική ιδέα','παράδειγμα'])].slice(0,Math.max(3,words.length)).map(word=>[word,'Βρες τον ακριβή ορισμό μέσα στην ενότητα.','Χρησιμοποίησε τον όρο σε μία σωστή πρόταση.']),vi=Math.min(st.vi,vocab.length-1),[word,meaning,example]=vocab[vi];
    body=`<div class="prog"><div class="bar" role="img" aria-label="Λέξη ${vi+1} από ${vocab.length}"><i style="width:${Math.round((vi+1)/vocab.length*100)}%"></i></div><span>${vi+1}/${vocab.length}</span></div><div class="deck"><section class="blk slide"><span class="k">Λέξη ${vi+1}</span><h3>${esc(word)}</h3><p>${esc(meaning)}</p><div class="box exb"><b>Παράδειγμα</b><p>${esc(example)}</p></div><div class="box defb"><b>Στο διαγώνισμα γράφεις</b><p>Σύντομο ορισμό, ένα χαρακτηριστικό και ένα σωστό παράδειγμα.</p></div></section></div>${pager(vi>0,vi<vocab.length-1,vi===vocab.length-1?'<button class="btn gold" data-oview="quiz">Πάμε στο Quiz →</button>':'← σύρε →')}`;
  }else if(st.view==='quiz'){
    if(st.done){const right=quiz.filter((q,i)=>st.picked[i]===q.c).length,score=Math.round(right/quiz.length*20);body=`<div class="sheet center"><span class="cheer">Κουίζ ενότητας</span>${gradeRing(score)}<p>Βρήκες σωστά ${right} από ${quiz.length}. ${content?'Οι ερωτήσεις ελέγχουν τις βασικές γνώσεις αυτού του μαθήματος.':'Το προσωρινό κουίζ ελέγχει τον προσανατολισμό σου στο επίσημο βιβλίο.'}</p><button class="btn" data-oqrestart>Ξανά</button></div>`;}
    else {const qi=Object.keys(st.picked).length,q=quiz[qi];body=`<div class="prog"><div class="bar"><i style="width:${Math.round((qi+1)/quiz.length*100)}%"></i></div><span>${qi+1}/${quiz.length}</span></div><div class="sheet"><span class="n">Ερώτηση ${qi+1}</span><p class="q">${esc(q.q)}</p><div class="opts">${shuffle([q.c,...q.w]).map(answer=>`<button class="opt" data-oanswer="${esc(answer)}"><span class="l" aria-hidden="true">•</span><span>${esc(answer)}</span></button>`).join('')}</div></div>`;}
  }else if(st.view==='book'&&hasBook){
    body=bookHelpView(key,section.url,cards);
  }else{
    const genericTasks=[
      ['Πες το με δικά σου λόγια',`Εξήγησε σε 3–5 προτάσεις τι έμαθες από την ενότητα «${section.title}».`,'Η απάντησή σου πρέπει να αναφέρει την κεντρική ιδέα και τουλάχιστον δύο βασικές λεπτομέρειες.'],
      ['Φτιάξε λέξεις-κλειδιά',`Διάλεξε ${Math.max(3,words.length)} λέξεις-κλειδιά από το μάθημα και γράψε δίπλα τι σημαίνει καθεμία.`,'Έλεγξε τους ορισμούς σου με το επίσημο βιβλίο.'],
      ['Βρες την απόδειξη',`Εντόπισε στο βιβλίο ένα παράδειγμα, στοιχείο, τύπο ή χωρίο που στηρίζει τη βασική ιδέα του μαθήματος.`,'Γράψε γιατί το συγκεκριμένο σημείο είναι σημαντικό.'],
      ['Δική σου εφαρμογή','Φτιάξε ένα δικό σου παράδειγμα ή μία ερώτηση που θα μπορούσε να μπει σε επανάληψη.','Έλεγξε ότι η απάντηση προκύπτει καθαρά από το μάθημα.'],
      ['Τελικός έλεγχος','Χωρίς να κοιτάξεις το βιβλίο, γράψε τι θυμάσαι. Μετά σύγκρινε και συμπλήρωσε με διαφορετικό χρώμα.','Όσα πρόσθεσες με διαφορετικό χρώμα είναι αυτά που χρειάζονται άλλη μία επανάληψη.']
    ],tasks=content?.ex?.length?content.ex:genericTasks.map(([h,q,ans],i)=>({h,q,ans,steps:[],lvl:i<2?1:i<4?2:3}));
    body=`<h3 style="font-size:18px;margin-bottom:12px">${esc(content?.exTitle||'Δραστηριότητες μελέτης')}</h3>${tasks.map((task,i)=>`<div class="sheet ex"><div class="exh"><span class="n">Άσκηση ${i+1}</span><span class="lvl l${task.lvl||1}">${LEVELS[task.lvl||1]}</span></div><h3>${esc(task.h||'Εφάρμοσε όσα έμαθες')}</h3><p class="q">${esc(task.q)}</p><button class="btn ghost" data-otask="${i}" aria-expanded="${st.open.has(i)}">${st.open.has(i)?'Κρύψε τη λύση':'Δες τη λύση'}</button><div class="sol"${st.open.has(i)?'':' hidden'}>${task.steps?.length?`<ol>${task.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol>`:''}<p class="ans">Απάντηση: <span>${esc(task.ans)}</span></p></div></div>`).join('')}`;
  }
  document.title=`${section.title} · ${g.label} | Διάβασμα`;
  el.innerHTML=`<a class="back" href="${courseHref(grade,subjectId)}">← ${s.name}</a><div class="chap"><span class="ref ref-icon">${subjectIcon(subjectId,'small')}${g.label} · ${esc(b.title)}</span><h2 class="ct">${esc(content?.title||section.title)}</h2></div><div class="book-actions official-lesson-actions">${external(section.url,'Άνοιξε αυτό το μάθημα στο επίσημο βιβλίο','primary')}${external(CATALOGUE.guidanceUrl,'Ύλη και οδηγίες ΙΕΠ 2026–2027')}${external(b.source,'Στοιχεία βιβλίου')}</div><div class="catalogue-note">${content?`${LEVEL_CHIP.full} Όλα είναι γραμμένα για αυτή την ενότητα: περίληψη, ${hasGrammar?'γραμματική, ':''}λέξεις, Quiz και λυμένες ασκήσεις.`:explanation?`${LEVEL_CHIP.expl} Η περίληψη είναι σύντομη εξήγηση με δικά μας λόγια, ελεγμένη με το βιβλίο και τις οδηγίες ΙΕΠ. ${esc(explanation.syllabusNote)} Οι λέξεις, το Quiz και οι δραστηριότητες είναι ακόμη γενικές: για εξάσκηση, λύσε τις ασκήσεις του βιβλίου.`:`${LEVEL_CHIP.guide} Γενικές οδηγίες μελέτης. Η ενότητα δεν έχει ακόμη δικό μας περιεχόμενο· μελέτησε από το επίσημο βιβλίο. Το Quiz ελέγχει μόνο αν ξέρεις πού βρίσκεται η ενότητα, όχι την ύλη.`}</div><div class="seg ${['four','five','six'][tabs-4]}"><button data-oview="sum" aria-pressed="${st.view==='sum'}">Κείμενο</button>${hasGrammar?`<button data-oview="grammar" aria-pressed="${st.view==='grammar'}">Γραμματική</button>`:''}<button data-oview="voc" aria-pressed="${st.view==='voc'}">Λέξεις</button><button data-oview="quiz" aria-pressed="${st.view==='quiz'}">Quiz</button><button data-oview="ex" aria-pressed="${st.view==='ex'}">Λυμένες</button>${hasBook?`<button data-oview="book" aria-pressed="${st.view==='book'}">Βιβλίο</button>`:''}</div>${body}<div class="lesson-step"><a class="btn ghost${prev?'':' disabled'}" ${prev?`href="${lessonHref(grade,subjectId,bookIndex,si-1)}"`:'aria-disabled="true"'}>← Προηγούμενο</a><a class="btn${next?'':' disabled'}" ${next?`href="${lessonHref(grade,subjectId,bookIndex,si+1)}"`:'aria-disabled="true"'}>Επόμενο →</a></div>`;
  const redraw=()=>renderOfficialLesson(grade,subjectId,bookIndex,sectionIndex);
  el.querySelectorAll('[data-oview]').forEach(x=>x.onclick=()=>{st.view=x.dataset.oview;st.fromBook=null;redraw();});
  /* Από την άσκηση του βιβλίου στη θεωρία και πίσω. Η εγγραφή στο ιστορικό κάνει το «πίσω» του κινητού να γυρίζει στην άσκηση. */
  bindBookHelp(el,key,redraw,(t,from)=>{st.view='sum';st.card=t;st.fromBook=from;history.pushState({theory:key},'');redraw();window.scrollTo({top:0});});
  el.querySelectorAll('[data-oback]').forEach(x=>x.onclick=()=>{if(history.state&&history.state.theory===key)history.back();else officialBackToBook(key,redraw);});
  el.querySelectorAll('[data-nav]').forEach(x=>x.onclick=()=>{if(st.view==='voc')st.vi=Math.max(0,Math.min(Math.max(content?.vocab?.length||words.length,1)-1,st.vi+(+x.dataset.nav)));else if(st.view==='grammar')st.gi=Math.max(0,Math.min(grammar.length-1,st.gi+(+x.dataset.nav)));else st.card=Math.max(0,Math.min(cards.length-1,st.card+(+x.dataset.nav)));redraw();});
  el.querySelectorAll('[data-oanswer]').forEach(x=>x.onclick=()=>{const qi=Object.keys(st.picked).length;st.picked[qi]=x.dataset.oanswer;if(qi===quiz.length-1)st.done=true;redraw();});
  el.querySelectorAll('[data-oqrestart]').forEach(x=>x.onclick=()=>{st.picked={};st.done=false;redraw();});
  el.querySelectorAll('[data-otask]').forEach(x=>x.onclick=()=>{const i=+x.dataset.otask;st.open.has(i)?st.open.delete(i):st.open.add(i);redraw();});
}
function renderSources(){
  $('#sources').innerHTML=`<div class="hero catalogue-hero"><span class="ref">Επίσημη τεκμηρίωση</span><h2 class="ct">Από πού προέρχεται η ύλη;</h2><p>Τα μαθήματα ακολουθούν το ωρολόγιο πρόγραμμα του δημόσιου ημερήσιου Γυμνασίου για το ${CATALOGUE.schoolYear}.</p></div><section class="book-card"><h3>Μαθήματα και διδασκαλία</h3><ul class="source-list"><li>${external(CATALOGUE.timetableUrl,'ΥΠΑΙΘΑ · Ωρολόγιο πρόγραμμα')}<small>44257/Δ2/08-04-2026 · ΦΕΚ Β΄ 2132. Περιλαμβάνει τις ώρες ανά τάξη και τις προϋποθέσεις για Ηθική και Ιταλικά.</small></li><li>${external(CATALOGUE.guidanceUrl,'ΙΕΠ · Ύλη και οδηγίες Γυμνασίου')}<small>Για την κατανομή της διδακτέας ύλης και τις οδηγίες ανά μάθημα.</small></li></ul></section><section class="book-card"><h3>Διαδραστικά Σχολικά Βιβλία</h3><p>Τα βιβλία, τα τετράδια και τα περιεχόμενα συνδέονται με το επίσημο αποθετήριο ebooks.edu.gr του ΙΤΥΕ «Διόφαντος».</p><ul class="source-list">${CATALOGUE.grades.map(g=>`<li>${external(g.catalogueUrl,g.label)}<small>Κωδικός τάξης στο αποθετήριο: ${g.code}</small></li>`).join('')}</ul><p class="result-count">Έλεγχος καταλόγου: 12 Οκτωβρίου 2026.</p></section><div class="catalogue-note"><p>Τα πλήρη βιβλία περιέχουν περισσότερα κεφάλαια από όσα μπορεί να διδαχθούν μέσα στη χρονιά. Ακολούθησε τις οδηγίες του/της εκπαιδευτικού σου.</p><p>Οι περιλήψεις και τα κουίζ του Διαβάσματος είναι ανεξάρτητο συμπληρωματικό υλικό. Διατίθενται στις ενότητες με την ετικέτα «Πλήρες».</p><p>Ο κατάλογος και οι ενσωματωμένες σημειώσεις μπορούν να λειτουργούν εκτός σύνδεσης μετά την πρώτη επίσκεψη. Τα εξωτερικά βιβλία χρειάζονται σύνδεση ή προηγούμενη λήψη PDF.</p></div>`;
}
