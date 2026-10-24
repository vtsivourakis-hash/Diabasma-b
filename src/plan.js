/* «Αύριο» (#tomorrow): το διάβασμα της επόμενης σχολικής μέρας.
   Τα μαθήματα βγαίνουν από το πρόγραμμα (diab-schedule) και από τις δικές σου αλλαγές (diab-plan):
   διάβασμα ή διαγώνισμα σε μια μέρα, ή «δεν το έχουμε». Ο μαθητής διαλέγει ενότητες (#plan/<μάθημα>)
   και κάθε ενότητα γίνεται ένα επίπεδο με 4 βήματα (#study/<κλειδί>/<βήμα>) και 3 αστέρια.
   Για διαγώνισμα υπάρχει ένας γύρος ερωτήσεων από όλες τις ενότητες (#prep/<μάθημα>).
   Όλα μένουν μόνο σε αυτή τη συσκευή. Χωρίς βαθμούς και χωρίς σύγκριση με άλλους. */
const PL = { sel:{}, add:null, u:{}, quiz:{}, prep:null, queue:[] };
const WEEK = ["Κυριακή", "Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο"];
const WEEK_ACC = ["την Κυριακή", "τη Δευτέρα", "την Τρίτη", "την Τετάρτη", "την Πέμπτη", "την Παρασκευή", "το Σάββατο"];
const MONTHS = ["Ιανουαρίου", "Φεβρουαρίου", "Μαρτίου", "Απριλίου", "Μαΐου", "Ιουνίου", "Ιουλίου", "Αυγούστου", "Σεπτεμβρίου", "Οκτωβρίου", "Νοεμβρίου", "Δεκεμβρίου"];
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayAt = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const daysTo = s => Math.round((dayAt(s) - dayAt(ymd(new Date()))) / 864e5);
const dayName = s => { const d = dayAt(s); return `${WEEK[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const whenText = s => { const n = daysTo(s); return n <= 0 ? "σήμερα" : n === 1 ? "αύριο" : `σε ${n} μέρες`; };
function nextSchoolDay(){ const d = new Date(); do d.setDate(d.getDate() + 1); while(d.getDay() === 0 || d.getDay() === 6); return ymd(d); }

/* Οι αλλαγές στο πρόγραμμα: {kind:"study"|"test"|"skip", sid, date}. Όσες πέρασαν σβήνονται. */
function loadPlan(){
  const today = ymd(new Date()), list = store.get("diab-plan", []);
  return Array.isArray(list) ? list.filter(e => e && ["study", "test", "skip"].includes(e.kind) && gradeSubject(selectedGrade, e.sid) && /^\d{4}-\d\d-\d\d$/.test(e.date) && e.date >= today) : [];
}
const savePlan = list => store.set("diab-plan", list);
/* Τα μαθήματα μιας μέρας: από το πρόγραμμα, μαζί με τις προσθήκες, χωρίς όσα σημείωσες ότι δεν έχετε */
function dayPlan(date){
  const s = loadSchedule(), wd = dayAt(date).getDay(), plan = loadPlan().filter(e => e.date === date), fromWeek = [];
  if(s && s.g === selectedGrade && wd >= 1 && wd <= 5) s.d[wd - 1].forEach(v => { if(v && !v.startsWith("~") && !fromWeek.includes(v)) fromWeek.push(v); });
  const skip = plan.filter(e => e.kind === "skip").map(e => e.sid), ids = fromWeek.filter(id => !skip.includes(id));
  plan.filter(e => e.kind !== "skip").forEach(e => { if(!ids.includes(e.sid)) ids.push(e.sid); });
  return { ids, fromWeek, skipped:skip.filter(id => fromWeek.includes(id)), tests:plan.filter(e => e.kind === "test").map(e => e.sid) };
}

/* Οι ενότητες ενός μαθήματος με κάρτες και ερωτήσεις, ανά κεφάλαιο, με τη σειρά του βιβλίου */
let plGroups = null;
const groupsOf = () => plGroups && plGroups.g === selectedGrade ? plGroups.v : (plGroups = { g:selectedGrade, v:scopeGroups(selectedGrade) }).v;
const subjectGroup = sid => groupsOf().find(s => s.id === sid);
const unitsOf = sid => (subjectGroup(sid)?.chapters || []).flatMap(c => c.keys);
const lastUnit = sid => store.get("diab-last-unit", {})[sid];
function suggestUnit(sid){
  const keys = unitsOf(sid), i = keys.indexOf(lastUnit(sid));
  return i < 0 ? keys[0] : keys[i + 1] || keys[i];
}

/* Τα βήματα που έγιναν (diab-steps): l Μαθαίνω, s Βλέπω, t Δοκιμάζω. Ο έλεγχος μετράει από τον καλύτερο βαθμό. */
const stepsOf = key => store.get("diab-steps", {})[key] || {};
function markStep(key, k){ const all = store.get("diab-steps", {}), d = all[key] || (all[key] = {}); if(!d[k]){ d[k] = 1; store.set("diab-steps", all); } }
/* Οι λυμένες χωρίζονται στα δύο: οι πιο εύκολες γίνονται παραδείγματα, οι υπόλοιπες εξάσκηση */
function exSplit(key){
  const ex = (unitData(key).ex || []).map((e, i) => ({e, i})).sort((a, b) => a.e.lvl - b.e.lvl || a.i - b.i), half = Math.ceil(ex.length / 2);
  return { see:ex.slice(0, half).map(x => x.i), tr:ex.slice(half).map(x => x.i) };
}
function starsOf(key){
  const d = stepsOf(key), {see, tr} = exSplit(key);
  return (d.l ? 1 : 0) + ((see.length ? d.s : d.l) && (tr.length || BOOK_HELP[key] ? d.t : true) ? 1 : 0) + (bestOf(key) >= 16 ? 1 : 0);
}
const STAR = `<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>`;
const starsView = (n, cls = "") => `<span class="pl-stars${cls ? " " + cls : ""}" role="img" aria-label="${n} από 3 αστέρια">${[0, 1, 2].map(i => `<svg viewBox="0 0 24 24" class="${i < n ? "on" : ""}" aria-hidden="true">${STAR}</svg>`).join("")}</span>`;
const unitLabel = key => `${unitNum(key)}${unitTitle(key)}`;

function renderPlanRoute(p, parts){
  keyNav = null;
  if(p === "tomorrow") renderTomorrow();
  else if(p === "plan") renderChooser(parts[1]);
  else if(p === "study") renderStudy(parts.slice(1, 5).join("/"), parts[5]);
  else if(p === "prep") renderPrep(parts[1]);
}

/* Η αρχική: τι έχεις την επόμενη σχολική μέρα και ποια διαγωνίσματα έρχονται */
function renderTomorrow(){
  const el = $("#plan"), date = nextSchoolDay(), wd = dayAt(date).getDay(), soon = daysTo(date) === 1, day = dayPlan(date), sched = loadSchedule();
  const tests = loadPlan().filter(e => e.kind === "test").sort((a, b) => a.date.localeCompare(b.date));
  const row = sid => {
    const s = gradeSubject(selectedGrade, sid), keys = unitsOf(sid), sug = keys.length ? suggestUnit(sid) : null, test = day.tests.includes(sid);
    const sub = sug ? `${lastUnit(sid) ? "Συνέχεια" : "Ξεκίνα"}: ${unitLabel(sug)}` : "Άνοιξε το βιβλίο του μαθήματος";
    return `<li class="pl-item"><a class="pl-row" href="${keys.length ? "#plan/" + sid : courseHref(selectedGrade, sid)}">${subjectIcon(sid)}<span class="pl-t"><b>${esc(s.name)}${test ? ` <span class="pl-badge">Διαγώνισμα</span>` : ""}</b><small>${sub}</small></span><span class="pl-go" aria-hidden="true">›</span></a><button class="pl-x" data-pl-skip="${sid}" aria-label="Δεν το έχουμε ${soon ? "αύριο" : WEEK_ACC[wd]}: ${esc(s.name)}">✕</button></li>`;
  };
  const n = day.ids.length;
  const lead = n ? `Έχεις ${n === 1 ? "1 μάθημα" : n + " μαθήματα"}. Διάλεξε από πού θα ξεκινήσεις. Λίγο κάθε μέρα φτάνει.`
    : sched ? "Δεν έχεις μαθήματα στο πρόγραμμα για αυτή τη μέρα. Πρόσθεσε κάτι αν χρειάζεται." : "Γράψε μία φορά το πρόγραμμα της τάξης σου και εδώ θα βλέπεις τι έχεις κάθε μέρα.";
  const subjects = getGrade(selectedGrade).subjects.filter(s => !INFO_ONLY[s.id]);
  const form = PL.add ? `<form class="sheet pl-form" id="pl-form">
      <h3 class="pl-h">Κάτι άλλο</h3>
      <div class="seg" role="group" aria-label="Τι έχεις"><button type="button" data-pl-kind="study" aria-pressed="${PL.add.kind === "study"}">Διάβασμα</button><button type="button" data-pl-kind="test" aria-pressed="${PL.add.kind === "test"}">Διαγώνισμα</button></div>
      <label class="pl-field"><span>Μάθημα</span><select id="pl-sid">${subjects.map(s => `<option value="${s.id}"${s.id === PL.add.sid ? " selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label>
      <label class="pl-field"><span>Πότε</span><input type="date" id="pl-date" min="${ymd(new Date())}" value="${PL.add.date}" required></label>
      <div class="row"><button class="btn" type="submit">Πρόσθεσε</button><button class="btn ghost" type="button" data-pl-cancel>Άκυρο</button></div>
    </form>` : `<button class="pl-add" data-pl-add>+ Κάτι άλλο: διάβασμα ή διαγώνισμα</button>`;
  el.innerHTML = `<div class="hero"><span class="ref">${dayName(date)}</span><h2 class="ct">${soon ? "Για αύριο" : "Για " + WEEK_ACC[wd]}</h2><p>${lead}</p></div>
    ${n ? `<ul class="pl-list">${day.ids.map(row).join("")}</ul>` : ""}
    ${day.skipped.length ? `<p class="pnote">Κρυμμένα για αυτή τη μέρα: ${day.skipped.map(id => esc(gradeSubject(selectedGrade, id).name)).join(", ")}. <button class="linkbtn" data-pl-unskip>Φέρ' τα πίσω</button></p>` : ""}
    ${form}
    ${tests.length ? `<h3 class="pl-h">Έρχεται</h3><ul class="pl-list">${tests.map(e => {
      const s = gradeSubject(selectedGrade, e.sid), has = unitsOf(e.sid).length;
      return `<li class="pl-item"><a class="pl-row" href="${has ? "#plan/" + e.sid : courseHref(selectedGrade, e.sid)}">${subjectIcon(e.sid)}<span class="pl-t"><b>${esc(s.name)}</b><small>Διαγώνισμα · ${dayName(e.date)} · ${whenText(e.date)}</small></span><span class="pl-when">${Math.max(0, daysTo(e.date))}<small>${daysTo(e.date) === 1 ? "μέρα" : "μέρες"}</small></span></a><button class="pl-x" data-pl-del="${e.sid}|${e.date}" aria-label="Αφαίρεση του διαγωνίσματος: ${esc(s.name)}">✕</button></li>`;
    }).join("")}</ul>` : ""}
    ${sched ? `<a class="btn ghost" href="#schedule">Το πρόγραμμά μου</a>` : `<a class="btn" href="#schedule">Γράψε το πρόγραμμά σου</a>`}
    <p class="pnote center">Το πρόγραμμα και ό,τι προσθέτεις μένουν μόνο σε αυτή τη συσκευή.</p>`;

  const plan = loadPlan();
  el.querySelectorAll("[data-pl-skip]").forEach(b => b.onclick = () => {
    const sid = b.dataset.plSkip, rest = plan.filter(e => !(e.date === date && e.sid === sid && e.kind === "study"));
    if(day.fromWeek.includes(sid)) rest.push({kind:"skip", sid, date});
    savePlan(rest); renderTomorrow();
  });
  el.querySelectorAll("[data-pl-unskip]").forEach(b => b.onclick = () => { savePlan(plan.filter(e => !(e.date === date && e.kind === "skip"))); renderTomorrow(); });
  el.querySelectorAll("[data-pl-del]").forEach(b => b.onclick = () => { const [sid, d] = b.dataset.plDel.split("|"); savePlan(plan.filter(e => !(e.kind === "test" && e.sid === sid && e.date === d))); renderTomorrow(); });
  el.querySelectorAll("[data-pl-add]").forEach(b => b.onclick = () => { PL.add = { kind:"study", sid:(groupsOf()[0] || subjects[0]).id, date }; renderTomorrow(); $("#pl-sid").focus(); });
  el.querySelectorAll("[data-pl-cancel]").forEach(b => b.onclick = () => { PL.add = null; renderTomorrow(); });
  el.querySelectorAll("[data-pl-kind]").forEach(b => b.onclick = () => { PL.add.kind = b.dataset.plKind; PL.add.sid = $("#pl-sid").value; PL.add.date = $("#pl-date").value || date; renderTomorrow(); });
  const f = $("#pl-form", el);
  if(f) f.onsubmit = e => {
    e.preventDefault();
    const sid = $("#pl-sid").value, d = $("#pl-date").value;
    if(!/^\d{4}-\d\d-\d\d$/.test(d) || d < ymd(new Date())) return;
    const rest = plan.filter(x => !(x.sid === sid && x.date === d && (x.kind === PL.add.kind || x.kind === "skip")));
    rest.push({kind:PL.add.kind, sid, date:d}); savePlan(rest); PL.add = null; renderTomorrow();
  };
}

