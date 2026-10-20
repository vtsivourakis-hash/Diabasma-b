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
const subjectMark = id => ({math:'x²',physics:'F',chemistry:'H₂O',biology:'β',geography:'Γη',language:'Αα',ancient:'α',translated:'Ω',english:'En',french:'Fr',german:'De',italian:'It',computing:'</>',music:'♪',history:'Ι',literature:'Λ',economics:'€'}[id] || '•');
/* Τι θα βρει ο μαθητής σε κάθε ενότητα βιβλίου:
   full  = Πλήρες: περίληψη, λέξεις, ερωτήσεις και λυμένες, όλα γραμμένα για αυτή την ενότητα
   expl  = Εξήγηση: σύντομη εξήγηση· οι ερωτήσεις και οι δραστηριότητες είναι γενικές
   guide = Οδηγός: γενικές οδηγίες μελέτης· το περιεχόμενο είναι στο επίσημο βιβλίο
   Το LINKED δείχνει ενότητες του βιβλίου που καλύπτονται από δικές μας πλήρεις ενότητες στο content/. */
const LINKED = {'B/math/0/2':'M/A1.1','B/math/0/3':'M/A1.2','B/ancient/0/1':'G/u1','B/ancient/0/2':'G/u2','B/translated/0/2':'A/r1','B/translated/0/3':'A/r1','B/translated/0/4':'A/r1','B/translated/0/6':'A/r3'};
const linkedUnit = key => LINKED[key] && C[LINKED[key]] ? LINKED[key] : null;
const lessonLevel = key => linkedUnit(key) || OFFICIAL_CONTENT[key] ? 'full' : EXPLANATIONS[key] ? 'expl' : 'guide';
const LEVEL_CHIP = {full:'<span class="chip ok">Πλήρες</span>', expl:'<span class="chip expl">Εξήγηση</span>', guide:'<span class="chip">Οδηγός</span>'};
const levelLegend = () => `<p class="level-legend">${LEVEL_CHIP.full} μελετάς από εδώ · ${LEVEL_CHIP.expl} σύντομη εξήγηση, εξάσκηση από το βιβλίο · ${LEVEL_CHIP.guide} μελετάς από το βιβλίο</p>`;
function subjectCard(g,s){
  const indexed = s.books.reduce((n,b)=>n+b.sections.length,0);
  const keys = s.books.flatMap((b,bi)=>b.sections.map((_,si)=>`${g.id}/${s.id}/${bi}/${si}`));
  const full = keys.filter(key=>OFFICIAL_CONTENT[key]).length + (s.legacy ? readyKeys(s.legacy).length : 0);
  const expl = keys.filter(key=>lessonLevel(key)==='expl').length;
  const status = full||expl ? [full?`${full} πλήρη`:'', expl?`${expl} εξηγήσεις`:'', `${indexed} στο βιβλίο`].filter(Boolean).join(' · ') : indexed ? `${indexed} οδηγοί μελέτης` : 'Υλικό ΙΕΠ';
  return `<a class="subject-card" href="${courseHref(g.id,s.id)}"><span class="subject-top"><span class="subject-mark" aria-hidden="true">${esc(subjectMark(s.id))}</span><span>${s.hours} ${s.hours===1?'ώρα':'ώρες'} / εβδ.</span></span><strong>${esc(s.name)}</strong><span class="subject-detail">${esc(s.description || (s.choice==='language'?'2η ξένη γλώσσα':s.id==='ethics'?'Εναλλακτικά των Θρησκευτικών':s.books.length?'Κάρτες, κουίζ & επίσημα βιβλία':'Οδηγίες & εκπαιδευτικό υλικό'))}</span><span class="subject-status">${status} <span aria-hidden="true">→</span></span></a>`;
}
function renderCatalogue(){
  const g = getGrade(selectedGrade), el = $('#catalogue');
  el.innerHTML = `<div class="hero catalogue-hero"><span class="ref">Δημόσιο ημερήσιο Γυμνάσιο · ${CATALOGUE.schoolYear}</span><h2 class="ct">Η τάξη σου.<br>Όλα τα μαθήματα.</h2><p>Βρες το μάθημά σου και άνοιξε το επίσημο βιβλίο, τις ενότητες και τις ασκήσεις του.</p><div class="catalogue-meta"><span>${g.label}</span><span>${g.hours} ώρες / εβδομάδα</span><span>${g.subjects.length} μαθήματα & επιλογές</span></div></div>
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
      for(const [bi,b] of s.books.entries()) for(const [si,section] of b.sections.entries()){
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
  const custom = s.legacy ? readyKeys(s.legacy) : [];
  el.innerHTML=`<a class="back" href="#class/${grade}">← ${g.label} · Όλα τα μαθήματα</a><div class="hero catalogue-hero"><span class="ref">${g.label} · ${CATALOGUE.schoolYear}</span><h2 class="ct">${esc(s.name)}</h2>${s.description?`<p>${esc(s.description)}</p>`:''}<div class="catalogue-meta"><span>${s.hours} ${s.hours===1?'ώρα':'ώρες'} / εβδομάδα</span>${s.choice?'<span>Επιλογή του τμήματος</span>':''}</div></div>
    ${s.note?`<div class="catalogue-note">${esc(s.note)}</div>`:''}
    ${custom.length?`<section class="toc authored-lessons"><h3>Πλήρη μαθήματα · κάρτες, κουίζ και λυμένες</h3>${custom.map(key=>{const [k,unit]=key.split('/'),info=findSection(k,unit),best=bestOf(key);return `<a class="item" href="#${key}"><span class="num">${esc(info?.num||'')}</span><span class="tt">${esc(C[key].title)}</span><span class="chip ${best===undefined?'ok':best>=14?'ok':best>=10?'mid':'low'}">${best===undefined?'Πλήρες':best+'/20'}</span></a>`;}).join('')}</section>`:''}
    ${connectionNotice()}
    ${s.books.length?'<div class="catalogue-search"><label for="lesson-query">Βρες μάθημα</label><div class="search-row"><input id="lesson-query" type="search" placeholder="Τίτλος ή λέξη-κλειδί" autocomplete="off"></div></div><p class="result-count" id="lesson-count" role="status"></p>':''}
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
      return `<article class="book-card"><span class="book-ref">ΕΠΙΣΗΜΟ ΣΧΟΛΙΚΟ ΒΙΒΛΙΟ</span><h3>${esc(b.title)}</h3><div class="book-actions">${formats.map((f,i)=>external(f.url,f.kind==='html'?'Διάβασε online':f.kind==='pdf'?'Άνοιξε PDF':'Ηχητικό υλικό (ZIP)',i===0?'primary':'')).join('')}${external(b.source,'Στοιχεία βιβλίου')}</div>${sections.length?`${levelLegend()}<div class="lesson-list">${sections.map(section=>{const si=b.sections.indexOf(section),key=`${grade}/${id}/${bi}/${si}`,unit=linkedUnit(key),optional=EXPLANATIONS[key]?.status==='optional';return `<a class="item lesson-item" href="${unit?'#'+unit:lessonHref(grade,id,bi,si)}"><span class="num">${String(si+1).padStart(2,'0')}</span><span class="tt">${esc(section.title)}${optional?'<small class="opt-note">Προαιρετικό στην ύλη 2026–2027</small>':''}</span>${LEVEL_CHIP[lessonLevel(key)]}</a>`;}).join('')}</div>`:'<p class="result-count">Οι ενότητες και οι ασκήσεις περιλαμβάνονται στο πλήρες βιβλίο.</p>'}</article>`;
    }).join('');
    $('#course-books').innerHTML=html|| (query?'<div class="empty-state"><h3>Δεν βρέθηκε ενότητα</h3><p>Δοκίμασε άλλη λέξη ή άνοιξε το πλήρες PDF.</p></div>':'');
    if($('#lesson-count')) $('#lesson-count').textContent=`${lessons} μαθήματα · ${count} βιβλία και βοηθητικοί πόροι`;
  };
  if($('#lesson-query')) $('#lesson-query').oninput=update;
  update();
}

