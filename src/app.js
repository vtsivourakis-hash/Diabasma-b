/* Local app and installation controls. No account or remote storage. */
let installPrompt = null;
const appDialog = document.querySelector('#app-download');
const installButton = document.querySelector('#app-install');
const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function updateInstall(){
  installButton.hidden = !installPrompt || installed() || location.protocol === 'file:';
  document.querySelector('#app-mode').textContent = location.protocol === 'file:' ? 'Τοπική δοκιμαστική εφαρμογή' : installed() ? 'Εγκατεστημένη εφαρμογή' : 'Δοκιμαστική έκδοση';
}
window.addEventListener('beforeinstallprompt', e => {e.preventDefault();installPrompt = e;updateInstall();});
window.addEventListener('appinstalled', () => {installPrompt = null;updateInstall();appDialog.close();});
installButton.onclick = async () => {
  if(!installPrompt) return;
  const prompt = installPrompt;installPrompt = null;updateInstall();
  try {await prompt.prompt();await prompt.userChoice;} catch(e) {document.querySelector('#app-install-status').textContent = 'Δοκίμασε από το μενού του browser: Εγκατάσταση εφαρμογής.';}
};
document.querySelector('#app-open').onclick = () => {updateInstall();appDialog.showModal();};
document.querySelector('#app-close').onclick = () => appDialog.close();
appDialog.addEventListener('click', e => {if(e.target === appDialog) appDialog.close();});
document.querySelector('#app-back').onclick = () => {
  if(appTrail.length > 1) history.back();else location.hash = 'tomorrow';
};
document.querySelector('#app-search').onclick = () => {
  const focus = () => {const input = document.querySelector('#catalogue-query');if(input){input.focus();input.scrollIntoView({block:'center'});}};
  if(document.querySelector('#catalogue-query') && !document.querySelector('#catalogue').hidden) focus();
  else {window.addEventListener('hashchange', focus, {once:true});location.hash = 'class/' + selectedGrade;}
};
const appTrail = [];
function updateAppNavigation(){
  const hash = location.hash || '#class/' + selectedGrade;
  if(appTrail[appTrail.length-2] === hash) appTrail.pop();
  else if(appTrail[appTrail.length-1] !== hash) appTrail.push(hash);
  document.querySelector('#app-home').href = '#tomorrow';
  document.querySelector('#app-back').disabled = appTrail.length < 2;
  const heading = document.querySelector('.panel:not([hidden]) h2');
  document.querySelector('#app-location').textContent = heading ? heading.textContent : getGrade(selectedGrade).label;
  const isLesson = /^#lesson\//.test(hash);
  if(isLesson && heading) store.set('diab-last-lesson', {hash,title:heading.textContent});
  const last = store.get('diab-last-lesson', null), resume = document.querySelector('#app-resume');
  const valid = last && typeof last.hash === 'string' && /^#lesson\/[ABC]\/[a-z-]+\/\d+\/\d+$/.test(last.hash) && typeof last.title === 'string';
  resume.hidden = !valid || last.hash === hash;
  if(valid){resume.href = last.hash;resume.textContent = 'Συνέχισε: ' + last.title;}
}
window.addEventListener('hashchange', updateAppNavigation);
updateInstall();

// Read only the currently displayed content, including revealed quiz feedback.
// Πρόταση πρόταση: η πρόταση που ακούγεται φωτίζεται (CSS Highlight, χωρίς αλλαγή στη σελίδα).
const voiceButton = document.querySelector('#app-voice');
const voiceStatus = document.querySelector('#app-voice-status');
const player = document.querySelector('#app-player');
const voiceSet = document.querySelector('#app-voice-set');
const speech = window.speechSynthesis;
const SPEEDS = [['Αργά', .75], ['Κανονικά', .95], ['Γρήγορα', 1.15]];
const voicePrefs = () => Object.assign({speed:1, voice:'', auto:false}, store.get('diab-voice', {}));
const setVoicePrefs = o => store.set('diab-voice', Object.assign(voicePrefs(), o));
const sayMark = window.CSS && CSS.highlights && window.Highlight ? new Highlight() : null;
if(sayMark) CSS.highlights.set('diab-say', sayMark);
let reading = false, paused = false, speechRun = 0, sentences = [], at = 0, autoSig = '';