/* «Τι κάνατε στην τάξη;»: ο μαθητής τσεκάρει μία ή περισσότερες ενότητες */
function renderChooser(sid){
  const el = $("#plan"), g = subjectGroup(sid);
  if(!g){ location.replace(gradeSubject(selectedGrade, sid) ? courseHref(selectedGrade, sid) : "#tomorrow"); return; }
  const keys = unitsOf(sid), last = lastUnit(sid), sug = suggestUnit(sid), sel = PL.sel[sid] || (PL.sel[sid] = new Set([sug]));
  const test = loadPlan().filter(e => e.kind === "test" && e.sid === sid).sort((a, b) => a.date.localeCompare(b.date))[0];
  const note = last && keys.includes(last) ? `Την τελευταία φορά διάβασες: <b>${unitLabel(last)}</b>.${sug !== last ? ` Μάλλον τώρα είναι η <b>${unitLabel(sug)}</b>.` : ""}`
    : `Ξεκίνα από την <b>${unitLabel(sug)}</b> ή τσέκαρε ό,τι κάνατε στην τάξη.`;
  const n = sel.size, studyBtn = `<button class="btn${test ? " ghost" : ""}" data-pl-study${n ? "" : " disabled"}>${n > 1 ? `Διάβασμα για αύριο (${n} ενότητες)` : "Διάβασμα για αύριο"}</button>`;
  const prepBtn = `<button class="btn${test ? "" : " ghost"}" data-pl-prep${n ? "" : " disabled"}>Προετοιμασία για διαγώνισμα</button>`;
  el.innerHTML = `<a class="back" href="#tomorrow">← Αύριο</a>
    <div class="pl-head">${subjectIcon(sid)}<div><h2 class="ct">${esc(g.name)}</h2><p class="pl-sub">${test ? `Διαγώνισμα ${dayName(test.date)} · ${whenText(test.date)}` : "Τι κάνατε στην τάξη;"}</p></div></div>
    <p class="pl-note">${note}</p>
    ${g.chapters.map(c => `<details class="pl-chap"${c.keys.some(k => sel.has(k) || k === sug) || g.chapters.length === 1 ? " open" : ""}><summary><span>${esc(c.name)}</span><small>${c.keys.length}</small></summary>
      ${c.keys.map(k => { const on = sel.has(k), st = starsOf(k); return `<label class="pl-unit${on ? " on" : ""}"><input type="checkbox" data-pk="${k}"${on ? " checked" : ""}><span class="pl-ut">${unitLabel(k)}</span>${k === sug && !st ? `<span class="pl-sug">Πρόταση</span>` : st ? starsView(st, "small") : ""}</label>`; }).join("")}
    </details>`).join("")}
    <div class="pl-actions">${test ? prepBtn + studyBtn : studyBtn + prepBtn}<p class="pnote center" id="pl-count">${n ? "" : "Διάλεξε τουλάχιστον μία ενότητα."}</p></div>`;
  el.querySelectorAll("[data-pk]").forEach(x => x.onchange = () => {
    x.checked ? sel.add(x.dataset.pk) : sel.delete(x.dataset.pk);
    x.closest(".pl-unit").classList.toggle("on", x.checked);
    const m = sel.size, sb = $("[data-pl-study]", el), pb = $("[data-pl-prep]", el);
    sb.disabled = pb.disabled = !m;
    sb.textContent = m > 1 ? `Διάβασμα για αύριο (${m} ενότητες)` : "Διάβασμα για αύριο";
    $("#pl-count", el).textContent = m ? "" : "Διάλεξε τουλάχιστον μία ενότητα.";
  });
  const chosen = () => keys.filter(k => sel.has(k));
  $("[data-pl-study]", el).onclick = () => { PL.queue = chosen(); if(PL.queue.length) location.hash = "#study/" + PL.queue[0]; };
  $("[data-pl-prep]", el).onclick = () => { if(chosen().length){ PL.prep = null; location.hash = "#prep/" + sid; } };
}

