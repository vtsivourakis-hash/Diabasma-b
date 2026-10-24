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
const voiceButton = document.querySelector('#app-voice');
const voiceStatus = document.querySelector('#app-voice-status');
const speech = window.speechSynthesis;
let reading = false, speechRun = 0;
function stopReading(){
  speechRun++;
  if(speech) speech.cancel();
  reading = false;
  voiceButton.textContent = '🔊 Άκουσε';
  voiceButton.setAttribute('aria-pressed', 'false');
  voiceButton.setAttribute('aria-label', 'Διάβασε το τρέχον περιεχόμενο δυνατά');
}
function currentReadingText(){
  const dialog = document.querySelector('dialog[open]');
  const panel = dialog || document.querySelector('.panel:not([hidden])');
  if(!panel) return '';
  const content = panel.querySelector('.qcard, .deck .slide, .sheet:has(.q)') || panel;
  const parts = [];
  function collect(node){
    if(node.nodeType === Node.TEXT_NODE){parts.push(node.textContent);return;}
    if(node.nodeType !== Node.ELEMENT_NODE || node.hidden ||
       node.getAttribute('aria-hidden') === 'true' ||
       node.matches('script, style, svg, nav, .seg, .pager, .lesson-step, input, select, textarea') ||
       (node.matches('button') && !node.matches('.vcard, .opt, [data-oanswer], .gt')) ||
       getComputedStyle(node).display === 'none' || getComputedStyle(node).visibility === 'hidden') return;
    const block = /^(P|DIV|SECTION|H[1-6]|LI|TR|BR|BUTTON)$/.test(node.tagName);
    if(block) parts.push('\n');
    for(const child of node.childNodes) collect(child);
    if(block) parts.push('\n');
  }
  collect(content);
  return parts.join('').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}
voiceButton.onclick = () => {
  if(reading){stopReading();voiceStatus.textContent = 'Η ανάγνωση σταμάτησε.';return;}
  const text = currentReadingText();
  if(!text){voiceStatus.textContent = 'Δεν υπάρχει κείμενο για ανάγνωση.';return;}
  stopReading();
  const run = speechRun;
  // Short utterances keep long lessons reliable on mobile speech engines.
  const chunks = text.match(/[\s\S]{1,220}(?:\s|$)|[\s\S]{1,220}/g) || [text];
  const voices = speech.getVoices();
  const voice = voices.find(v => /^el[-_]/i.test(v.lang)) || voices.find(v => /^el$/i.test(v.lang));
  reading = true;
  voiceButton.textContent = '⏹ Διακοπή';
  voiceButton.setAttribute('aria-pressed', 'true');
  voiceButton.setAttribute('aria-label', 'Σταμάτησε την ανάγνωση');
  voiceStatus.textContent = 'Διαβάζω το τρέχον περιεχόμενο.';
  function speakNext(){
    if(run !== speechRun) return;
    if(!chunks.length){stopReading();voiceStatus.textContent = 'Η ανάγνωση ολοκληρώθηκε.';return;}
    const utterance = new SpeechSynthesisUtterance(chunks.shift());
    utterance.lang = 'el-GR';
    if(voice) utterance.voice = voice;
    utterance.rate = 0.95;
    utterance.onend = speakNext;
    utterance.onerror = () => {
      if(run !== speechRun) return;
      stopReading();
      voiceStatus.textContent = 'Η ανάγνωση δεν είναι διαθέσιμη. Δοκίμασε ξανά ή έλεγξε τις φωνές της συσκευής.';
    };
    speech.speak(utterance);
  }
  speakNext();
};
if(!speech || !window.SpeechSynthesisUtterance){
  voiceButton.disabled = true;
  voiceButton.title = 'Η συσκευή δεν υποστηρίζει ανάγνωση κειμένου.';
  voiceStatus.textContent = voiceButton.title;
}
new MutationObserver(() => {
  if(reading){stopReading();voiceStatus.textContent = 'Το περιεχόμενο άλλαξε. Πάτησε Άκουσε για να το διαβάσω.';}
}).observe(document.querySelector('main') || document.querySelector('#catalogue').parentElement,
  {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['hidden']});
window.addEventListener('hashchange', () => {if(reading) stopReading();});
window.addEventListener('pagehide', stopReading);