/* Συντομογραφίες, μονάδες και σύμβολα που οι φωνές διαβάζουν λάθος. Αλλάζει μόνο αυτό που ακούγεται. */
const UNITS = {'m/s²':'μέτρα ανά δευτερόλεπτο στο τετράγωνο', 'm/s':'μέτρα ανά δευτερόλεπτο', 'km/h':'χιλιόμετρα την ώρα',
  'cm²':'τετραγωνικά εκατοστά', 'm²':'τετραγωνικά μέτρα', 'km²':'τετραγωνικά χιλιόμετρα', 'cm³':'κυβικά εκατοστά', 'm³':'κυβικά μέτρα',
  kWh:'κιλοβατώρες', kJ:'κιλοτζάουλ', kPa:'κιλοπασκάλ', kg:'κιλά', km:'χιλιόμετρα', dm:'δεκατόμετρα', cm:'εκατοστά', mm:'χιλιοστά', min:'λεπτά', mL:'χιλιοστόλιτρα', Pa:'πασκάλ',
  m:'μέτρα', g:'γραμμάρια', s:'δευτερόλεπτα', h:'ώρες', N:'νιούτον', J:'τζάουλ', W:'βατ', L:'λίτρα', '°C':'βαθμούς Κελσίου', '°':'μοίρες'};