/* Η ενότητα ως επίπεδο */
function renderStudy(key, step){
  if(ALIAS[key]){ location.replace("#study/" + ALIAS[key] + (step ? "/" + step : "")); return; }
  const u = unitData(key);
  if(!u || !u.quiz?.length || !SHOWN_GRADES.includes(key[0])){ location.replace("#tomorrow"); return; }
  const sid = key.split("/")[1], last = store.get("diab-last-unit", {});
  if(last[sid] !== key){ last[sid] = key; store.set("diab-last-unit", last); }
  const s = PL.u[key] || (PL.u[key] = { li:0, si:0, sn:{}, ti:0, tn:{}, ta:{} });
  if(step === "learn") studyLearn(key, s);
  else if(step === "see") studySee(key, s);
  else if(step === "try") studyTry(key, s);
  else if(step === "check") studyCheck(key);
  else if(step === "done") studyDone(key);
  else studyLevel(key);
}
const iliadUnit = key => key.split("/")[1] === "translated";
function studySteps(key){
  const u = unitData(key), {see, tr} = exSplit(key), d = stepsOf(key), book = BOOK_HELP[key] ? BOOK_HELP[key].length : 0, il = iliadUnit(key);
  const n = u.summary.length + (u.vocab || []).length;
  return [
    {id:"learn", name:"Μαθαίνω", sub:`${n} κάρτες · μία ιδέα σε κάθε κάρτα`, done:!!d.l},
    see.length && {id:"see", name:il ? "Βλέπω πώς απαντάμε" : "Βλέπω πώς λύνεται", sub:`${see.length} ${see.length === 1 ? "παράδειγμα" : "παραδείγματα"} · ένα βήμα τη φορά`, done:!!d.s},
    (tr.length || book) && {id:"try", name:il ? "Απαντώ μόνος/η μου" : "Δοκιμάζω μόνος/η μου", sub:`${tr.length + book} ${tr.length + book === 1 ? "άσκηση" : "ασκήσεις"} · βοήθεια όταν κολλήσεις`, done:!!d.t},
    {id:"check", name:"Ελέγχω", sub:`${u.quiz.length} ερωτήσεις · δείχνει τι να ξαναδείς`, done:bestOf(key) != null}
  ].filter(Boolean);
}
const nextStep = (key, after) => { const st = studySteps(key), i = st.findIndex(x => x.id === after); return st[i + 1]; };
function studyLevel(key){
  const el = $("#plan"), sid = key.split("/")[1], u = unitData(key), steps = studySteps(key), next = steps.find(x => !x.done), stars = starsOf(key);
  const mins = Math.max(10, Math.round((u.summary.length * 1.5 + (u.ex || []).length * 3 + u.quiz.length * 0.5) / 5) * 5);
  el.innerHTML = `<a class="back" href="${unitsOf(sid).length ? "#plan/" + sid : "#tomorrow"}">← ${unitName(key)}</a>
    <div class="pl-title"><span class="ref">${unitName(key)}${unitNum(key) ? " · " + unitNum(key).replace(" · ", "") : ""}</span><h2 class="ct">${unitTitle(key)}</h2><p class="pl-sub">${steps.length} βήματα · περίπου ${mins} λεπτά</p></div>
    <ol class="pl-steps">${steps.map((x, i) => `<li><a class="pl-step${x.done ? " done" : ""}${next && x.id === next.id ? " now" : ""}" href="#study/${key}/${x.id}"><span class="pl-dot" aria-hidden="true">${x.done ? "✓" : next && x.id === next.id ? "▶" : i + 1}</span><span class="pl-t"><b>${x.name}</b><small>${x.sub}</small></span><span class="pl-sr">${x.done ? " (έγινε)" : ""}</span></a></li>`).join("")}</ol>
    <div class="sheet pl-starbox">${starsView(stars)}<p>Ένα αστέρι για τη θεωρία, ένα για την εξάσκηση, ένα για τον έλεγχο.</p></div>
    <a class="btn" href="#study/${key}/${(next || steps[steps.length - 1]).id}">${next ? (next === steps[0] ? "Ξεκίνα: " : "Συνέχισε: ") + next.name : "Ξανά ο έλεγχος"}</a>
    ${next && next.id !== "check" ? `<p class="pnote center">Το ξέρεις ήδη; <a href="#study/${key}/check">Πήγαινε κατευθείαν στον έλεγχο</a></p>` : ""}
    <p class="pnote center"><a href="${unitHref(key)}">Όλη η ενότητα σε μία σελίδα</a></p>`;
}
/* Η πάνω μπάρα των βημάτων: πρόοδος σε κομμάτια, πού είσαι, ανάγνωση και κλείσιμο */
function stepBar(key, label, i, n){
  return `<div class="pl-segs" style="--n:${n}" role="img" aria-label="${i + 1} από ${n}">${Array.from({length:n}, (_, j) => `<span class="${j <= i ? "on" : ""}"></span>`).join("")}</div>
    <div class="pl-bar"><h2 class="pl-where">${unitNum(key)}${label} · ${i + 1}/${n}</h2><span class="pl-tools"><button class="pl-round" data-pl-voice aria-label="Διάβασέ το μου φωναχτά"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg></button><a class="pl-round" href="#study/${key}" aria-label="Κλείσιμο"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></a></span></div>`;
}
/* Κοινό δέσιμο για τα βήματα σε κάρτες: σύρσιμο, βελάκια, πάτημα αριστερά/δεξιά στην κάρτα */
function bindDeck(el, go, tap){
  keyNav = go;
  el.querySelectorAll("[data-nav]").forEach(b => b.onclick = () => go(+b.dataset.nav));
  el.querySelectorAll("[data-pl-voice]").forEach(b => b.onclick = () => $("#app-voice").click());
  const slide = $(".slide", el);
  if(!slide) return;
  swipe(slide, go);
  if(tap) slide.addEventListener("click", e => {
    if(e.target.closest("button,a,summary,input,select,label")) return;
    const r = slide.getBoundingClientRect();
    go(e.clientX - r.left < r.width / 3 ? -1 : 1);
  });
}
const anim = d => CALM.matches ? "" : d > 0 ? " in-next" : d < 0 ? " in-prev" : "";
const nextLink = (key, after, text) => { const x = nextStep(key, after); return `<a class="btn gold" href="#study/${key}/${x ? x.id : ""}">${text || (x ? x.name + " →" : "Τέλος →")}</a>`; };