const testHubState = {mode:'study',part:'5.1',card:0,solution:0,quiz:null,exam:null};
function newTestHubAssessment(pool,count){
  return {questions:shuffle(pool).slice(0,count).map(q=>({...q,options:shuffle([q.c,...q.w])})),index:0,answers:[],done:false};
}
function testHubAssessmentBody(kind,pool){
  const isQuiz=kind==='quiz',count=isQuiz?12:20,label=isQuiz?'Quiz επανάληψης':'Διαγώνισμα προσομοίωσης';
  const state=testHubState[kind]||(testHubState[kind]=newTestHubAssessment(pool,count));
  if(state.done){
    const right=state.questions.filter((q,i)=>state.answers[i]===q.c).length,score=Math.round(right/state.questions.length*20);
    const misses=state.questions.map((q,i)=>({q,answer:state.answers[i]})).filter(item=>item.answer!==item.q.c);
    return `<div class="sheet center test-result"><span class="cheer">${label}</span><div class="grade" role="img" aria-label="Βαθμός ${score} στα 20"><svg viewBox="0 0 210 150" aria-hidden="true"><ellipse cx="105" cy="75" rx="91" ry="61"/></svg><div class="num">${score}<small>/20</small></div></div><p>Σωστές απαντήσεις: ${right} από ${state.questions.length}.</p><button class="btn" data-hub-restart="${kind}">Νέο ${isQuiz?'Quiz':'Τεστ'}</button></div>${misses.length?`<section class="book-card test-review"><h3>Τι χρειάζεται επανάληψη</h3>${misses.map(({q,answer})=>`<div class="test-review-item"><span>${esc(q.lesson)}</span><b>${esc(q.q)}</b><p>Η απάντησή σου: ${esc(answer||'—')}<br>Σωστό: ${esc(q.c)}</p><small>${esc(q.why)}</small></div>`).join('')}</section>`:'<div class="catalogue-note">Δεν έκανες κανένα λάθος. Είσαι έτοιμος/η για το επόμενο βήμα.</div>'}`;
  }
  const i=state.index,q=state.questions[i],answered=state.answers[i],hasAnswer=answered!==undefined;
  const options=q.options.map((answer,oi)=>{
    const result=hasAnswer?(answer===q.c?' right':answer===answered?' wrong':' dim'):'';
    return `<button class="opt${result}${answer===answered?' picked':''}" data-hub-answer="${oi}"${hasAnswer?' disabled':''}><span class="l" aria-hidden="true">${String.fromCharCode(65+oi)}</span><span>${esc(answer)}</span></button>`;
  }).join('');
  return `<div class="catalogue-note test-mode-note"><b>${label}</b><br>${isQuiz?'12 ανάμεικτες ερωτήσεις με εξήγηση μετά από κάθε απάντηση.':'20 ανάμεικτες ερωτήσεις χωρίς βοήθεια. Ο βαθμός και τα λάθη εμφανίζονται στο τέλος.'}</div><div class="prog"><div class="bar"><i style="width:${Math.round((i+1)/state.questions.length*100)}%"></i></div><span>${i+1}/${state.questions.length}</span></div><div class="sheet"><span class="n">${esc(q.lesson)} · Ερώτηση ${i+1}</span><p class="q">${esc(q.q)}</p><div class="opts">${options}</div>${isQuiz&&hasAnswer?`<div class="why"><b class="${answered===q.c?'y':'n'}">${answered===q.c?'Σωστά':'Χρειάζεται επανάληψη'}</b>${esc(q.why)}</div><button class="btn test-next-question" data-hub-next="quiz">${i===state.questions.length-1?'Δες βαθμό':'Επόμενη ερώτηση'} →</button>`:''}</div>`;
}
function testHubSolutionsBody(exercises,officialSources){
  testHubState.solution=Math.max(0,Math.min(testHubState.solution,exercises.length-1));
  const i=testHubState.solution,item=exercises[i];
  const early=/ΑΣΚΗΣΗ [1-5]$|ΜΙΚΡΗ ΕΡΕΥΝΑ [1-4]$/.test(item.section||'');
  const source=early?officialSources['5.3']:officialSources['5.4'];
  return `<div class="catalogue-note test-mode-note"><b>Λυμένες ασκήσεις του επίσημου βιβλίου</b><br>Όλες οι ερωτήσεις, τα προβλήματα και οι δραστηριότητες του κεφαλαίου, με βήματα και ολοκληρωμένη απάντηση.</div><div class="prog"><div class="bar" role="img" aria-label="Λυμένη άσκηση ${i+1} από ${exercises.length}"><i style="width:${Math.round((i+1)/exercises.length*100)}%"></i></div><span>${i+1}/${exercises.length}</span></div><div class="deck"><section class="blk slide solved-book-exercise"><div class="test-card-heading"><span class="k">${esc(item.section)}</span><a class="test-source-link" href="${source}" target="_blank" rel="noopener">Άσκηση στο βιβλίο ↗</a></div><h3>${esc(item.h)}</h3><div class="exercise-question"><b>Εκφώνηση</b><p>${esc(item.q)}</p></div><h4 class="test-summary-title">Λύση βήμα προς βήμα</h4><ol class="solution-steps">${item.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol><div class="solution-answer"><b>Τελική απάντηση</b><p>${esc(item.ans)}</p></div>${item.note?`<div class="solution-memory"><b>Θυμήσου:</b> ${esc(item.note)}</div>`:''}</section></div><div class="pager test-hub-pager"><button class="btn ghost" data-solution-nav="-1" aria-label="Προηγούμενη λυμένη άσκηση"${i>0?'':' disabled'}>←</button><span class="mid">Λυμένη ${i+1} από ${exercises.length}</span><button class="btn" data-solution-nav="1" aria-label="Επόμενη λυμένη άσκηση"${i<exercises.length-1?'':' disabled'}>→</button></div>`;
}
function renderTestRequired(){
  const chapter=OFFICIAL_CONTENT['A/biology/0/17']||{},el=$('#test-required'),all=chapter.testRequired||[],bookExercises=chapter.bookExercises||[];
  const lessonKeys=[['A/biology/0/17','5.1'],['A/biology/0/18','5.2'],['A/biology/0/19','5.3'],['A/biology/0/20','5.4']];
  const questionPool=lessonKeys.flatMap(([key,lesson])=>(OFFICIAL_CONTENT[key]?.quiz||[]).map(q=>({...q,lesson})));
  if(!all.length||!bookExercises.length||questionPool.length<20){
    el.innerHTML='<div class="empty-state"><h2>Το υλικό του τεστ δεν βρέθηκε</h2><p>Άνοιξε ξανά τη σελίδα ή διάλεξε τα μαθήματα Βιολογίας.</p></div>';
    return;
  }
  const parts=[['guide','Οδηγός'],['5.1','5.1'],['5.2','5.2'],['5.3','5.3'],['5.4','5.4']];
  const officialSources={
    '5.1':'https://ebooks.edu.gr/ebooks/v/html/8547/2250/Biologia_A-Gymnasiou_html-empl/index5_1.html',
    '5.2':'https://ebooks.edu.gr/ebooks/v/html/8547/2250/Biologia_A-Gymnasiou_html-empl/index5_2.html',
    '5.3':'https://ebooks.edu.gr/ebooks/v/html/8547/2250/Biologia_A-Gymnasiou_html-empl/index5_3.html',
    '5.4':'https://ebooks.edu.gr/ebooks/v/html/8547/2250/Biologia_A-Gymnasiou_html-empl/index5_4.html'
  };
  let body='';
  if(testHubState.mode==='study'){
    const cards=all.filter(item=>testHubState.part==='guide'?!/^5\.[1-4]/.test(item.lesson||''):(item.lesson||'').startsWith(testHubState.part));
    testHubState.card=Math.max(0,Math.min(testHubState.card,cards.length-1));
    const i=testHubState.card,item=cards[i];
    const source=officialSources[testHubState.part];
    body=`<nav class="seg test-section-tabs five" aria-label="Μαθήματα του τεστ">${parts.map(([value,label])=>`<button data-test-part="${value}" aria-pressed="${testHubState.part===value}">${label}</button>`).join('')}</nav><div class="prog"><div class="bar" role="img" aria-label="Κάρτα ${i+1} από ${cards.length}"><i style="width:${Math.round((i+1)/cards.length*100)}%"></i></div><span>${i+1}/${cards.length}</span></div><div class="deck"><section class="blk slide test-required-card"><div class="test-card-heading"><span class="k">${esc(item.lesson||'ΤΕΣΤ ΚΕΦΑΛΑΙΟΥ 5')}</span>${source?`<a class="test-source-link" href="${source}" target="_blank" rel="noopener">Επίσημο βιβλίο ↗</a>`:''}</div><h3>${esc(item.h)}</h3>${item.simple?`<div class="test-simple"><b>Με απλά λόγια</b><p>${esc(item.simple)}</p></div>`:''}<h4 class="test-summary-title">Πλήρης περίληψη · σημείο προς σημείο</h4><ol class="test-required-list">${item.learn.map((point,index)=>`<li><span>Σημείο ${index+1}</span>${esc(point)}</li>`).join('')}</ol><div class="box defb"><b>Απάντηση για 20/20</b><p>${esc(item.write)}</p></div>${item.trap?`<div class="box test-trap"><b>Πρόσεξε</b><p>${esc(item.trap)}</p></div>`:''}</section></div><div class="pager test-hub-pager"><button class="btn ghost" data-test-nav="-1" aria-label="Προηγούμενη"${i>0?'':' disabled'}>←</button><span class="mid">Κάρτα ${i+1} από ${cards.length}</span><button class="btn" data-test-nav="1" aria-label="Επόμενη"${i<cards.length-1?'':' disabled'}>→</button></div><section class="book-card test-hub-footer"><h3>Πλήρη μαθήματα και εξάσκηση</h3><p class="result-count">Όταν τελειώσεις τις κάρτες, χρησιμοποίησε τα Quiz και τις λυμένες ερωτήσεις των μαθημάτων.</p><div class="book-actions"><a class="primary" href="#lesson/A/biology/0/17">5.1</a><a href="#lesson/A/biology/0/18">5.2</a><a href="#lesson/A/biology/0/19">5.3</a><a href="#lesson/A/biology/0/20">5.4</a></div></section>`;
  }else if(testHubState.mode==='solutions') body=testHubSolutionsBody(bookExercises,officialSources);
  else body=testHubAssessmentBody(testHubState.mode,questionPool);
  document.title='Για το τεστ · Βιολογία Κεφάλαιο 5 | Διάβασμα';
  el.innerHTML=`<div class="hero catalogue-hero test-hub-hero"><span class="ref">Ελεγμένο με το επίσημο σχολικό βιβλίο</span><h2 class="ct">Για το τεστ Βιολογίας</h2><p>Απλή εξήγηση, πλήρης περίληψη και λυμένες ασκήσεις για τις ενότητες 5.1–5.4.</p><div class="catalogue-meta"><span>20 κάρτες</span><span>${bookExercises.length} λυμένες</span><span>48 ερωτήσεις</span><span>Στόχος: 20/20</span></div></div><nav class="seg four test-mode-tabs" aria-label="Τρόπος μελέτης"><button data-test-mode="study" aria-pressed="${testHubState.mode==='study'}">Ύλη</button><button data-test-mode="solutions" aria-pressed="${testHubState.mode==='solutions'}">Λυμένες ασκήσεις</button><button data-test-mode="quiz" aria-pressed="${testHubState.mode==='quiz'}">Quiz</button><button data-test-mode="exam" aria-pressed="${testHubState.mode==='exam'}">Τεστ</button></nav>${body}`;
  el.querySelectorAll('[data-test-mode]').forEach(button=>button.onclick=()=>{testHubState.mode=button.dataset.testMode;renderTestRequired();});
  el.querySelectorAll('[data-test-part]').forEach(button=>button.onclick=()=>{testHubState.part=button.dataset.testPart;testHubState.card=0;renderTestRequired();});
  el.querySelectorAll('[data-test-nav]').forEach(button=>button.onclick=()=>{const cards=all.filter(item=>testHubState.part==='guide'?!/^5\.[1-4]/.test(item.lesson||''):(item.lesson||'').startsWith(testHubState.part));testHubState.card=Math.max(0,Math.min(cards.length-1,testHubState.card+(+button.dataset.testNav)));renderTestRequired();});
  el.querySelectorAll('[data-solution-nav]').forEach(button=>button.onclick=()=>{testHubState.solution=Math.max(0,Math.min(bookExercises.length-1,testHubState.solution+(+button.dataset.solutionNav)));renderTestRequired();});
  el.querySelectorAll('[data-hub-answer]').forEach(button=>button.onclick=()=>{const state=testHubState[testHubState.mode],q=state.questions[state.index],answer=q.options[+button.dataset.hubAnswer];state.answers[state.index]=answer;if(testHubState.mode==='exam'){if(state.index===state.questions.length-1)state.done=true;else state.index++;}renderTestRequired();});
  el.querySelectorAll('[data-hub-next]').forEach(button=>button.onclick=()=>{const state=testHubState[button.dataset.hubNext];if(state.index===state.questions.length-1)state.done=true;else state.index++;renderTestRequired();});
  el.querySelectorAll('[data-hub-restart]').forEach(button=>button.onclick=()=>{testHubState[button.dataset.hubRestart]=null;renderTestRequired();});
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
function renderOfficialLesson(grade,subjectId,bookIndex,sectionIndex){
  const lesson=officialLesson(grade,subjectId,bookIndex,sectionIndex),el=$('#catalogue');
  if(!lesson){el.innerHTML='<div class="empty-state"><h2>Το μάθημα δεν βρέθηκε</h2><a class="btn" href="#class/'+selectedGrade+'">Όλα τα μαθήματα</a></div>';return;}
  const {gradeData:g,subject:s,book:b,section,sectionIndex:si}=lesson,key=`${grade}/${subjectId}/${bookIndex}/${sectionIndex}`,content=OFFICIAL_CONTENT[key],explanation=EXPLANATIONS[key];
  if(linkedUnit(key)){ location.replace('#'+linkedUnit(key)); return; }
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
  if(st.view==='sum'){
    const c=cards[Math.min(st.card,cards.length-1)];
    body=`<div class="prog"><div class="bar"><i style="width:${Math.round((st.card+1)/cards.length*100)}%"></i></div><span>${st.card+1}/${cards.length}</span></div><div class="deck"><section class="blk slide"><span class="k">Θέμα ${st.card+1}</span><h3>${esc(c.h)}</h3><p>${esc(c.t)}</p><div class="box exb"><b>Παράδειγμα</b><p>${esc(c.ex)}</p></div><div class="box defb"><b>Στο διαγώνισμα γράφεις</b><p>${esc(c.def)}</p></div></section></div>${pager(st.card>0,st.card<cards.length-1,st.card===cards.length-1?`<button class="btn gold" data-oview="${hasGrammar?'grammar':'quiz'}">${hasGrammar?'Πάμε στη Γραμματική':'Πάμε στο Quiz'} →</button>`:'← σύρε →')}`;
  }else if(st.view==='grammar'&&hasGrammar){
    const gi=Math.min(st.gi,grammar.length-1),c=grammar[gi];
    body=`<div class="prog"><div class="bar" role="img" aria-label="Γραμματική ${gi+1} από ${grammar.length}"><i style="width:${Math.round((gi+1)/grammar.length*100)}%"></i></div><span>${gi+1}/${grammar.length}</span></div><div class="deck"><section class="blk slide"><span class="k">Γραμματική ${gi+1}</span><h3>${esc(c.h)}</h3><p>${esc(c.t)}</p><div class="box exb"><b>Παράδειγμα</b><p>${esc(c.ex)}</p></div><div class="box defb"><b>Κανόνας</b><p>${esc(c.def)}</p></div></section></div>${pager(gi>0,gi<grammar.length-1,gi===grammar.length-1?'<button class="btn gold" data-oview="voc">Πάμε στις Λέξεις →</button>':'← σύρε →')}`;
  }else if(st.view==='voc'){
    const vocab=content?.vocab?.length?content.vocab:[...new Set([...words,'βασική έννοια','κεντρική ιδέα','παράδειγμα'])].slice(0,Math.max(3,words.length)).map(word=>[word,'Βρες τον ακριβή ορισμό μέσα στην ενότητα.','Χρησιμοποίησε τον όρο σε μία σωστή πρόταση.']),vi=Math.min(st.vi,vocab.length-1),[word,meaning,example]=vocab[vi];
    body=`<div class="prog"><div class="bar" role="img" aria-label="Λέξη ${vi+1} από ${vocab.length}"><i style="width:${Math.round((vi+1)/vocab.length*100)}%"></i></div><span>${vi+1}/${vocab.length}</span></div><div class="deck"><section class="blk slide"><span class="k">Λέξη ${vi+1}</span><h3>${esc(word)}</h3><p>${esc(meaning)}</p><div class="box exb"><b>Παράδειγμα</b><p>${esc(example)}</p></div><div class="box defb"><b>Στο διαγώνισμα γράφεις</b><p>Σύντομο ορισμό, ένα χαρακτηριστικό και ένα σωστό παράδειγμα.</p></div></section></div>${pager(vi>0,vi<vocab.length-1,vi===vocab.length-1?'<button class="btn gold" data-oview="quiz">Πάμε στο Quiz →</button>':'← σύρε →')}`;
  }else if(st.view==='quiz'){
    if(st.done){const right=quiz.filter((q,i)=>st.picked[i]===q.c).length,score=Math.round(right/quiz.length*20);body=`<div class="sheet center"><span class="cheer">Κουίζ ενότητας</span><div class="grade" role="img" aria-label="Βαθμός ${score} στα 20"><svg viewBox="0 0 210 150" aria-hidden="true"><ellipse cx="105" cy="75" rx="91" ry="61"/></svg><div class="num">${score}<small>/20</small></div></div><p>Βρήκες σωστά ${right} από ${quiz.length}. ${content?'Οι ερωτήσεις ελέγχουν τις βασικές γνώσεις αυτού του μαθήματος.':'Το προσωρινό κουίζ ελέγχει τον προσανατολισμό σου στο επίσημο βιβλίο.'}</p><button class="btn" data-oqrestart>Ξανά</button></div>`;}
    else {const qi=Object.keys(st.picked).length,q=quiz[qi];body=`<div class="prog"><div class="bar"><i style="width:${Math.round((qi+1)/quiz.length*100)}%"></i></div><span>${qi+1}/${quiz.length}</span></div><div class="sheet"><span class="n">Ερώτηση ${qi+1}</span><p class="q">${esc(q.q)}</p><div class="opts">${shuffle([q.c,...q.w]).map(answer=>`<button class="opt" data-oanswer="${esc(answer)}"><span class="l" aria-hidden="true">•</span><span>${esc(answer)}</span></button>`).join('')}</div></div>`;}
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
  el.innerHTML=`<a class="back" href="${courseHref(grade,subjectId)}">← ${s.name}</a><div class="chap"><span class="ref">${g.label} · ${esc(b.title)}</span><h2 class="ct">${esc(content?.title||section.title)}</h2></div><div class="book-actions official-lesson-actions">${external(section.url,'Άνοιξε αυτό το μάθημα στο επίσημο βιβλίο','primary')}${external(CATALOGUE.guidanceUrl,'Ύλη και οδηγίες ΙΕΠ 2026–2027')}${external(b.source,'Στοιχεία βιβλίου')}</div><div class="catalogue-note">${content?`${LEVEL_CHIP.full} Όλα είναι γραμμένα για αυτή την ενότητα: περίληψη, ${hasGrammar?'γραμματική, ':''}λέξεις, Quiz και λυμένες ασκήσεις.`:explanation?`${LEVEL_CHIP.expl} Η περίληψη είναι σύντομη εξήγηση με δικά μας λόγια, ελεγμένη με το βιβλίο και τις οδηγίες ΙΕΠ. ${esc(explanation.syllabusNote)} Οι λέξεις, το Quiz και οι δραστηριότητες είναι ακόμη γενικές: για εξάσκηση, λύσε τις ασκήσεις του βιβλίου.`:`${LEVEL_CHIP.guide} Γενικές οδηγίες μελέτης. Η ενότητα δεν έχει ακόμη δικό μας περιεχόμενο· μελέτησε από το επίσημο βιβλίο. Το Quiz ελέγχει μόνο αν ξέρεις πού βρίσκεται η ενότητα, όχι την ύλη.`}</div><div class="seg ${hasGrammar?'five':'four'}"><button data-oview="sum" aria-pressed="${st.view==='sum'}">Κείμενο</button>${hasGrammar?`<button data-oview="grammar" aria-pressed="${st.view==='grammar'}">Γραμματική</button>`:''}<button data-oview="voc" aria-pressed="${st.view==='voc'}">Λέξεις</button><button data-oview="quiz" aria-pressed="${st.view==='quiz'}">Quiz</button><button data-oview="ex" aria-pressed="${st.view==='ex'}">Λυμένες</button></div>${body}<div class="lesson-step"><a class="btn ghost${prev?'':' disabled'}" ${prev?`href="${lessonHref(grade,subjectId,bookIndex,si-1)}"`:'aria-disabled="true"'}>← Προηγούμενο</a><a class="btn${next?'':' disabled'}" ${next?`href="${lessonHref(grade,subjectId,bookIndex,si+1)}"`:'aria-disabled="true"'}>Επόμενο →</a></div>`;
  const redraw=()=>renderOfficialLesson(grade,subjectId,bookIndex,sectionIndex);
  el.querySelectorAll('[data-oview]').forEach(x=>x.onclick=()=>{st.view=x.dataset.oview;redraw();});
  el.querySelectorAll('[data-nav]').forEach(x=>x.onclick=()=>{if(st.view==='voc')st.vi=Math.max(0,Math.min(Math.max(content?.vocab?.length||words.length,1)-1,st.vi+(+x.dataset.nav)));else if(st.view==='grammar')st.gi=Math.max(0,Math.min(grammar.length-1,st.gi+(+x.dataset.nav)));else st.card=Math.max(0,Math.min(cards.length-1,st.card+(+x.dataset.nav)));redraw();});
  el.querySelectorAll('[data-oanswer]').forEach(x=>x.onclick=()=>{const qi=Object.keys(st.picked).length;st.picked[qi]=x.dataset.oanswer;if(qi===quiz.length-1)st.done=true;redraw();});
  el.querySelectorAll('[data-oqrestart]').forEach(x=>x.onclick=()=>{st.picked={};st.done=false;redraw();});
  el.querySelectorAll('[data-otask]').forEach(x=>x.onclick=()=>{const i=+x.dataset.otask;st.open.has(i)?st.open.delete(i):st.open.add(i);redraw();});
}
function renderSources(){
  $('#sources').innerHTML=`<div class="hero catalogue-hero"><span class="ref">Επίσημη τεκμηρίωση</span><h2 class="ct">Από πού προέρχεται η ύλη;</h2><p>Τα μαθήματα ακολουθούν το ωρολόγιο πρόγραμμα του δημόσιου ημερήσιου Γυμνασίου για το ${CATALOGUE.schoolYear}.</p></div><section class="book-card"><h3>Μαθήματα και διδασκαλία</h3><ul class="source-list"><li>${external(CATALOGUE.timetableUrl,'ΥΠΑΙΘΑ · Ωρολόγιο πρόγραμμα')}<small>44257/Δ2/08-04-2026 · ΦΕΚ Β΄ 2132. Περιλαμβάνει τις ώρες ανά τάξη και τις προϋποθέσεις για Ηθική και Ιταλικά.</small></li><li>${external(CATALOGUE.guidanceUrl,'ΙΕΠ · Ύλη και οδηγίες Γυμνασίου')}<small>Για την κατανομή της διδακτέας ύλης και τις οδηγίες ανά μάθημα.</small></li></ul></section><section class="book-card"><h3>Διαδραστικά Σχολικά Βιβλία</h3><p>Τα βιβλία, τα τετράδια και τα περιεχόμενα συνδέονται με το επίσημο αποθετήριο ebooks.edu.gr του ΙΤΥΕ «Διόφαντος».</p><ul class="source-list">${CATALOGUE.grades.map(g=>`<li>${external(g.catalogueUrl,g.label)}<small>Κωδικός τάξης στο αποθετήριο: ${g.code}</small></li>`).join('')}</ul><p class="result-count">Έλεγχος καταλόγου: 12 Οκτωβρίου 2026.</p></section><div class="catalogue-note"><p>Τα πλήρη βιβλία περιέχουν περισσότερα κεφάλαια από όσα μπορεί να διδαχθούν μέσα στη χρονιά. Ακολούθησε τις οδηγίες του/της εκπαιδευτικού σου.</p><p>Οι περιλήψεις και τα κουίζ του Διαβάσματος είναι ανεξάρτητο συμπληρωματικό υλικό. Διατίθενται προς το παρόν σε οκτώ ενότητες της Β΄ Γυμνασίου.</p><p>Ο κατάλογος και οι ενσωματωμένες σημειώσεις μπορούν να λειτουργούν εκτός σύνδεσης μετά την πρώτη επίσκεψη. Τα εξωτερικά βιβλία χρειάζονται σύνδεση ή προηγούμενη λήψη PDF.</p></div>`;
}