const UNIT_RE = new RegExp('(\\d)\\s?(' + Object.keys(UNITS).sort((a, b) => b.length - a.length).map(u => u.replace(/[/]/g, '\\/')).join('|') + ')(?![\\p{L}\\d²³])', 'gu');
const ORD = {α:['πρώτ', 'Άλφα'], β:['δεύτερ', 'Βήτα'], γ:['τρίτ', 'Γάμμα']};
const B = '(?<![\\p{L}.])';
const SAY = [
  ['(?<=[\\p{L}\\p{N})])\\s?[·⋅]\\s?(?=[\\p{N}(]|[a-zα-ω](?!\\p{L}))', ' επί '],
  [B + 'τ\\.\\s?χλμ\\.', 'τετραγωνικά χιλιόμετρα'], [B + 'τ\\.\\s?μ\\.', 'τετραγωνικά μέτρα'], [B + 'χλμ\\.?(?!\\p{L})', 'χιλιόμετρα'],
  [B + '[πΠ]\\.\\s?χ\\.', 'παραδείγματος χάρη'], [B + 'κ\\.\\s?λπ\\.?', 'και λοιπά'], [B + 'κ\\.\\s?ά\\.', 'και άλλα'],
  [B + 'π\\.\\s?Χ\\.', 'προ Χριστού'], [B + 'μ\\.\\s?Χ\\.', 'μετά Χριστόν'], [B + 'Ε\\.\\s?Ε\\.', 'Ευρωπαϊκή Ένωση'],
  [B + 'Ε\\.Ο\\.Κ\\.', 'Ευρωπαϊκή Οικονομική Κοινότητα'], [B + 'Α\\.Ε\\.Π\\.', 'Α Ε Π'], [B + 'Μ\\.\\s(?=Ασία)', 'Μικρά '],
  [B + 'δηλ\\.', 'δηλαδή'], [B + 'εκατ\\.', 'εκατομμύρια'], [B + 'αι\\.', 'αιώνας'], [B + 'σελ\\.', 'σελίδα'], [B + 'ασκ\\.', 'άσκηση'],
  ['(\\d)\\s?μ\\.(?!\\p{L})', '$1 μέτρα'],
  [B + '([ΑΒ])[΄ʹ]\\s+Παγκόσμι(ος|ου|ο)', (m, l, e) => ORD[l.toLowerCase()][0] + e + ' Παγκόσμι' + e],
  [B + '([αβγ])[΄ʹ]\\s+(κλίσης|κλίση|συζυγίας|συζυγία)', (m, l, w) => ORD[l][0] + (w.endsWith('ς') ? 'ης ' : 'η ') + w],
  [B + '([αβγ])[΄ʹ]\\s+(πρόσωπο|προσώπου)', (m, l, w) => ORD[l][0] + (w.endsWith('υ') ? 'ου ' : 'ο ') + w],
  [B + '([ΑΒΓ])[΄ʹ](?!\\p{L})', (m, l) => ORD[l.toLowerCase()][1]],
  ['(\\d)\\s?′', '$1 λεπτά'], ['(\\d)\\s?″', '$1 δεύτερα λεπτά'],
  ['(\\d)\\s?\\$', '$1 δολάρια'], ['(\\d)\\s?€', '$1 ευρώ'], ['€\\s?(\\d[\\d.,]*)', '$1 ευρώ'], ['_{2,}', ' κενό '],
  ['(?<![\\d/])([1-9]\\d?)\\/([2-9]|10)(?![\\d/])', (m, a, b) => a + ' ' + FRAC[b] + (a === '1' ? 'ο' : 'α')],
  ['(?<![\\p{L}])x(?![\\p{L}])', 'χι'], ['(?<![\\p{L}])y(?![\\p{L}])', 'ψι'],
  ['²', ' στο τετράγωνο'], ['³', ' στον κύβο'], ['≠', ' διάφορο του '], ['≥', ' μεγαλύτερο ή ίσο του '], ['≤', ' μικρότερο ή ίσο του '],
  ['\\s?=\\s?', ' ίσον '], ['\\s?\\+\\s?', ' συν '], ['\\s?−\\s?', ' μείον '], ['\\s?×\\s?', ' επί '], ['\\s?÷\\s?', ' διά '],
  ['√', ' ρίζα '], ['\\s<\\s', ' μικρότερο από '], ['\\s>\\s', ' μεγαλύτερο από '],
  ['(\\d)\\s?%', '$1 τοις εκατό'], ['(\\d)\\s?–\\s?(\\d)', '$1 έως $2'], ['≈', ' περίπου '], ['[·\u0387]', ','],
  ['[→←↑↓⇒]', ', '], ['[•▲✓✕★☆]|\\p{Extended_Pictographic}', '']
].map(([re, to]) => [new RegExp(re, 'gu'), to]);
const FRAC = {2:'δεύτερ', 3:'τρίτ', 4:'τέταρτ', 5:'πέμπτ', 6:'έκτ', 7:'έβδομ', 8:'όγδο', 9:'ένατ', 10:'δέκατ'};
/* Στις ξένες γλώσσες, οι προτάσεις με περισσότερα λατινικά γράμματα διαβάζονται με φωνή της γλώσσας (αν η συσκευή έχει). */
const FOREIGN = {german:'de', english:'en', french:'fr'};
function sentenceLang(t){
  const sub = (location.hash.match(/^#\w+\/[ABC]\/([a-z-]+)\//) || [])[1], lang = FOREIGN[sub];
  return lang && (t.match(/[A-Za-zÄÖÜäöüßÀ-ÿ]/g) || []).length > (t.match(/\p{Script=Greek}/gu) || []).length ? lang : 'el';
}
function sayText(t, lang = 'el'){
  if(lang === 'el'){
    t = t.replace(UNIT_RE, (m, d, u) => d + ' ' + UNITS[u]);
    for(const [re, to] of SAY) t = t.replace(re, to);
  } else t = t.replace(/_{2,}/g, ' … ').replace(/[•▲→←✓✕]|\p{Extended_Pictographic}/gu, ' ');
  return t.replace(/\s+/g, ' ').replace(/^[\s,.;:·–—-]+/, '').trim();
}

/* Το κείμενο που φαίνεται, ως κομμάτια κειμένου της σελίδας (για να φωτίζεται) και λίγα δικά μας (τα γράμματα των απαντήσεων). */
function currentReadingPieces(){
  const dialog = document.querySelector('dialog[open]:not(#app-voice-set)');
  const panel = dialog || document.querySelector('.panel:not([hidden])');
  if(!panel) return [];
  const content = panel.querySelector('.fc-read, .qcard, .deck .slide, .sheet:has(.q)') || panel;
  const pieces = [], add = (t, node = null) => pieces.push({t, node});
  function collect(node){
    if(node.nodeType === Node.TEXT_NODE){add(node.textContent, node);return;}
    if(node.nodeType !== Node.ELEMENT_NODE || node.hidden ||
       node.getAttribute('aria-hidden') === 'true' ||
       node.matches('script, style, svg, nav, .seg, .pager, .lesson-step, .fc-pg, input, select, textarea') ||
       (node.matches('button') && !node.matches('.vcard, .opt, [data-oanswer], .gt'))) return;
    const css = getComputedStyle(node);
    if(css.display === 'none' || css.visibility === 'hidden') return;
    // Στοιχεία που φαίνονται ως μπλοκ (ακόμα κι αν είναι <a> ή <span>) χωρίζουν προτάσεις· τα inline-block μόνο λέξεις.
    const block = /^(P|DIV|SECTION|H[1-6]|LI|TR|BR|BUTTON)$/.test(node.tagName) || /^(block|flex|grid|list-item|table)/.test(css.display);
    if(block) add('\n');
    else if(/^inline-/.test(css.display)) add(' ');
    const opts = node.matches('.opt') && node.parentElement ? [...node.parentElement.children].filter(k => k.matches('.opt')) : null;
    if(opts && opts.length > 1) add('ΑΒΓΔΕΣ'[opts.indexOf(node)] + ': ');
    for(const child of node.childNodes) collect(child);
    if(opts && node.matches('.right, .ok')) add('. Σωστή απάντηση.');
    else if(opts && node.matches('.wrong.picked, .bad.picked')) add('. Λάθος.');
    if(block) add('\n');
    else if(/^inline-/.test(css.display)) add(' ');
  }
  collect(content);
  return pieces;
}
/* Χωρίζει σε προτάσεις: σε κάθε αλλαγή γραμμής και μετά από . ! ; … (όχι σε συντομογραφίες). Οι πολύ μεγάλες κόβονται σε κόμμα. */
const NO_STOP = /(?:^|[\s(])(?:\p{L}|[πΠ]\.χ|δηλ|σελ|ασκ|βλ|εκατ|κ\.ά|κ\.λπ|τ\.χλμ|χλμ|Ε\.Ε|π\.Χ|μ\.Χ|Α\.Ε\.Π|Ε\.Ο\.Κ|S\.I)\.$/u;
function readingSentences(pieces){
  let flat = '';
  for(const p of pieces){p.start = flat.length;flat += p.t;p.end = flat.length;}
  const spans = [];
  let s = 0;
  const cut = e => {
    let a = s, b = e;
    while(a < b && /\s/.test(flat[a])) a++;
    while(b > a && /\s/.test(flat[b - 1])) b--;
    s = e;
    if(!/[\p{L}\p{N}]/u.test(flat.slice(a, b))) return;
    while(b - a > 200){
      const part = flat.slice(a, a + 200), k = Math.max(part.lastIndexOf(', '), part.lastIndexOf(': '), part.lastIndexOf('· '));
      const m = k > 60 ? k + 1 : part.lastIndexOf(' ') > 60 ? part.lastIndexOf(' ') : 200;
      spans.push([a, a + m]);
      a += m;
      while(a < b && /\s/.test(flat[a])) a++;
    }
    if(b > a) spans.push([a, b]);
  };
  for(let i = 0; i < flat.length; i++){
    const c = flat[i];
    if(c === '\n'){cut(i);continue;}
    if(!/[.!;?…\u037E]/.test(c) || (i + 1 < flat.length && !/\s/.test(flat[i + 1]))) continue;
    if(c === '.'){
      const next = (flat.slice(i + 1).match(/\S/) || [''])[0];
      if(/[\p{Ll}\d]/u.test(next) || NO_STOP.test(flat.slice(s, i + 1))) continue;
    }
    cut(i + 1);
  }
  cut(flat.length);
  return spans.map(([a, b]) => {
    let r = null;
    for(const p of pieces){
      if(!p.node || p.end <= a || p.start >= b) continue;
      if(!r){r = document.createRange();r.setStart(p.node, Math.max(0, a - p.start));}
      r.setEnd(p.node, Math.min(p.t.length, b - p.start));
    }
    const lang = sentenceLang(flat.slice(a, b));
    return {say:sayText(flat.slice(a, b), lang), lang, range:r};
  }).filter(x => x.say);
}

function showSentence(){
  if(!sayMark) return;
  sayMark.clear();
  const r = sentences[at] && sentences[at].range;
  if(!r) return;
  sayMark.add(r);
  if(r.startContainer.parentElement && r.startContainer.parentElement.closest('.fc')) return;
  const box = r.getBoundingClientRect(), top = player.getBoundingClientRect().bottom + 8;
  if(box.height && (box.top < top || box.bottom > innerHeight - 90)) scrollBy({top:box.top - innerHeight / 3, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
}
const VP_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>';
const VP_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';
function updatePlayer(){
  player.hidden = !reading;
  document.documentElement.classList.toggle('vp-on', reading);
  const play = player.querySelector('[data-vp="play"]');
  play.innerHTML = paused ? VP_PLAY : VP_PAUSE;
  play.setAttribute('aria-label', paused ? 'Συνέχισε' : 'Παύση');
  player.querySelector('.vp-v').textContent = SPEEDS[voicePrefs().speed][0];
  voiceButton.textContent = reading ? '⏹ Διακοπή' : '🔊 Άκουσε';
  voiceButton.setAttribute('aria-pressed', String(reading));
  voiceButton.setAttribute('aria-label', reading ? 'Σταμάτησε την ανάγνωση' : 'Διάβασε το τρέχον περιεχόμενο δυνατά');
}
function pickVoice(lang = 'el'){
  const voices = speech.getVoices().filter(v => new RegExp('^' + lang + '([-_]|$)', 'i').test(v.lang)), want = voicePrefs().voice;
  return voices.find(v => v.voiceURI === want) || voices[0] || null;
}
function speakSentence(i){
  const run = ++speechRun, busy = speech.speaking || speech.pending;
  speech.cancel();
  at = Math.max(0, i);
  paused = false;
  if(at >= sentences.length){stopReading();voiceStatus.textContent = 'Η ανάγνωση ολοκληρώθηκε.';return;}
  updatePlayer();
  showSentence();
  const sn = sentences[at], voice = pickVoice(sn.lang) || pickVoice(), u = new SpeechSynthesisUtterance(sn.say);
  u.lang = voice ? voice.lang : 'el-GR';
  if(voice) u.voice = voice;
  u.rate = SPEEDS[voicePrefs().speed][1];
  u.onend = () => {if(run === speechRun) speakSentence(at + 1);};
  u.onerror = e => {
    if(run !== speechRun || e.error === 'interrupted' || e.error === 'canceled') return;
    stopReading();
    voiceStatus.textContent = 'Η ανάγνωση δεν είναι διαθέσιμη. Δοκίμασε ξανά ή έλεγξε τις φωνές της συσκευής.';
  };
  // Μερικές μηχανές χάνουν ό,τι ζητηθεί αμέσως μετά από διακοπή.
  if(busy) setTimeout(() => {if(run === speechRun) speech.speak(u);}, 80);
  else speech.speak(u);
}
function stopReading(){
  speechRun++;
  if(speech) speech.cancel();
  if(sayMark) sayMark.clear();
  reading = paused = false;
  sentences = [];
  updatePlayer();
}
function startReading(){
  const list = readingSentences(currentReadingPieces());
  if(!list.length){voiceStatus.textContent = 'Δεν υπάρχει κείμενο για ανάγνωση.';return;}
  stopReading();
  sentences = list;
  reading = true;
  voiceStatus.textContent = 'Διαβάζω το τρέχον περιεχόμενο.';
  speakSentence(0);
}
voiceButton.onclick = () => {
  if(reading){stopReading();voiceStatus.textContent = 'Η ανάγνωση σταμάτησε.';return;}
  startReading();
};
player.addEventListener('click', e => {
  const b = e.target.closest('[data-vp]');
  if(!b) return;
  const act = b.dataset.vp;
  if(act === 'stop'){stopReading();voiceStatus.textContent = 'Η ανάγνωση σταμάτησε.';}
  else if(act === 'play'){
    if(paused) speakSentence(at);
    else {speechRun++;speech.cancel();paused = true;updatePlayer();}
  }
  else if(act === 'back') speakSentence(paused ? at : at - 1);
  else if(act === 'next') speakSentence(at + 1);
  else if(act === 'speed'){
    setVoicePrefs({speed:(voicePrefs().speed + 1) % SPEEDS.length});
    if(paused) updatePlayer();else speakSentence(at);
  }
  else if(act === 'set') openVoiceSettings();
});

/* Ρυθμίσεις φωνής: ταχύτητα, φωνή, αυτόματη ανάγνωση των καρτών. Μένουν μόνο στη συσκευή (diab-voice). */
function fillVoiceSettings(){
  const pr = voicePrefs(), voices = speech.getVoices().filter(v => /^el([-_]|$)/i.test(v.lang)), pick = voiceSet.querySelector('#app-voice-pick');
  voiceSet.querySelectorAll('[data-vs-speed]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.vsSpeed === pr.speed)));
  const chosen = pickVoice();
  pick.innerHTML = voices.map(v => `<option value="${v.voiceURI.replace(/"/g, '&quot;')}">${v.name.replace(/</g, '&lt;')}</option>`).join('');
  if(chosen) pick.value = chosen.voiceURI;
  pick.closest('label').hidden = voices.length < 2;
  voiceSet.querySelector('#app-voice-none').hidden = voices.length > 0;
  voiceSet.querySelector('#app-voice-auto').checked = !!pr.auto;
}
function openVoiceSettings(){
  if(reading && !paused){speechRun++;speech.cancel();paused = true;updatePlayer();}
  fillVoiceSettings();
  if(sayMark) sayMark.clear();
  voiceSet.showModal();
}
voiceSet.addEventListener('close', () => {if(reading) showSentence();});
voiceSet.addEventListener('click', e => {
  if(e.target === voiceSet || e.target.closest('[data-vs-close]')){voiceSet.close();return;}
  const sp = e.target.closest('[data-vs-speed]');
  if(sp){setVoicePrefs({speed:+sp.dataset.vsSpeed});fillVoiceSettings();updatePlayer();}
  if(e.target.closest('#app-voice-try')){
    speechRun++;speech.cancel();
    const u = new SpeechSynthesisUtterance('Γεια σου! Έτσι θα σου διαβάζω τις κάρτες.'), voice = pickVoice();
    u.lang = 'el-GR';
    if(voice) u.voice = voice;
    u.rate = SPEEDS[voicePrefs().speed][1];
    speech.speak(u);
  }
});
voiceSet.querySelector('#app-voice-pick').onchange = e => setVoicePrefs({voice:e.target.value});
voiceSet.querySelector('#app-voice-auto').onchange = e => {setVoicePrefs({auto:e.target.checked});autoSig = cardSig();};

/* Αυτόματη ανάγνωση: μόνο στην κάρτα σε όλη την οθόνη, μία φορά για κάθε κάρτα, μέρος και σελίδα. */
function cardSig(){
  const f = document.querySelector('.fc .fc-read');
  if(!f) return '';
  const pg = f.querySelector('.fc-pg');
  return location.hash + '|' + (f.className.match(/\bp-\S+/) || [''])[0] + '|' + (pg ? pg.textContent : '');
}
let autoTimer = 0;
function autoRead(){
  clearTimeout(autoTimer);
  autoTimer = setTimeout(() => {
    const sig = cardSig();
    if(!sig || sig === autoSig) return;
    autoSig = sig;
    if(voicePrefs().auto && !reading && !voiceSet.open) startReading();
  }, 350);
}

if(!speech || !window.SpeechSynthesisUtterance){
  voiceButton.disabled = true;
  voiceButton.title = 'Η συσκευή δεν υποστηρίζει ανάγνωση κειμένου.';
  voiceStatus.textContent = voiceButton.title;
} else if(speech.addEventListener) speech.addEventListener('voiceschanged', () => {if(voiceSet.open) fillVoiceSettings();});
new MutationObserver(() => {
  if(reading){stopReading();voiceStatus.textContent = 'Το περιεχόμενο άλλαξε. Πάτησε Άκουσε για να το διαβάσω.';}
  autoRead();
}).observe(document.querySelector('main') || document.querySelector('#catalogue').parentElement,
  {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['hidden']});
window.addEventListener('hashchange', () => {if(reading) stopReading();autoRead();});
window.addEventListener('pagehide', stopReading);