function studyLearn(key, s){
  const el = $("#plan"), u = unitData(key), T = t => unitText(key, t), H = t => C[key] ? t : esc(t);
  const cards = [...u.summary.map(b => ({b})), ...(u.vocab || []).map(v => ({v}))], n = cards.length, i = Math.min(s.li, n - 1), c = cards[i], last = i === n - 1;
  if(last) markStep(key, "l");
  const greek = C[key] ? ' lang="grc"' : "";
  const card = c.b ? `<span class="k">${c.b.warn ? "Προσοχή" : "Σκέψου"}</span><h3>${H(c.b.h)}</h3>${c.b.quote ? `<p class="quote" lang="grc">${c.b.quote}</p>` : ""}<p>${T(c.b.t)}</p>${c.b.f ? `<p class="f formula">${c.b.f}</p>` : ""}${figure(c.b.fig)}${c.b.ex ? `<div class="box exb"><b>Παράδειγμα</b><p>${T(c.b.ex)}</p></div>` : ""}${c.b.def ? `<div class="box defb"><b>${esc(c.b.defLabel || "Στο διαγώνισμα γράφεις")}</b><p>${T(c.b.def)}</p></div>` : ""}`
    : `<span class="k">Λέξη</span><h3 class="pl-word"${greek}>${H(c.v[0])}</h3><p><b>${H(c.v[1])}</b></p>${c.v[2] ? `<div class="box exb"><b>${C[key] ? "Στα νέα ελληνικά" : "Παράδειγμα"}</b><p>${H(c.v[2])}</p></div>` : ""}`;
  el.innerHTML = stepBar(key, "Μαθαίνω", i, n) + `<div class="deck"><section class="blk slide pl-story${c.b && c.b.warn ? " warn" : ""}${anim(s.ld)}" aria-live="polite">${card}</section></div>
    ${pager(i > 0, !last, last ? nextLink(key, "learn", "Τέλος θεωρίας ★") : `<span class="pl-hint">πάτα δεξιά για συνέχεια</span>`)}`;
  s.ld = 0;
  bindDeck(el, d => { const j = i + d; if(j < 0 || j >= n) return false; s.li = j; s.ld = d; studyLearn(key, s); return true; }, true);
}

/* Παραδείγματα: η λύση ανοίγει ένα βήμα τη φορά, για να σκεφτεί πρώτα ο μαθητής το επόμενο */
function exCard(key, e, i, n, label){
  const T = t => unitText(key, t);
  return `<div class="exh"><span class="n">${label} ${i + 1} από ${n}</span><span class="lvl l${e.lvl}">${LEVELS[e.lvl]}</span></div><p class="q">${e.h && !C[key] ? `<b>${esc(e.h)}${/[;:;?.!]$/.test(e.h) ? "" : ":"}</b> ` : ""}${T(e.q)}</p>`;
}
function studySee(key, s){
  const el = $("#plan"), u = unitData(key), list = exSplit(key).see, n = list.length;
  if(!n){ location.replace("#study/" + key); return; }
  const i = Math.min(s.si, n - 1), e = u.ex[list[i]], shown = s.sn[i] || 0, all = shown >= e.steps.length, last = i === n - 1, T = t => unitText(key, t);
  if(last && all) markStep(key, "s");
  el.innerHTML = stepBar(key, iliadUnit(key) ? "Βλέπω πώς απαντάμε" : "Βλέπω πώς λύνεται", i, n) + `<div class="deck"><div class="sheet ex slide${anim(s.sd)}">${exCard(key, e, i, n, "Παράδειγμα")}
      ${shown ? `<ol class="pl-sol">${e.steps.slice(0, shown).map(x => `<li>${T(x)}</li>`).join("")}</ol>` : ""}
      ${all ? `<p class="ans">Απάντηση: <span>${T(e.ans)}</span></p>${e.learn ? `<div class="learn"><b>Όπως μάθαμε</b><p>${T(e.learn)}</p></div>` : ""}`
        : `<p class="pl-think">${shown ? "Ποιο είναι το επόμενο βήμα; Σκέψου το και μετά πάτα." : "Πώς θα το ξεκινούσες; Σκέψου το και μετά πάτα."}</p><button class="btn ghost" data-pl-step>${shown ? "Επόμενο βήμα" : "Δείξε το πρώτο βήμα"} (${shown + 1} από ${e.steps.length})</button>`}
    </div></div>
    ${pager(i > 0, !last, last && all ? nextLink(key, "see") : `<span class="pl-hint">← σύρε →</span>`)}`;
  s.sd = 0;
  const go = d => { const j = i + d; if(j < 0 || j >= n) return false; s.si = j; s.sd = d; studySee(key, s); return true; };
  bindDeck(el, go, false);
  el.querySelectorAll("[data-pl-step]").forEach(b => b.onclick = () => { s.sn[i] = shown + 1; studySee(key, s); const li = $(".pl-sol li:last-child", el) || $(".ans", el); if(li) li.scrollIntoView({block:"nearest"}); });
}

/* Εξάσκηση: ο μαθητής λύνει στο τετράδιο. Τα βήματα της λύσης γίνονται βοήθειες, η απάντηση είναι για έλεγχο. */
function studyTry(key, s){
  const el = $("#plan"), u = unitData(key), list = exSplit(key).tr, book = !!BOOK_HELP[key], n = list.length + (book ? 1 : 0);
  if(!n){ location.replace("#study/" + key); return; }
  const i = Math.min(s.ti, n - 1), last = i === n - 1, T = t => unitText(key, t);
  if(last) markStep(key, "t");
  let card;
  if(i < list.length){
    const e = u.ex[list[i]], shown = s.tn[i] || 0, left = e.steps.length - shown, ans = s.ta[i];
    card = `<div class="sheet ex slide${anim(s.td)}">${exCard(key, e, i, list.length, iliadUnit(key) ? "Ερώτηση" : "Άσκηση")}
      <p class="pl-think">${iliadUnit(key) ? "Απάντησε με δικά σου λόγια, στο τετράδιο ή φωναχτά." : "Λύσε την στο τετράδιο."} Αν κολλήσεις, πάρε μια βοήθεια.</p>
      ${shown && e.learn ? `<div class="learn"><b>Θυμήσου τη θεωρία</b><p>${T(e.learn)}</p>${"topic" in e ? `<button class="go" data-pl-topic="${e.topic}">Δες την κάρτα →</button>` : ""}</div>` : ""}
      ${shown ? `<ol class="pl-sol">${e.steps.slice(0, shown).map(x => `<li>${T(x)}</li>`).join("")}</ol>` : ""}
      ${left && !ans ? `<button class="btn ghost" data-pl-hint>${shown ? "Κι άλλη βοήθεια" : "Χρειάζομαι βοήθεια"} (${left} ακόμη)</button>` : ""}
      ${ans ? `<p class="ans">Απάντηση: <span>${T(e.ans)}</span></p>` : `<button class="btn ghost" data-pl-ans>Έλεγξε την απάντησή σου</button>`}
    </div>`;
  } else card = `<div class="slide pl-book">${bookHelpView(key, bookUrlFor(key), u.summary)}</div>`;
  el.innerHTML = stepBar(key, iliadUnit(key) ? "Απαντώ μόνος/η μου" : "Δοκιμάζω μόνος/η μου", i, n) + `<div class="deck">${card}</div>
    ${pager(i > 0, !last, last ? nextLink(key, "try") : `<span class="pl-hint">← σύρε →</span>`)}`;
  s.td = 0;
  const go = d => { const j = i + d; if(j < 0 || j >= n) return false; s.ti = j; s.td = d; studyTry(key, s); return true; };
  bindDeck(el, go, false);
  el.querySelectorAll("[data-pl-hint]").forEach(b => b.onclick = () => { s.tn[i] = (s.tn[i] || 0) + 1; studyTry(key, s); const li = $(".pl-sol li:last-child", el); if(li) li.scrollIntoView({block:"nearest"}); });
  el.querySelectorAll("[data-pl-ans]").forEach(b => b.onclick = () => { s.ta[i] = 1; studyTry(key, s); const a = $(".ans", el); if(a) a.scrollIntoView({block:"nearest"}); });
  const toCard = t => { s.li = t; location.hash = "#study/" + key + "/learn"; };
  el.querySelectorAll("[data-pl-topic]").forEach(b => b.onclick = () => toCard(+b.dataset.plTopic));
  if(book) bindBookHelp(el, key, () => studyTry(key, s), t => toCard(t));
}

/* Έλεγχος: οι ερωτήσεις της ενότητας. Στο τέλος πάμε στην οθόνη «Μπράβο». */
function studyCheck(key){
  const el = $("#plan");
  let z = PL.quiz[key];
  if(!z || z.done) z = PL.quiz[key] = newQuiz(unitItems(key), "unit");
  const rr = () => { if(!z.done) studyCheck(key); };
  const v = quizView(z, rr);
  el.innerHTML = `<div class="pl-bar"><h2 class="pl-where">${unitNum(key)}Ελέγχω</h2><span class="pl-tools"><a class="pl-round" href="#study/${key}" aria-label="Κλείσιμο"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></a></span></div>` + v.body;
  keyNav = v.go;
  el.querySelectorAll("[data-nav]").forEach(b => b.onclick = () => v.go && v.go(+b.dataset.nav));
  const slide = $(".slide", el);
  if(slide && v.go) swipe(slide, v.go);
  bindQuiz(el, z, rr, { finish:() => { saveBest(key, gradeOf(z)); location.hash = "#study/" + key + "/done"; } });
}

function studyDone(key){
  const el = $("#plan"), z = PL.quiz[key];
  if(!z || !z.done){ location.replace("#study/" + key); return; }
  const {right} = quizScore(z), n = z.qs.length, stars = starsOf(key), u = unitData(key), sid = key.split("/")[1];
  const wrong = z.qs.filter((q, i) => z.picked[i] === undefined || !q.opts[z.picked[i]].ok);
  const qi = PL.queue.indexOf(key), nextUnit = qi >= 0 ? PL.queue[qi + 1] : null;
  const ids = dayPlan(nextSchoolDay()).ids.filter(id => unitsOf(id).length), at = ids.indexOf(sid), nextSid = ids.filter(id => id !== sid)[Math.max(0, at)] || ids.find(id => id !== sid);
  const learned = u.summary.slice(0, 5).map(b => `<li><span aria-hidden="true">✓</span>${esc(strip(b.h))}</li>`).join("");
  el.innerHTML = `<div class="pl-done">
      <svg class="pl-confetti" viewBox="0 0 260 120" aria-hidden="true"><path d="M22 30l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" style="fill:var(--c-pink)"/><circle cx="236" cy="24" r="5" style="fill:var(--c-cyan)"/><rect x="214" y="78" width="10" height="10" rx="2" transform="rotate(20 219 83)" style="fill:var(--c-amber)"/><circle cx="40" cy="96" r="4" style="fill:var(--c-lime)"/><path d="M240 98l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" style="fill:var(--c-violet)"/>
        ${[[78, 38, .9], [130, 30, 1.25], [182, 38, .9]].map(([x, y, k], i) => `<g transform="translate(${x - 12 * k * 2} ${y - 12 * k * 2 + 20}) scale(${k * 2})"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" class="${i < stars ? "on" : "off"}"/></g>`).join("")}</svg>
      <h2 class="ct">${right * 5 >= n * 4 ? "Μπράβο!" : "Καλή προσπάθεια!"}</h2>
      <p class="pl-sub">${unitLabel(key)}${stars ? ` · ${stars === 1 ? "1 αστέρι" : stars + " αστέρια"}` : ""}</p>
      <p>Βρήκες σωστά ${right} από ${n}.${bestOf(key) < 16 ? " Το αστέρι του ελέγχου έρχεται με 8 στις 10 σωστές. Ξαναδοκίμασε όποτε θες." : ""}</p></div>
    <div class="sheet pl-learned"><h3 class="pl-h">Σήμερα έμαθες</h3><ul>${learned}</ul></div>
    ${wrong.length ? `<details class="sheet pl-again"><summary><span class="pl-again-ic" aria-hidden="true">↻</span><span class="pl-t"><b>Μια ματιά ακόμα</b><small>${wrong.length === 1 ? "1 ερώτηση" : wrong.length + " ερωτήσεις"} που σου ξέφυγαν</small></span></summary>
      ${wrong.map(q => `<div class="pl-miss"><p><b>${plain(q.q)}</b></p><p class="ans">Σωστή απάντηση: <span>${plain(q.opts.find(o => o.ok).t)}</span></p><p>${rich(q.why)}</p></div>`).join("")}</details>` : ""}
    <div class="pl-actions">
      ${nextUnit ? `<a class="btn" href="#study/${nextUnit}">Επόμενη ενότητα: ${unitLabel(nextUnit)}</a>` : nextSid ? `<a class="btn" href="#plan/${nextSid}">Επόμενο για αύριο: ${esc(gradeSubject(selectedGrade, nextSid).name)}</a>` : ""}
      <a class="btn ghost" href="#tomorrow">Φτάνει για σήμερα</a>
      <p class="pnote center"><a href="#study/${key}/check">Ξανά ο έλεγχος</a> · <a href="#study/${key}">Τα βήματα της ενότητας</a></p>
    </div>`;
}

/* Προετοιμασία για διαγώνισμα: 10 ερωτήσεις από τις ενότητες που διάλεξες, ανακατεμένες.
   Στο τέλος δείχνει ανά ενότητα τι να ξαναδείς, χωρίς βαθμό. */
function renderPrep(sid){
  const el = $("#plan"), g = subjectGroup(sid), sel = PL.sel[sid];
  const keys = g ? unitsOf(sid).filter(k => sel && sel.has(k)) : [];
  if(!keys.length){ location.replace(g ? "#plan/" + sid : "#tomorrow"); return; }
  const id = keys.join(",");
  if(!PL.prep || PL.prep.id !== id) PL.prep = { id, z:newQuiz(shuffle(quizPool(keys)).slice(0, 10), "prep") };
  const z = PL.prep.z, test = loadPlan().filter(e => e.kind === "test" && e.sid === sid).sort((a, b) => a.date.localeCompare(b.date))[0];
  const head = `<div class="pl-bar"><div><span class="ref">${test ? `Διαγώνισμα · ${esc(g.name)} · ${WEEK[dayAt(test.date).getDay()]}` : `Προετοιμασία · ${esc(g.name)}`}</span><h2 class="pl-where">${keys.length === 1 ? unitLabel(keys[0]) : keys.length + " ενότητες"}</h2></div><span class="pl-tools"><a class="pl-round" href="#plan/${sid}" aria-label="Κλείσιμο"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></a></span></div>`;
  if(z.done){
    const by = {};
    z.qs.forEach((q, i) => { const b = by[q.key] || (by[q.key] = [0, 0]); b[1]++; if(z.picked[i] !== undefined && q.opts[z.picked[i]].ok) b[0]++; });
    const {right} = quizScore(z), rows = keys.filter(k => by[k]).sort((a, b) => by[a][0] / by[a][1] - by[b][0] / by[b][1]);
    el.innerHTML = head + `<div class="pl-done"><h2 class="ct">${right * 5 >= z.qs.length * 4 ? "Είσαι σε καλό δρόμο!" : "Καλή δουλειά!"}</h2><p>Βρήκες σωστά ${right} από ${z.qs.length}. Ό,τι σου ξέφυγε, τώρα ξέρεις πού να το βρεις.</p></div>
      <h3 class="pl-h">Τι να ξαναδείς</h3><div class="brk">${rows.map(k => { const [r, t] = by[k]; return `<a href="#study/${k}"><span>${unitLabel(k)}</span><b class="${r === t ? "ok" : r * 2 >= t ? "mid" : "low"}">${r}/${t}</b></a>`; }).join("")}</div>
      <div class="pl-actions"><button class="btn" data-pl-again>Νέος γύρος με άλλες ερωτήσεις</button><a class="btn ghost" href="#tomorrow">Φτάνει για σήμερα</a></div>`;
    $("[data-pl-again]", el).onclick = () => { PL.prep = null; renderPrep(sid); window.scrollTo({top:0}); };
    return;
  }
  const rr = () => renderPrep(sid), v = quizView(z, rr);
  el.innerHTML = head + `<p class="pnote">Ερωτήσεις από όλες τις ενότητες που διάλεξες. Χωρίς βαθμό: μόνο για να δεις τι θυμάσαι.</p>` + v.body;
  keyNav = v.go;
  el.querySelectorAll("[data-nav]").forEach(b => b.onclick = () => v.go && v.go(+b.dataset.nav));
  const slide = $(".slide", el);
  if(slide && v.go) swipe(slide, v.go);
  bindQuiz(el, z, rr, { top:() => window.scrollTo({top:0}) });
}
