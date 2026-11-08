/* «Αύριο» (#tomorrow): το διάβασμα της επόμενης σχολικής μέρας.
   Τα μαθήματα βγαίνουν από το πρόγραμμα (diab-schedule) και από τις δικές σου αλλαγές (diab-plan):
   διάβασμα ή διαγώνισμα σε μια μέρα, ή «δεν το έχουμε». Ο μαθητής διαλέγει ενότητες (#plan/<μάθημα>)
   και κάθε ενότητα ανοίγει ως κάρτες (#study/<κλειδί>), μία ιδέα σε κάθε κάρτα, σε όλη την οθόνη (#study/<κλειδί>/c/<αριθμός>).
   Για διαγώνισμα υπάρχει ένας γύρος ερωτήσεων από όλες τις ενότητες (#prep/<μάθημα>).
   Όλα μένουν μόνο σε αυτή τη συσκευή. Χωρίς βαθμούς και χωρίς σύγκριση με άλλους. */
const PL = { sel:{}, add:null, u:{}, prep:null, mock:null, check:null, calDay:null, queue:[], fc:null, fromFeed:null };
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

const unitLabel = key => `${unitNum(key)}${unitTitle(key)}`;

function renderPlanRoute(p, parts){
  keyNav = null;
  if(p === "tomorrow") renderTomorrow();
  else if(p === "plan") renderChooser(parts[1]);
  else if(p === "study") renderStudy(parts.slice(1, 5).join("/"), parts.slice(5));
  else if(p === "prep") renderPrep(parts[1]);
  else if(p === "mock") renderMock(parts[1]);
  else if(p === "check") renderCheck(parts.slice(1, 5).join("/"));
  else if(p === "calendar") renderCalendar(parts[1]);
  else if(p === "day") renderDay(parts[1]);
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
  const subjects = getGrade(selectedGrade).subjects.filter(s => !INFO_ONLY[s.id] || s.books.some(b => b.own));
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
    ${sched ? `<div class="row"><a class="btn ghost" href="#schedule">Το πρόγραμμά μου</a><a class="btn ghost" href="#calendar">Το ημερολόγιό μου</a></div><a class="btn ghost" href="#day">Η μέρα μου</a>` : `<a class="btn" href="#schedule">Γράψε το πρόγραμμά σου</a><a class="btn ghost" href="#day">Η μέρα μου</a>`}
    <p class="pnote center">Το πρόγραμμα και ό,τι προσθέτεις μένουν μόνο σε αυτή τη συσκευή.</p>
    <p class="pnote center">Πώς δουλεύει η σελίδα; <button class="linkbtn" type="button" data-tour-start>Ξενάγηση</button></p>`;

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

/* «Η μέρα μου» (#day, #day/tomorrow, #day/settings): πρόταση για τη μέρα, από τις ρυθμίσεις (diab-day), το πρόγραμμα και τα διαγωνίσματα.
   Είναι πρόταση, όχι υποχρέωση· όλα μένουν στη συσκευή. Η σελίδα δεν μετράει τίποτα (ούτε χρόνο οθόνης). */
const DAY_WEEK = ["Κυ", "Δε", "Τρ", "Τε", "Πε", "Πα", "Σα"];
/* Ύπνος ανά τάξη (AASM): η Α΄ είναι 12–13 ετών, η Β΄ 13–14 και η Γ΄ 14–15 (σχολικό έτος 2026–27) */
const SLEEP_RANGE = { A:[9, 10], B:[8, 10], C:[8, 10] };
const DAY_DEF = { wake:"07:00", sleep:9, screens:60, screenGoal:0, free:90, schoolStart:"08:15", schoolEnd:"14:00", acts:[] };
const tMin = s => { const m = /^(\d\d):(\d\d)$/.exec(s || ""); return m ? +m[1] * 60 + +m[2] : null; };
const tStr = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
const hrs = m => { const h = Math.floor(m / 60), r = m % 60; return h && r === 30 ? `${h}½ ${h === 1 ? "ώρα" : "ώρες"}` : !h ? `${m}΄` : !r ? `${h} ${h === 1 ? "ώρα" : "ώρες"}` : `${h} ${h === 1 ? "ώρα" : "ώρες"} ${r}΄`; };
function loadDay(){
  const o = Object.assign({}, DAY_DEF, store.get("diab-day", {}));
  if(tMin(o.wake) === null) o.wake = DAY_DEF.wake;
  if(![8, 8.5, 9, 9.5, 10].includes(o.sleep)) o.sleep = DAY_DEF.sleep;
  if(![30, 45, 60].includes(o.screens)) o.screens = DAY_DEF.screens;
  if(![0, 60, 90, 120].includes(o.screenGoal)) o.screenGoal = 0;
  if(![60, 90, 120].includes(o.free)) o.free = DAY_DEF.free;
  if(tMin(o.schoolStart) === null) o.schoolStart = DAY_DEF.schoolStart;
  if(tMin(o.schoolEnd) === null || tMin(o.schoolEnd) <= tMin(o.schoolStart)) o.schoolEnd = DAY_DEF.schoolEnd;
  o.acts = (Array.isArray(o.acts) ? o.acts : []).filter(a => a && typeof a.name === "string" && tMin(a.from) !== null && tMin(a.to) > tMin(a.from) &&
    (a.kind === "week" ? Array.isArray(a.days) && a.days.length : a.kind === "once" && /^\d{4}-\d\d-\d\d$/.test(a.date))).slice(0, 30);
  return o;
}
const saveDay = o => store.set("diab-day", o);
const actDays = days => days.length === 7 ? "Κάθε μέρα" : "Κάθε " + days.slice().sort((x, y) => (x || 7) - (y || 7)).map(d => WEEK[d]).join(", ");

/* Η επόμενη σχολική μέρα μετά από μια μέρα: γι' αυτήν διαβάζεις το απόγευμα */
function schoolDayAfter(date){ const d = dayAt(date); do d.setDate(d.getDate() + 1); while(d.getDay() === 0 || d.getDay() === 6); return ymd(d); }
/* Εκτίμηση διαβάσματος (περίπου): 15΄ για κάθε μάθημα με κάρτες, 10΄ για τα άλλα, +20΄ για κάθε διαγώνισμα στις επόμενες 4 μέρες */
function studyEstimate(date){
  const target = schoolDayAfter(date), day = dayPlan(target), sched = loadSchedule();
  const tests = loadPlan().filter(e => e.kind === "test" && e.date > date && Math.round((dayAt(e.date) - dayAt(date)) / 864e5) <= 4);
  const withCards = day.ids.filter(id => unitsOf(id).length), other = day.ids.filter(id => !unitsOf(id).length);
  const min = withCards.length * 15 + other.length * 10 + tests.length * 20;
  return { target, min:Math.round(min / 5) * 5, withCards, other, tests, sched:!!sched };
}
function studyWhy(e){
  const names = ids => ids.map(id => gradeSubject(selectedGrade, id).name).join(", ");
  const when = e.target === ymd(new Date(Date.now() + 864e5)) ? "Αύριο" : "Για " + WEEK_ACC[dayAt(e.target).getDay()];
  const parts = [];
  if(e.withCards.length) parts.push(`${e.withCards.length === 1 ? "1 μάθημα" : e.withCards.length + " μαθήματα"} με κάρτες (${esc(names(e.withCards))}), περίπου 15΄ το καθένα`);
  if(e.other.length) parts.push(`${esc(names(e.other))}, περίπου 10΄ ${e.other.length === 1 ? "" : "το καθένα"}`.trim());
  const tests = e.tests.map(t => `${esc(gradeSubject(selectedGrade, t.sid).name)} ${WEEK_ACC[dayAt(t.date).getDay()]}`);
  if(!e.sched && !e.tests.length) return `Γράψε το <a href="#schedule">πρόγραμμά σου</a> και εδώ θα βγαίνει πόσο διάβασμα θέλει η μέρα.`;
  if(!parts.length && !tests.length) return `${when} δεν έχεις μαθήματα στο πρόγραμμα, ούτε διαγώνισμα τις επόμενες μέρες.`;
  return `${when} έχεις ${parts.join(" και ") || "μόνο επανάληψη"}.${tests.length ? ` Έρχεται διαγώνισμα: ${tests.join(", ")} (+20΄${tests.length > 1 ? " για το καθένα" : ""}).` : ""} Είναι εκτίμηση: αν κάτι το ξέρεις ήδη, θέλει λιγότερο.`;
}

/* Τα κομμάτια της μέρας, με τη σειρά. Ό,τι έχει σταθερή ώρα (σχολείο, δραστηριότητες, ύπνος) μπαίνει πρώτο·
   το διάβασμα και ο ελεύθερος χρόνος μπαίνουν στα κενά που μένουν. */
function dayTimeline(date, o){
  const wd = dayAt(date).getDay(), school = wd >= 1 && wd <= 5, wake = tMin(o.wake);
  const bed = wake + 1440 - o.sleep * 60, off = bed - o.screens, rows = [], busy = [];
  rows.push({ at:wake, k:"wake", t:"Ξύπνημα", s:"" });
  /* Σαββατοκύριακο: οι προτάσεις αρχίζουν από τις 10:00, όχι αμέσως μετά το ξύπνημα */
  let after = school ? wake + 60 : Math.max(wake + 120, 600);
  if(school){
    const s = loadSchedule(), start = tMin(o.schoolStart), full = tMin(o.schoolEnd) - start;
    let n = 7;
    if(s && s.g === selectedGrade){ const d = s.d[wd - 1]; n = 0; d.forEach((v, h) => { if(v) n = h + 1; }); }
    const end = n ? start + Math.round(full * n / 7 / 5) * 5 : start;
    if(n){
      rows.push({ at:start, k:"school", t:`Σχολείο ως τις ${tStr(end)}`, s:s && s.g === selectedGrade ? `${n} ${n === 1 ? "ώρα" : "ώρες"}, από το πρόγραμμά σου${n < 7 ? " (η ώρα λήξης είναι περίπου)" : ""}` : "Γράψε το πρόγραμμά σου για να ξέρει η σελίδα πόσες ώρες έχεις" });
      busy.push([start, end]);
      rows.push({ at:end + 15, k:"rest", t:"Φαγητό και ξεκούραση", s:"" });
      busy.push([end, end + 90]);
      after = end + 90;
    }
  }
  o.acts.filter(a => a.kind === "week" ? a.days.includes(wd) : a.date === date).forEach(a => {
    const f = tMin(a.from), to = tMin(a.to);
    rows.push({ at:f, k:"act", t:`${esc(a.name)} ως τις ${a.to}`, s:a.kind === "week" ? actDays(a.days) : "Μία φορά" });
    busy.push([f, to]);
  });
  /* Τα κενά από το «after» ως τις οθόνες κλειστές */
  const gaps = () => {
    const b = busy.slice().sort((x, y) => x[0] - y[0]), out = [];
    let t = after;
    b.forEach(([f, to]) => { if(f > t) out.push([t, f]); t = Math.max(t, to); });
    if(off > t) out.push([t, off]);
    return out;
  };
  const place = (need, min) => { const g = gaps().find(([f, to]) => to - f >= need) || gaps().filter(([f, to]) => to - f >= min).sort((x, y) => (y[1] - y[0]) - (x[1] - x[0]))[0]; if(!g) return null; const len = Math.min(need, g[1] - g[0]); busy.push([g[0], g[0] + len]); return [g[0], len]; };
  const est = studyEstimate(date);
  if(est.min){
    const p = place(est.min, 20);
    const subj = [...est.tests.map(t => gradeSubject(selectedGrade, t.sid).name + " (διαγώνισμα)"), ...est.withCards.map(id => gradeSubject(selectedGrade, id).name), ...est.other.map(id => gradeSubject(selectedGrade, id).name)];
    const what = esc([...new Set(subj)].join(", "));
    if(p) rows.push({ at:p[0], k:"study", t:`Διάβασμα, περίπου ${hrs(p[1])}`, s:p[1] < est.min ? `${what} · χωράνε ${hrs(p[1])} από τα ${hrs(est.min)}: ίσως λίγο νωρίτερα ή σε δύο κομμάτια` : what, href:"#tomorrow" });
    else rows.push({ at:after, k:"study", t:`Διάβασμα, περίπου ${hrs(est.min)}`, s:`${what} · δεν βρέθηκε κενό στη μέρα σου` , href:"#tomorrow" });
  }
  const fr = place(o.free, 30);
  rows.push(fr ? { at:fr[0], k:"free", t:"Ελεύθερος χρόνος", s:`Ο στόχος σου: ${hrs(o.free)}${fr[1] < o.free ? ` · σήμερα χωράει ${hrs(fr[1])}` : ""}${o.screenGoal ? ` · παιχνίδι και βίντεο έως ${hrs(o.screenGoal)}` : ""}` }
    : { at:off - 30, k:"free", t:"Ελεύθερος χρόνος", s:`Η μέρα είναι γεμάτη. Κράτα λίγο χρόνο για σένα, έστω μισή ώρα.` });
  rows.push({ at:off, k:"off", t:"Οθόνες κλειστές", s:`Πρόταση: ${o.screens === 60 ? "μία ώρα" : o.screens + "΄"} χωρίς κινητό, τάμπλετ και υπολογιστή πριν τον ύπνο` });
  const [lo, hi] = SLEEP_RANGE[selectedGrade] || [8, 10];
  rows.push({ at:bed, k:"sleep", t:"Ύπνος", s:`${hrs(o.sleep * 60)} ως τις ${o.wake} · για την ${getGrade(selectedGrade).label} προτείνονται ${lo}–${hi} ώρες` });
  return { rows:rows.sort((a, b) => a.at - b.at), est };
}

function renderDay(sub){
  if(sub === "settings") return renderDaySettings();
  const el = $("#plan"), o = loadDay(), today = new Date(), tom = new Date(Date.now() + 864e5);
  const date = ymd(sub === "tomorrow" ? tom : today), { rows, est } = dayTimeline(date, o);
  el.innerHTML = `<div class="dm-top"><div><span class="ref">${dayName(date)}</span><h2 class="ct">Η μέρα μου</h2></div><a class="pl-round" href="#day/settings" aria-label="Ρυθμίσεις της μέρας"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg></a></div>
    <nav class="seg" aria-label="Ποια μέρα"><a href="#day"${sub === "tomorrow" ? "" : ` aria-current="page"`}>Σήμερα</a><a href="#day/tomorrow"${sub === "tomorrow" ? ` aria-current="page"` : ""}>Αύριο</a></nav>
    <div class="dm-sum">
      <div><small>Ύπνος</small><b>${hrs(o.sleep * 60)}</b><small>${tStr(tMin(o.wake) - o.sleep * 60)} → ${o.wake}</small></div>
      <div><small>Διάβασμα</small><b>${est.min ? "~" + hrs(est.min) : "—"}</b><small>εκτίμηση</small></div>
      <div><small>Ελεύθερο</small><b>${hrs(o.free)}</b><small>ο στόχος σου</small></div>
    </div>
    <ol class="dm-line">${rows.map(r => `<li class="dm-${r.k}"><span class="dm-at">${tStr(r.at)}</span><span class="dm-dot" aria-hidden="true"></span>${r.href ? `<a class="dm-box" href="${r.href}">` : `<div class="dm-box">`}<b>${r.t}</b>${r.s ? `<small>${r.s}</small>` : ""}${r.href ? "</a>" : "</div>"}</li>`).join("")}</ol>
    <div class="dm-why"><b>Πώς βγήκε η εκτίμηση για το διάβασμα</b><p>${studyWhy(est)}</p></div>
    <div class="row"><a class="btn ghost" href="#day/settings">Άλλαξε τη μέρα</a><a class="btn" href="#tomorrow">Στο διάβασμα</a></div>
    <p class="pnote center">Είναι πρόταση, όχι υποχρέωση. Μένει μόνο σε αυτή τη συσκευή.</p>`;
}

const DAY_FORM = { kind:"week", days:[], open:false, msg:"" };
function renderDaySettings(){
  const el = $("#plan"), o = loadDay(), [lo, hi] = SLEEP_RANGE[selectedGrade] || [8, 10];
  const pick = (name, list, cur, label) => `<div class="seg" role="group" aria-label="${label}">${list.map(([v, t]) => `<button type="button" data-dm-set="${name}" data-v="${v}" aria-pressed="${v === cur}">${t}</button>`).join("")}</div>`;
  const acts = o.acts.map((a, i) => `<li class="pl-item"><div class="pl-row dm-act ${a.kind}"><span class="pl-t"><b>${esc(a.name)}</b><small>${a.kind === "week" ? actDays(a.days) : dayName(a.date)} · ${a.from}–${a.to}</small></span><span class="dm-kind">${a.kind === "week" ? "Τακτική" : "Μία φορά"}</span></div><button class="pl-x" data-dm-del="${i}" aria-label="Αφαίρεση: ${esc(a.name)}">✕</button></li>`).join("");
  const f = DAY_FORM;
  const form = f.open ? `<form class="sheet pl-form" id="dm-form">
      <h3 class="pl-h">Νέα δραστηριότητα</h3>
      <label class="pl-field"><span>Τι είναι</span><input id="dm-name" maxlength="40" required placeholder="π.χ. Ποδόσφαιρο, Αγγλικά, πιάνο"></label>
      <div class="seg" role="group" aria-label="Πόσο συχνά"><button type="button" data-dm-kind="week" aria-pressed="${f.kind === "week"}">Κάθε εβδομάδα</button><button type="button" data-dm-kind="once" aria-pressed="${f.kind === "once"}">Μία φορά</button></div>
      ${f.kind === "week" ? `<fieldset class="dm-days"><legend>Ποιες μέρες</legend>${[1, 2, 3, 4, 5, 6, 0].map(d => `<label><input type="checkbox" value="${d}"${f.days.includes(d) ? " checked" : ""}><span>${DAY_WEEK[d]}</span></label>`).join("")}</fieldset>`
        : `<label class="pl-field"><span>Πότε</span><input type="date" id="dm-date" min="${ymd(new Date())}" value="${ymd(new Date())}" required></label>`}
      <div class="dm-two"><label class="pl-field"><span>Από</span><input type="time" id="dm-from" value="17:00" required></label><label class="pl-field"><span>Ως</span><input type="time" id="dm-to" value="18:30" required></label></div>
      ${f.msg ? `<p class="pnote dm-msg" role="alert">${f.msg}</p>` : ""}
      <div class="row"><button class="btn" type="submit">Πρόσθεσε</button><button class="btn ghost" type="button" data-dm-cancel>Άκυρο</button></div>
    </form>` : `<button class="pl-add" data-dm-add>+ Πρόσθεσε δραστηριότητα</button>`;
  el.innerHTML = `<a class="dm-back" href="#day">← Η μέρα μου</a>
    <h2 class="ct">Ρυθμίσεις της μέρας</h2>
    <section class="sheet dm-sec"><h3 class="pl-h">Ύπνος</h3>
      <p class="pnote">Για την ${getGrade(selectedGrade).label} (περίπου ${{A:"12–13", B:"13–14", C:"14–15"}[selectedGrade] || "13–15"} ετών) προτείνονται ${lo}–${hi} ώρες ύπνου.</p>
      <label class="pl-field"><span>Ξύπνημα</span><input type="time" id="dm-wake" value="${o.wake}"></label>
      <span class="dm-lab">Ώρες ύπνου</span>${pick("sleep", [[8, "8"], [8.5, "8½"], [9, "9"], [9.5, "9½"], [10, "10"]], o.sleep, "Ώρες ύπνου")}
      <p class="dm-note">Για να κοιμηθείς ${hrs(o.sleep * 60)} και να ξυπνήσεις στις ${o.wake}, πήγαινε για ύπνο στις <b>${tStr(tMin(o.wake) - o.sleep * 60)}</b>.</p></section>
    <section class="sheet dm-sec"><h3 class="pl-h">Σχολείο</h3>
      <div class="dm-two"><label class="pl-field"><span>Αρχίζει</span><input type="time" id="dm-s1" value="${o.schoolStart}"></label><label class="pl-field"><span>Τελειώνει (με 7 ώρες)</span><input type="time" id="dm-s2" value="${o.schoolEnd}"></label></div>
      <p class="pnote">Τις μέρες με λιγότερες ώρες, η σελίδα υπολογίζει περίπου πότε τελειώνει, από <a href="#schedule">το πρόγραμμά σου</a>.</p></section>
    <section class="sheet dm-sec"><h3 class="pl-h">Οθόνες πριν τον ύπνο</h3>
      <p class="pnote">Πόση ώρα πριν τον ύπνο κλείνεις κινητό, τάμπλετ και υπολογιστή.</p>
      ${pick("screens", [[30, "30΄"], [45, "45΄"], [60, "1 ώρα"]], o.screens, "Οθόνες κλειστές πριν τον ύπνο")}
      <span class="dm-lab">Παιχνίδι και βίντεο (αν θέλεις στόχο)</span>${pick("screenGoal", [[0, "Χωρίς"], [60, "1 ώρα"], [90, "1½"], [120, "2 ώρες"]], o.screenGoal, "Στόχος για παιχνίδι και βίντεο")}
      <p class="pnote">Η σελίδα δεν μετράει πόση ώρα είσαι στην οθόνη. Είναι μόνο ένας στόχος που βάζεις εσύ.</p></section>
    <section class="sheet dm-sec"><h3 class="pl-h">Ελεύθερος χρόνος</h3>
      ${pick("free", [[60, "1 ώρα"], [90, "1½ ώρα"], [120, "2 ώρες"]], o.free, "Στόχος ελεύθερου χρόνου")}</section>
    <h3 class="pl-h">Δραστηριότητες έξω από το σχολείο</h3>
    ${acts ? `<ul class="pl-list">${acts}</ul>` : `<p class="pnote">Ακόμα καμία. Πρόσθεσε π.χ. προπόνηση, φροντιστήριο ή ένα πάρτι.</p>`}
    ${form}
    <p class="pnote center">Όλα μένουν μόνο σε αυτή τη συσκευή.</p>`;
  const set = (k, v) => { const n = loadDay(); n[k] = v; saveDay(n); renderDaySettings(); };
  el.querySelectorAll("[data-dm-set]").forEach(b => b.onclick = () => set(b.dataset.dmSet, +b.dataset.v));
  const time = (id, k, ok = () => true) => { const i = $(id, el); if(i) i.onchange = () => { if(tMin(i.value) !== null && ok(i.value)) set(k, i.value); }; };
  time("#dm-wake", "wake");
  time("#dm-s1", "schoolStart", v => tMin(v) < tMin(loadDay().schoolEnd));
  time("#dm-s2", "schoolEnd", v => tMin(v) > tMin(loadDay().schoolStart));
  el.querySelectorAll("[data-dm-del]").forEach(b => b.onclick = () => { const n = loadDay(); n.acts.splice(+b.dataset.dmDel, 1); saveDay(n); renderDaySettings(); });
  el.querySelectorAll("[data-dm-add]").forEach(b => b.onclick = () => { Object.assign(DAY_FORM, { open:true, kind:"week", days:[], msg:"" }); renderDaySettings(); $("#dm-name").focus(); });
  el.querySelectorAll("[data-dm-cancel]").forEach(b => b.onclick = () => { DAY_FORM.open = false; renderDaySettings(); });
  el.querySelectorAll("[data-dm-kind]").forEach(b => b.onclick = () => { const name = $("#dm-name").value; DAY_FORM.kind = b.dataset.dmKind; DAY_FORM.msg = ""; renderDaySettings(); $("#dm-name").value = name; });
  const fm = $("#dm-form", el);
  if(fm) fm.onsubmit = e => {
    e.preventDefault();
    const name = $("#dm-name").value.trim().slice(0, 40), from = $("#dm-from").value, to = $("#dm-to").value;
    const a = { name, kind:DAY_FORM.kind, from, to };
    if(a.kind === "week") a.days = [...fm.querySelectorAll(".dm-days input:checked")].map(i => +i.value);
    else a.date = $("#dm-date").value;
    const msg = !name ? "Γράψε τι είναι." : tMin(from) === null || !(tMin(to) > tMin(from)) ? "Η ώρα που τελειώνει πρέπει να είναι μετά την ώρα που αρχίζει." : a.kind === "week" && !a.days.length ? "Διάλεξε τουλάχιστον μία μέρα." : a.kind === "once" && !/^\d{4}-\d\d-\d\d$/.test(a.date) ? "Διάλεξε μέρα." : "";
    if(msg){ DAY_FORM.msg = msg; DAY_FORM.days = a.days || []; renderDaySettings(); $("#dm-name").value = name; $("#dm-from").value = from; $("#dm-to").value = to; return; }
    const n = loadDay(), today = ymd(new Date());
    n.acts = n.acts.filter(x => x.kind === "week" || x.date >= today);
    n.acts.push(a); saveDay(n); DAY_FORM.open = false; renderDaySettings();
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
      ${c.keys.map(k => { const on = sel.has(k), pr = cardProgress(k); return `<label class="pl-unit${on ? " on" : ""}"><input type="checkbox" data-pk="${k}"${on ? " checked" : ""}><span class="pl-ut">${unitLabel(k)}</span>${k === sug && !pr.seen && scoreOf(k) === null ? `<span class="pl-sug">Πρόταση</span>` : ""}${scoreOf(k) !== null || pr.seen ? unitRing(k, 28) : ""}</label>`; }).join("")}
    </details>`).join("")}
    <div class="pl-actions">${test ? prepBtn + studyBtn : studyBtn + prepBtn}<button class="btn ghost" data-pl-mock${n ? "" : " disabled"}>Δοκιμαστικό διαγώνισμα</button><p class="pnote center" id="pl-count">${n ? "" : "Διάλεξε τουλάχιστον μία ενότητα."}</p></div>`;
  el.querySelectorAll("[data-pk]").forEach(x => x.onchange = () => {
    x.checked ? sel.add(x.dataset.pk) : sel.delete(x.dataset.pk);
    x.closest(".pl-unit").classList.toggle("on", x.checked);
    const m = sel.size, sb = $("[data-pl-study]", el), pb = $("[data-pl-prep]", el);
    sb.disabled = pb.disabled = $("[data-pl-mock]", el).disabled = !m;
    sb.textContent = m > 1 ? `Διάβασμα για αύριο (${m} ενότητες)` : "Διάβασμα για αύριο";
    $("#pl-count", el).textContent = m ? "" : "Διάλεξε τουλάχιστον μία ενότητα.";
  });
  const chosen = () => keys.filter(k => sel.has(k));
  $("[data-pl-study]", el).onclick = () => { PL.queue = chosen(); if(PL.queue.length) location.hash = "#study/" + PL.queue[0]; };
  $("[data-pl-prep]", el).onclick = () => { if(chosen().length){ PL.prep = null; location.hash = "#prep/" + sid; } };
  $("[data-pl-mock]", el).onclick = () => { if(chosen().length){ PL.mock = null; location.hash = "#mock/" + sid; } };
}

/* Η ενότητα ως κάρτες (#study/<κλειδί>): κάθε θέμα της περίληψης είναι μία ιδέα με τα δικά της μέρη.
   Η ιδέα (t), Στη ζωή (ex και more), Στο σχήμα (fig), Δοκίμασε (οι λυμένες με "topic" σε αυτή την κάρτα),
   Το κατάλαβες; (οι ερωτήσεις με "topic"), Για το διαγώνισμα (def). Μια κάρτα δείχνει μόνο τα μέρη που έχει.
   Όταν μια ερώτηση βγει λάθος, το «Πες το μου αλλιώς» (alt) δίνει άλλη ματιά, το συχνό λάθος και μια νέα ερώτηση.
   Λυμένες και ερωτήσεις χωρίς "topic" μπαίνουν σε μια τελευταία κάρτα «Όλη η ενότητα».
   Κατάσταση ανά κάρτα (diab-cards): 1 = το κατάλαβες, 2 = θέλει μια ματιά ακόμα. */
const PART_NAME = {idea:"Η ιδέα", life:"Στη ζωή", fig:"Στο σχήμα", try:"Δοκίμασε", check:"Το κατάλαβες;", def:"Για το διαγώνισμα", voc:"Λέξεις"};
const deckCache = {};
function deckOf(key){
  if(deckCache[key]) return deckCache[key];
  const u = unitData(key), n = u.summary.length, has = x => Number.isInteger(x.topic) && x.topic >= 0 && x.topic < n;
  const byLvl = list => list.sort((a, b) => u.ex[a].lvl - u.ex[b].lvl || a - b);
  const cards = u.summary.map((b, i) => {
    const ex = byLvl(u.ex.map((e, j) => j).filter(j => has(u.ex[j]) && u.ex[j].topic === i)), qs = u.quiz.map((q, j) => j).filter(j => has(u.quiz[j]) && u.quiz[j].topic === i);
    const parts = ["idea", (b.ex || b.more?.length) && "life", b.fig && "fig", ex.length && "try", qs.length && "check", b.def && "def"].filter(Boolean);
    return {b, ex, qs, parts};
  });
  if(u.vocab?.length) cards.push({voc:true, ex:[], qs:[], parts:["voc"]});
  const ex = byLvl(u.ex.map((e, j) => j).filter(j => !has(u.ex[j]))), qs = u.quiz.map((q, j) => j).filter(j => !has(u.quiz[j]));
  if(ex.length || qs.length) cards.push({all:true, ex, qs, parts:[ex.length && "try", qs.length && "check"].filter(Boolean)});
  return deckCache[key] = cards;
}
/* «Κόλπο για να θυμάσαι»: τα έτοιμα κόλπα της κάρτας (hooks) και όσα γράφει ο μαθητής. Καρφιτσώνει όσα τον βοηθούν.
   Μένουν μόνο σε αυτή τη συσκευή (diab-hooks), ανά ενότητα και τίτλο κάρτας: { pin:[θέσεις έτοιμων], own:[{t, pin}] }. */
const PIN_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l-1 6 3 3v2h-4v6l-1 1-1-1v-6H7v-2l3-3z"/></svg>`;
const hookSaved = (key, h) => (store.get("diab-hooks", {})[key] || {})[h] || { pin:[], own:[] };
function saveHooks(key, h, v){
  const all = store.get("diab-hooks", {}), u = all[key] || (all[key] = {});
  if(v.pin.length || v.own.length) u[h] = v; else delete u[h];
  if(!Object.keys(u).length) delete all[key];
  store.set("diab-hooks", all);
}
function hookList(key, b){
  const v = hookSaved(key, b.h);
  const list = [...(b.hooks || []).map((t, j) => ({t, id:"b" + j, pin:v.pin.includes(j)})), ...v.own.map((o, j) => ({t:esc(o.t), own:true, id:"o" + j, pin:!!o.pin}))];
  return [...list.filter(x => x.pin), ...list.filter(x => !x.pin)];
}
const cardTitle = (key, c) => c.b ? (C[key] ? c.b.h : esc(c.b.h)) : c.voc ? "Λέξεις" : "Όλη η ενότητα";
const cardMarks = key => store.get("diab-cards", {})[key] || {};
function markCard(key, i, v){ const all = store.get("diab-cards", {}), m = all[key] || (all[key] = {}); if(m[i] !== v){ m[i] = v; store.set("diab-cards", all); } }
function cardProgress(key){ const m = cardMarks(key), n = deckOf(key).length; return { n, ok:Object.keys(m).filter(i => i < n && m[i] === 1).length, seen:Object.keys(m).filter(i => i < n).length }; }
/* Η κατάσταση της ενότητας σε αυτή την επίσκεψη: μέρος ανά κάρτα, παραδείγματα και βοήθειες που άνοιξαν, απαντήσεις */
const unitState = key => PL.u[key] || (PL.u[key] = { part:{}, life:{}, ti:{}, hints:{}, ans:{}, quiz:{}, alt:{}, review:null, anim:"" });

function renderStudy(key, parts){
  if(ALIAS[key]){ location.replace("#study/" + ALIAS[key]); return; }
  const u = unitData(key);
  if(!u || !u.quiz?.length || !SHOWN_GRADES.includes(key[0])){ location.replace("#tomorrow"); return; }
  const sid = key.split("/")[1], last = store.get("diab-last-unit", {});
  if(last[sid] !== key){ last[sid] = key; store.set("diab-last-unit", last); }
  noteDay(key);
  const n = deckOf(key).length;
  if(parts[0] === "c" && +parts[1] >= 0 && +parts[1] < n) cardView(key, +parts[1]);
  else if(parts[0] === "end") unitEnd(key);
  else if(parts.length) location.replace("#study/" + key);
  else unitFeed(key);
}

/* Η ενότητα ως feed: οι κάρτες σε πλακίδια. Πάτημα = η κάρτα σε όλη την οθόνη. */
function unitFeed(key){
  const el = $("#plan"), sid = key.split("/")[1], deck = deckOf(key), m = cardMarks(key), p = cardProgress(key), s = unitState(key);
  s.review = null;
  const now = deck.findIndex((c, i) => m[i] !== 1), T = t => unitText(key, t);
  const meta = c => [c.parts.includes("fig") && "Σχήμα", c.ex.length && (c.ex.length === 1 ? "1 άσκηση" : c.ex.length + " ασκήσεις"), c.qs.length && (c.qs.length === 1 ? "1 ερώτηση" : c.qs.length + " ερωτήσεις")].filter(Boolean).join(" · ");
  el.innerHTML = `<a class="back" href="${unitsOf(sid).length ? "#plan/" + sid : "#tomorrow"}">← ${unitName(key)}</a>
    <div class="pl-title"><span class="ref">${unitName(key)}${unitNum(key) ? " · " + unitNum(key).replace(" · ", "") : ""}</span><h2 class="ct">${unitTitle(key)}</h2></div>
    ${unitStatus(key, p)}
    <div class="fd-prog"><div class="bar" role="img" aria-label="${p.ok} από ${p.n} κάρτες"><i style="width:${Math.round(p.ok / p.n * 100)}%"></i></div><span>${p.ok} από ${p.n} τα κατάλαβες</span></div>
    <div class="fd-grid">${deck.map((c, i) => {
      const st = m[i] === 1 ? `<span class="fd-st ok" aria-label="Το κατάλαβες">✓</span>` : m[i] === 2 ? `<span class="fd-st again" aria-label="Θέλει μια ματιά ακόμα">↻</span>` : "";
      const teaser = c.b ? (c.b.f ? `<span class="fd-f">${c.b.f}</span>` : `<span class="fd-t">${C[key] ? strip(c.b.t) : esc(c.b.t)}</span>`) : `<span class="fd-t">${c.voc ? "Οι λέξεις της ενότητας" : "Ασκήσεις και ερωτήσεις από όλη την ενότητα"}</span>`;
      return `<a class="fd-tile${i === now ? " now" : ""}${c.b && c.b.warn ? " warn" : ""}" href="#study/${key}/c/${i}"><span class="fd-h"><span class="fd-n">${i + 1}${i === now ? " · Εδώ είσαι" : c.b && c.b.warn ? " · Προσοχή" : ""}</span>${st}</span>${teaser}<b>${cardTitle(key, c)}</b>${meta(c) ? `<small>${meta(c)}</small>` : ""}</a>`;
    }).join("")}<a class="fd-tile fd-end" href="#study/${key}/end"><span class="fd-h"><span class="fd-n">Τέλος</span></span><b>Τι κατάλαβα και τι θέλει μια ματιά ακόμα</b></a></div>
    <a class="btn" href="#study/${key}/c/${now < 0 ? 0 : now}">${now < 0 ? "Ξανά από την αρχή" : now === 0 && !p.seen ? "Ξεκίνα" : `Συνέχισε από την κάρτα ${now + 1}`}</a>
    ${bookButton(key)}
    <p class="pnote center">Πάτα μια κάρτα για να ανοίξει σε όλη την οθόνη. <a href="${unitHref(key)}">Όλη η ενότητα σε μία σελίδα</a></p>`;
  bindBookButton(el, key);
  bindUnitStatus(el, key);
  PL.fromFeed = key;
}

/* «Ασκήσεις του βιβλίου»: ανοίγει την καρτέλα «Βιβλίο» στη σελίδα της ενότητας. Εκεί ο μαθητής διαβάζει
   την εκφώνηση στο βιβλίο και παίρνει βοήθειες μία μία. Στις κάρτες δεν μπαίνουν, γιατί δεν έχουμε την εκφώνηση. */
function bookButton(key){
  const items = BOOK_HELP[key] || [];
  return items.length ? `<button class="btn ghost" data-fd-book>${bookHelpTitle(items)} (${items.length}) με βοήθειες</button>` : "";
}
function bindBookButton(el, key){
  const b = $("[data-fd-book]", el);
  if(b) b.onclick = () => {
    if(C[key]) Object.assign(st(key), { view:"book", fromBook:null });
    else officialState[key] = Object.assign(officialState[key] || { view:"sum", card:0, gi:0, vi:0, picked:{}, done:false, open:new Set() }, { view:"book", fromBook:null });
    location.hash = unitHref(key);
  };
}
/* Μία κάρτα σε όλη την οθόνη. ← → τα μέρη της, ↑ ↓ η επόμενη ή η προηγούμενη κάρτα. */
function cardView(key, i){
  const el = $("#plan"), deck = deckOf(key), c = deck[i], s = unitState(key), u = unitData(key), T = t => unitText(key, t), H = t => C[key] ? t : esc(t);
  const parts = c.parts, alt = s.alt[i] && s.alt[i].open, pi = Math.min(s.part[i] || 0, parts.length - 1), part = alt ? "alt" : parts[pi], last = pi === parts.length - 1;
  const order = s.review || deck.map((x, j) => j), at = order.indexOf(i), nextCard = order[at + 1], prevCard = at > 0 ? order[at - 1] : null;
  if(!alt && last && !c.qs.length && !cardMarks(key)[i]) markCard(key, i, 1);
  let body = "", sec = "", prim = "";
  const nextLabel = nextCard !== undefined ? "Επόμενη κάρτα ↑" : "Τέλος ενότητας ↑";
  if(part === "idea"){
    const b = c.b;
    body = `<span class="fc-k k-idea${b.warn ? " warn" : ""}">${b.warn ? "Προσοχή" : PART_NAME.idea}</span><h2>${H(b.h)}</h2>${b.quote ? `<p class="quote" lang="grc">${b.quote}</p>` : ""}<p class="fc-big">${T(b.t)}</p>${b.f ? `<p class="f formula">${b.f}</p>` : ""}`;
  } else if(part === "life"){
    const list = [c.b.ex, ...(c.b.more || [])].filter(Boolean), shown = Math.min((s.life[i] || 0) + 1, list.length);
    body = `<span class="fc-k k-life">${PART_NAME.life}${list.length > 1 ? ` · ${shown} από ${list.length}` : ""}</span><h2>${H(c.b.h)}</h2>${list.slice(0, shown).map((t, j) => `<div class="box exb fc-ex${j === shown - 1 && j ? " fc-new" : ""}"><b>Παράδειγμα${list.length > 1 ? " " + (j + 1) : ""}</b><p>${T(t)}</p></div>`).join("")}`;
    if(shown < list.length) sec = `<button class="fc-sec" data-fc="more">Κι άλλο παράδειγμα</button>`;
  } else if(part === "fig"){
    body = `<span class="fc-k k-fig">${PART_NAME.fig}</span><h2>${H(c.b.h)}</h2>${figure(c.b.fig)}`;
  } else if(part === "try"){
    const k = Math.min(s.ti[i] || 0, c.ex.length - 1), e = u.ex[c.ex[k]], id = i + "/" + k, shown = s.hints[id] || 0, ans = s.ans[id], left = e.steps.length - shown;
    body = `<span class="fc-k k-try">${PART_NAME.try}${c.ex.length > 1 ? ` · ${k + 1} από ${c.ex.length}` : ""}</span><span class="lvl l${e.lvl}">${LEVELS[e.lvl]}</span>
      <p class="fc-q">${e.h && !C[key] ? `<b>${esc(e.h)}${/[;:;?.!]$/.test(e.h) ? "" : ":"}</b> ` : ""}${T(e.q)}</p>
      <p class="pl-think">Λύσε την στο τετράδιο. Αν κολλήσεις, πάρε μια βοήθεια.</p>
      ${shown ? `<ol class="pl-sol">${e.steps.slice(0, shown).map(x => `<li>${T(x)}</li>`).join("")}</ol>` : ""}
      ${left && !ans ? `<button class="btn ghost" data-fc="hint">${shown ? "Κι άλλη βοήθεια" : "Χρειάζομαι βοήθεια"} (${left} ακόμη)</button>` : ""}
      ${ans ? `<p class="ans">Απάντηση: <span>${T(e.ans)}</span></p>` : `<button class="btn ghost" data-fc="ans">Έλεγξε την απάντησή σου</button>`}`;
    if(k < c.ex.length - 1) sec = `<button class="fc-sec" data-fc="nextex">Άλλη μία άσκηση</button>`;
  } else if(part === "check"){
    const z = s.quiz[i] || (s.quiz[i] = Object.assign(newQuiz(c.qs.map(oi => ({key, oi})), "card"), {wrong:0})), q = z.qs[z.qi], p = z.picked[z.qi], has = p !== undefined;
    const done = Object.keys(z.picked).length === z.qs.length, a = c.b && c.b.alt;
    body = `<span class="fc-k k-check">${PART_NAME.check}${z.qs.length > 1 ? ` · ${z.qi + 1} από ${z.qs.length}` : ""}</span><h2 class="fc-qh">${rich(q.q)}</h2>
      ${q.opts.map((o, j) => `<button class="opt${!has ? "" : o.ok ? " right" + (j === p ? " picked" : "") : j === p ? " wrong picked" : " dim"}" data-fc-opt="${j}"${has ? " disabled" : ""}><span class="l" aria-hidden="true">${has && o.ok ? "✓" : has && j === p ? "✕" : LETTERS[j]}</span><span>${plain(o.t)}</span></button>`).join("")}
      <div aria-live="polite">${has ? `<div class="why">${q.opts[p].ok ? `<b class="y">Σωστά</b>` : `<b class="n">Όχι ακριβώς</b>`}${rich(q.why)}</div>` : ""}</div>
      ${done ? `<p class="fc-verdict">${z.wrong ? (cardMarks(key)[i] === 1 ? "Με τη δεύτερη ματιά το βρήκες!" : `Δεν πειράζει. Αυτή η κάρτα θα ξανάρθει στο τέλος.${a && !s.alt[i] ? " Ή δες το τώρα αλλιώς." : ""}`) : "Τα βρήκες όλα!"}</p>` : ""}`;
    if(has && !q.opts[p].ok && a && !s.alt[i]) prim = `<button class="btn" data-fc="alt">Πες το μου αλλιώς</button>`;
    if(has && z.qi < z.qs.length - 1){ const b = `<button class="${prim ? "fc-sec plain" : "btn"}" data-fc="nextq">Επόμενη ερώτηση</button>`; if(prim) sec = b; else prim = b; }
    else if(!has) prim = `<span class="fc-wait">Διάλεξε μια απάντηση</span>`;
    else if(prim) sec = `<button class="fc-sec plain" data-fc="${last ? "down" : "right"}">${last ? "Επόμενη κάρτα" : PART_NAME[parts[pi + 1]]}</button>`;
  } else if(part === "def"){
    const hooks = hookList(key, c.b), edit = s.hookEdit === i;
    body = `<span class="fc-k k-def">${PART_NAME.def}</span><h2>${H(c.b.h)}</h2><div class="box defb"><b>${esc(c.b.defLabel || "Στο διαγώνισμα γράφεις")}</b><p class="fc-big">${T(c.b.def)}</p></div>
      ${c.b.check ? `<div class="fc-teach"><span class="fc-k k-teach">Ρώτα τον καθηγητή</span><p>${T(c.b.check)}</p></div>` : ""}
      <div class="fc-hooks"><span class="fc-k k-hook">Κόλπο για να θυμάσαι</span>
      ${hooks.map(x => `<div class="hook${x.pin ? " pinned" : ""}"><p>${x.own ? x.t : T(x.t)}${x.own ? ` <small>δικό σου</small>` : ""}</p><button class="hook-b" data-hook-pin="${x.id}" aria-pressed="${x.pin}" aria-label="${x.pin ? "Ξεκαρφίτσωσε" : "Καρφίτσωσε"} αυτό το κόλπο">${PIN_SVG}</button>${x.own ? `<button class="hook-b del" data-hook-del="${x.id}" aria-label="Σβήσε το κόλπο σου">✕</button>` : ""}</div>`).join("")}
      ${edit ? `<form class="hook-form" data-hook-form><label for="hook-new">Το δικό σου κόλπο</label><textarea id="hook-new" maxlength="200" rows="2" placeholder="Πώς το θυμάσαι εσύ;"></textarea><div class="hook-row"><button class="btn" type="submit">Αποθήκευση</button><button class="fc-sec plain" type="button" data-hook-cancel>Άκυρο</button></div></form>` : `<button class="hook-add" data-hook-add>+ ${hooks.length ? "Πρόσθεσε δικό σου" : "Έχεις δικό σου τρόπο να το θυμάσαι; Γράψ' τον"}</button>`}
      ${hooks.length ? `<p class="hook-note">Καρφίτσωσε όσα σε βοηθούν: μπαίνουν πρώτα και στο τέλος της ενότητας. Μένουν μόνο σε αυτή τη συσκευή.</p>` : ""}</div>`;
  } else if(part === "voc"){
    body = `<span class="fc-k k-life">${PART_NAME.voc}</span><h2>Οι λέξεις της ενότητας</h2><dl class="fc-voc">${u.vocab.map(v => `<div><dt${C[key] ? ' lang="grc"' : ""}>${H(v[0])}</dt><dd>${H(v[1])}${v[2] ? `<small>${H(v[2])}</small>` : ""}</dd></div>`).join("")}</dl>`;
  } else if(part === "alt"){
    const a = c.b.alt, st = s.alt[i], f = C[key] ? t => t : esc;
    const aq = a.q && (st.q || (st.q = {opts:shuffle([{t:f(a.q.c), ok:true}, ...a.q.w.map(t => ({t:f(t), ok:false}))])})), p = st.picked, has = p !== undefined;
    body = `<span class="fc-k k-alt">Ας το πούμε αλλιώς</span><h2>${H(c.b.h)}</h2>
      <div class="box fc-altb"><b>Μια άλλη ματιά</b><p>${T(a.t)}</p></div>
      ${a.mistake ? `<div class="box fc-mist"><b>Το συχνό λάθος</b><p>${T(a.mistake)}</p></div>` : ""}
      ${aq ? `<div class="fc-again"><span class="fc-k k-check">Δοκίμασε ξανά</span><h3 class="fc-qh">${T(a.q.q)}</h3>${aq.opts.map((o, j) => `<button class="opt${!has ? "" : o.ok ? " right" : j === p ? " wrong picked" : " dim"}" data-fc-aopt="${j}"${has ? " disabled" : ""}><span class="l" aria-hidden="true">${has && o.ok ? "✓" : has && j === p ? "✕" : LETTERS[j]}</span><span>${plain(o.t)}</span></button>`).join("")}<div aria-live="polite">${has ? `<div class="why">${aq.opts[p].ok ? `<b class="y">Σωστά</b>` : `<b class="n">Όχι ακριβώς</b>`}${T(a.q.why)}</div>${aq.opts[p].ok ? "" : `<p class="fc-verdict">Δεν πειράζει. Αυτή η κάρτα θα ξανάρθει στο τέλος.</p>`}` : ""}</div></div>` : ""}`;
    prim = `<button class="btn" data-fc="back">Πίσω στην κάρτα</button>`;
  }
  if(!prim) prim = last ? `<button class="btn" data-fc="down">${nextLabel}</button>` : `<button class="btn" data-fc="right">${PART_NAME[parts[pi + 1]]} →</button>`;
  if(!sec && !alt && c.b && part !== "check" && part !== "def" && (c.b.alt || (c.b.more || []).length)) sec = `<button class="fc-sec" data-fc="lost">Δεν το κατάλαβα</button>`;
  const anim = CALM.matches ? "" : s.anim;
  s.anim = "";
  el.innerHTML = `<div class="fc" role="dialog" aria-modal="true" aria-label="${esc(strip(cardTitle(key, c)))}">
    <div class="pl-segs" style="--n:${parts.length}" role="img" aria-label="Μέρος ${pi + 1} από ${parts.length}">${parts.map((x, j) => `<span class="${j <= pi ? "on" : ""}"></span>`).join("")}</div>
    <div class="pl-bar"><h2 class="pl-where">Κάρτα ${i + 1} από ${deck.length}${s.review ? " · ξανά" : ""}</h2><span class="pl-tools"><button class="pl-round" data-pl-voice aria-label="Διάβασέ το μου φωναχτά"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg></button><button class="pl-round" data-fc="close" aria-label="Πίσω στις κάρτες"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></span></div>
    <section class="fc-body fc-read p-${part}${anim ? " " + anim : ""}"><div class="fc-in">${body}</div></section>
    <div class="fc-actions">${sec}${prim}</div>
    <p class="fc-hint">← → τα μέρη της κάρτας · ↑ η επόμενη κάρτα</p>
    <div class="fc-rotate" aria-hidden="true"><p><span>📱</span>Γύρισε το κινητό όρθιο για να διαβάσεις την κάρτα.</p></div>
  </div>`;

  const pgKey = i + ":" + part, pg = s.pg || (s.pg = {});
  const go = (d, a = d > 0 ? "in-next" : "in-prev") => {
    const f = PL.fit, p = pg[pgKey] || 0;
    if(f && f.pages > 1 && p + d >= 0 && p + d < f.pages){ pg[pgKey] = p + d; s.anim = a; cardView(key, i); return true; }
    const j = pi + d; if(alt || j < 0 || j >= parts.length) return false;
    s.part[i] = j; s.anim = a; pg[i + ":" + parts[j]] = d > 0 ? 0 : 99; cardView(key, i); return true;
  };
  const card = d => {
    const j = d > 0 ? nextCard : prevCard;
    if(d > 0 && j === undefined){ location.replace("#study/" + key + "/end"); return true; }
    if(j === null || j === undefined) return false;
    s.anim = d > 0 ? "in-up" : "in-down";
    if(s.alt[i]) s.alt[i].open = false;
    location.replace("#study/" + key + "/c/" + j);
    return true;
  };
  PL.fc = { go, card };
  keyNav = go;
  const act = {
    right:() => go(1), down:() => card(1),
    more:() => { s.life[i] = (s.life[i] || 0) + 1; cardView(key, i); fcReveal(".fc-new"); },
    nextex:() => { s.ti[i] = (s.ti[i] || 0) + 1; s.anim = "in-next"; cardView(key, i); },
    hint:() => { const id = i + "/" + Math.min(s.ti[i] || 0, c.ex.length - 1); s.hints[id] = (s.hints[id] || 0) + 1; cardView(key, i); fcReveal(".pl-sol li:last-child"); },
    ans:() => { s.ans[i + "/" + Math.min(s.ti[i] || 0, c.ex.length - 1)] = 1; cardView(key, i); fcReveal(".ans"); },
    nextq:() => { s.quiz[i].qi++; s.anim = "in-next"; cardView(key, i); },
    alt:() => { s.alt[i] = { open:true }; s.anim = "in-next"; cardView(key, i); },
    back:() => { s.alt[i].open = false; s.anim = "in-prev"; cardView(key, i); },
    /* «Δεν το κατάλαβα»: η άλλη ματιά, αν υπάρχει· αλλιώς ένα ακόμα παράδειγμα */
    lost:() => {
      if(c.b.alt){ s.alt[i] = Object.assign(s.alt[i] || {}, { open:true }); s.anim = "in-next"; cardView(key, i); return; }
      s.life[i] = (s.life[i] || 0) + 1; s.part[i] = parts.indexOf("life"); s.anim = "in-next"; cardView(key, i);
    },
    close:() => { if(PL.fromFeed === key) history.back(); else location.replace("#study/" + key); }
  };
  el.querySelectorAll("[data-fc]").forEach(b => b.onclick = () => act[b.dataset.fc]());
  el.querySelectorAll("[data-pl-voice]").forEach(b => b.onclick = () => $("#app-voice").click());
  el.querySelectorAll("[data-fc-opt]").forEach(b => b.onclick = () => {
    const z = s.quiz[i], q = z.qs[z.qi], j = +b.dataset.fcOpt, ok = q.opts[j].ok;
    z.picked[z.qi] = j; markAnswer(q.key, q.oi, ok);
    if(!ok){ z.wrong++; markCard(key, i, 2); }
    else if(Object.keys(z.picked).length === z.qs.length && !z.wrong) markCard(key, i, 1);
    if(c.all && Object.keys(z.picked).length === z.qs.length) saveBest(key, gradeOf(z));
    try { navigator.vibrate && navigator.vibrate(ok ? 30 : [40, 60, 40]); } catch(e){}
    cardView(key, i);
    fcReveal(".why");
  });
  el.querySelectorAll("[data-fc-aopt]").forEach(b => b.onclick = () => {
    const st = s.alt[i], j = +b.dataset.fcAopt;
    st.picked = j; markCard(key, i, st.q.opts[j].ok ? 1 : 2);
    cardView(key, i);
    fcReveal(".fc-again .why");
  });
  if(part === "def"){
    const keep = () => { const b = $(".fc-body", el), top = b ? b.scrollTop : 0; cardView(key, i); const n = $(".fc-body", el); if(n) n.scrollTop = top; };
    const edit = fn => { const v = hookSaved(key, c.b.h); fn(v); saveHooks(key, c.b.h, v); keep(); };
    el.querySelectorAll("[data-hook-pin]").forEach(b => b.onclick = () => edit(v => {
      const id = b.dataset.hookPin, j = +id.slice(1);
      if(id[0] === "b") v.pin = v.pin.includes(j) ? v.pin.filter(x => x !== j) : [...v.pin, j];
      else if(v.own[j]) v.own[j].pin = !v.own[j].pin;
    }));
    el.querySelectorAll("[data-hook-del]").forEach(b => b.onclick = () => edit(v => { v.own.splice(+b.dataset.hookDel.slice(1), 1); }));
    const add = $("[data-hook-add]", el); if(add) add.onclick = () => { s.hookEdit = i; keep(); fcReveal("#hook-new"); const t = $("#hook-new", el); if(t) t.focus(); };
    const cancel = $("[data-hook-cancel]", el); if(cancel) cancel.onclick = () => { s.hookEdit = null; keep(); };
    const form = $("[data-hook-form]", el); if(form) form.onsubmit = e => {
      e.preventDefault();
      const t = $("#hook-new", el).value.replace(/\s+/g, " ").trim().slice(0, 200);
      s.hookEdit = null;
      if(t) edit(v => { v.own.push({t, pin:true}); }); else keep();
    };
  }
  if(c.b && c.b.fig) el.querySelectorAll(".fig").forEach(f => f.classList.add("fc-fig"));
  el.querySelectorAll(".fc .fig-map").forEach(f => { f.tabIndex = 0; f.setAttribute("role", "button"); f.setAttribute("aria-label", "Άνοιξε τον χάρτη σε όλη την οθόνη"); f.onclick = () => mapFull(f); f.onkeydown = e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); mapFull(f); } }; });
  bindCardGestures($(".fc", el));
  PL.fcRedraw = () => cardView(key, i);
  PL.fcPage = j => { pg[pgKey] = j; cardView(key, i); };
  PL.fit = fitCard(el, pg, pgKey, !["check", "alt"].includes(part));
  if(PL.fit && PL.fit.page < PL.fit.pages - 1){
    const b = $(".fc-actions .btn", el);
    if(b){ b.textContent = "Συνέχεια →"; b.dataset.fc = "right"; b.onclick = () => go(1); }
  }
}
/* Η κάρτα χωράει στην οθόνη, χωρίς κύλιση μέσα της. Πρώτα λίγο μικρότερα γράμματα (ως 88%). Αν πάλι δεν χωράει,
   χωρίζεται σε σελίδες σε όρια παραγράφων ή κουτιών (και οι μεγάλες παράγραφοι σε όρια προτάσεων), με «1/2» πάνω δεξιά.
   Οι ερωτήσεις (Το κατάλαβες;) δεν χωρίζονται· στο «Δοκίμασε» η εκφώνηση μπορεί να πάει στη μία σελίδα και οι βοήθειες στην άλλη. Μόνο αν κάτι δεν χωράει ούτε μόνο του
   (π.χ. πολύ μεγάλα γράμματα στον browser, οριζόντιο κινητό) η κάρτα κυλάει. Χωρίς διάταξη (π.χ. στα tests) δεν κάνει τίποτα. */
function fitCard(el, pg, pgKey, canSplit){
  const body = $(".fc-body", el), inn = $(".fc-in", el);
  if(!body || !inn || !body.clientHeight || !inn.getBoundingClientRect().height) return null;
  const cs = getComputedStyle(body), pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const room = () => body.getBoundingClientRect().height - pad - 2, tall = () => inn.getBoundingClientRect().height > room();
  for(const z of [1, .94, .88]){ inn.style.zoom = z; if(!tall()) return {pages:1, page:0}; }
  const scroll = () => { inn.style.zoom = .88; [...inn.children].forEach(k => k.hidden = false); body.classList.add("fc-scroll"); textNote(el); return {pages:1, page:0, scroll:true}; };
  if(!canSplit) return scroll();
  inn.style.zoom = .94;
  const cont = 30, top0 = () => inn.getBoundingClientRect().top;
  /* Ό,τι δεν χωράει σε μία σελίδα κόβεται σε μικρότερα κομμάτια: οι παράγραφοι σε προτάσεις (ή σε κόμματα),
     τα κουτιά σε δύο κουτιά, οι λίστες (λέξεις, κόλπα) ανά στοιχείο */
  const lim = room() - cont;
  for(let pass = 0; pass < 4; pass++){
    let changed = false;
    [...inn.children].forEach(k => {
      const r = k.getBoundingClientRect(), h = r.height, n = inn.children.length, at = r.top - top0();
      if(h <= lim && at + h <= room()) return;
      /* Το πρώτο κομμάτι γεμίζει όσο χώρο μένει κάτω από τον τίτλο· τα επόμενα μια ολόκληρη σελίδα */
      const first = at < room() - 60 ? room() - at : lim;
      if(at + h <= room() && h <= lim) return;
      if(k.tagName === "P") splitPara(k, lim, first);
      else if((k.classList.contains("box") || k.classList.contains("fc-teach")) && k.lastElementChild && k.lastElementChild.tagName === "P") splitBox(k, lim, first);
      else if(k.children.length > 1) splitList(k);
      if(inn.children.length > n) changed = true;
    });
    if(!changed) break;
  }
  const kids = [...inn.children].filter(k => !k.classList.contains("fc-pg")), pages = [[]];
  let start = 0;
  for(const k of kids){
    const r = k.getBoundingClientRect(), t = r.top - top0(), b = r.bottom - top0(), lim = room() - (pages.length > 1 ? cont : 0);
    if(r.height > room() - cont) return scroll();
    if(b - start > lim && pages[pages.length - 1].length){ pages.push([]); start = t; }
    pages[pages.length - 1].push(k);
  }
  /* Μια σελίδα μόνο με τον τίτλο δεν έχει νόημα: ο τίτλος πάει μαζί με την επόμενη */
  const head = k => k.classList.contains("fc-k") || k.classList.contains("lvl") || /^H[23]$/.test(k.tagName);
  if(pages.length > 1 && pages[0].every(head)) pages.splice(0, 2, [...pages[0], ...pages[1]]);
  /* Κομμάτια του ίδιου κειμένου που έπεσαν στην ίδια σελίδα ξαναγίνονται ένα (μία παράγραφος, ένα κουτί) */
  pages.forEach(list => { for(let j = list.length - 1; j > 0; j--){
    const k = list[j], prev = list[j - 1];
    if(!k.classList.contains("fc-more") || k.previousElementSibling !== prev) continue;
    if(k.tagName === "P" && prev.tagName === "P"){ prev.innerHTML += " " + k.innerHTML; k.remove(); list.splice(j, 1); }
    else if(k.lastElementChild && prev.lastElementChild && k.className.replace(" fc-more", "") === prev.className.replace(" fc-more", "")){ prev.lastElementChild.innerHTML += " " + k.lastElementChild.innerHTML; k.remove(); list.splice(j, 1); }
  } });
  if(pages.length === 1) return {pages:1, page:0};
  const p = Math.min(pg[pgKey] || 0, pages.length - 1);
  pg[pgKey] = p;
  pages.forEach((list, j) => list.forEach(k => k.hidden = j !== p));
  inn.insertAdjacentHTML("afterbegin", `<span class="fc-pg" aria-label="Σελίδα ${p + 1} από ${pages.length}">${p + 1}/${pages.length}</span>${p ? `<span class="fc-k fc-cont">συνέχεια</span>` : ""}`);
  textNote(el);
  return {pages:pages.length, page:p, list:pages};
}
/* Χωρίζει μια παράγραφο ώστε κάθε κομμάτι να χωράει (περίπου, με βάση το μήκος του κειμένου): γεμίζει κάθε κομμάτι όσο
   γίνεται και κόβει στο τέλος πρότασης ή, αν δεν υπάρχει μέσα στο όριο, σε κόμμα. Κόβει μόνο έξω από ετικέτες HTML.
   Ό,τι βγει ακόμα μεγάλο ξαναχωρίζεται στο επόμενο πέρασμα του fitCard. */
function splitPara(p, lim, first = lim){
  const h = p.innerHTML, per = h.length / p.getBoundingClientRect().height * .95, marks = [];
  let depth = 0, inTag = false;
  for(let j = 0; j < h.length - 1; j++){
    const ch = h[j];
    if(ch === "<"){ inTag = true; depth += h[j + 1] === "/" ? -1 : 1; }
    else if(ch === ">"){ inTag = false; if(h[j - 1] === "/" || /<(br|img|wbr|hr)\b[^>]*$/i.test(h.slice(Math.max(0, j - 40), j))) depth--; }
    else if(!inTag && depth <= 0 && (h[j + 1] === " " || h[j + 1] === "\u00a0" || h.startsWith("&nbsp;", j + 1)) && /[,.;·!;:]/.test(ch)) marks.push({j: j + 1, strong: !/[,:]/.test(ch)});
  }
  const cuts = []; let last = 0, cap = first * per;
  while(h.length - last > cap){
    const fit = marks.filter(m => m.j > last && m.j - last <= cap);
    const strong = fit.filter(m => m.strong && m.j - last >= cap * .4), pick = (strong.length ? strong : fit.length ? fit : marks.filter(m => m.j > last).slice(0, 1)).pop();
    if(!pick) break;
    cuts.push(pick.j); last = pick.j; cap = lim * per;
  }
  if(!cuts.length) return;
  const all = [0, ...cuts, h.length], chunks = all.slice(0, -1).map((x, j) => h.slice(x, all[j + 1]).trim()).filter(Boolean);
  p.insertAdjacentHTML("afterend", chunks.slice(1).map(c => `<p class="${p.className} fc-more">${c}</p>`).join(""));
  p.innerHTML = chunks[0];
}
/* Ένα κουτί (π.χ. «Στο διαγώνισμα γράφεις») που δεν χωράει: η παράγραφός του χωρίζεται και κάθε κομμάτι μπαίνει σε δικό του κουτί */
function splitBox(box, lim, first = lim){
  const p = box.lastElementChild, head = box.getBoundingClientRect().height - p.getBoundingClientRect().height;
  splitPara(p, lim - head, first - head);
  const more = []; let n = p.nextElementSibling;
  while(n && n.classList.contains("fc-more")){ more.push(n); n = n.nextElementSibling; }
  more.reverse().forEach(q => { const b = document.createElement("div"); b.className = box.className + " fc-more"; b.appendChild(q); box.after(b); });
}
/* Μια λίστα (λέξεις, κόλπα) που δεν χωράει: κάθε στοιχείο γίνεται δικό του κομμάτι, ώστε να μοιραστούν σε σελίδες */
function splitList(k){
  const items = [...k.children];
  items.slice(1).reverse().forEach(it => { const c = k.cloneNode(false); c.removeAttribute("id"); c.classList.add("fc-more"); c.appendChild(it); k.after(c); });
}
/* Μετά από μια κίνηση (βοήθεια, απάντηση, παράδειγμα), δείχνει τη σελίδα όπου βρίσκεται το νέο κομμάτι */
function fcReveal(sel){
  const e = $("#plan .fc-in " + sel), f = PL.fit;
  if(!e) return;
  if(f && f.list){
    const j = f.list.findIndex(list => list.some(k => k === e || k.contains(e)));
    const s = $("#plan .fc-body"); if(j >= 0 && j !== f.page && PL.fcPage){ PL.fcPage(j); return; }
    if(s && s.classList.contains("fc-scroll")) e.scrollIntoView({block:"nearest"});
  } else e.scrollIntoView({block:"nearest"});
}
/* Αν τα γράμματα του browser είναι μεγαλωμένα και η κάρτα δεν χωράει, ένα σημείωμα μία φορά (μένει μόνο στη συσκευή) */
function textNote(el){
  try { if(localStorage.getItem("diab-textnote")) return; } catch(e){ return; }
  if(!textEnlarged() || $(".fc-note", el)) return;
  const a = $(".fc-actions", el); if(!a) return;
  a.insertAdjacentHTML("beforebegin", `<p class="fc-note">Τα γράμματα στον browser σου είναι μεγαλωμένα, γι' αυτό κάποιες κάρτες δεν χωράνε στην οθόνη. Αν θέλεις, μίκρυνέ τα λίγο (στο Safari: αΑ → μικρότερο). <button type="button">Εντάξει</button></p>`);
  $(".fc-note button", el).onclick = () => { try { localStorage.setItem("diab-textnote", "1"); } catch(e){} $(".fc-note", el).remove(); if(PL.fcRedraw) PL.fcRedraw(); };
}
function textEnlarged(){
  if(!matchMedia("(pointer: coarse)").matches) return false;
  const sw = Math.min(screen.width, screen.height), portrait = innerHeight > innerWidth;
  if(portrait && sw && innerWidth && sw / innerWidth > 1.1) return true;   /* Safari: αΑ μεγαλύτερα = στενότερη σελίδα */
  const t = document.createElement("span");
  t.style.cssText = "position:absolute;visibility:hidden;font-size:20px;line-height:1;white-space:nowrap";
  t.textContent = "ΑΒΓ"; document.body.appendChild(t);
  const big = t.getBoundingClientRect().height > 23;                        /* Android: μεγέθυνση γραμμάτων στις ρυθμίσεις */
  t.remove();
  return big;
}
/* Ο χάρτης σε όλη την οθόνη· κλείνει με πάτημα, ✕ ή Esc */
function mapFull(f){
  const svg = $("svg", f); if(!svg) return;
  const d = document.createElement("div");
  d.className = "map-full"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-label", svg.getAttribute("aria-label") || "Χάρτης");
  d.innerHTML = `<button class="pl-round map-x" aria-label="Κλείσε τον χάρτη"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button><figure class="fig fig-map">${svg.outerHTML}${$(".map-legend", f) ? $(".map-legend", f).outerHTML : ""}</figure>`;
  const close = () => { d.remove(); document.removeEventListener("keydown", esc); f.focus(); };
  const esc = e => { if(e.key === "Escape") close(); };
  d.onclick = close; document.addEventListener("keydown", esc);
  document.body.appendChild(d); $(".map-x", d).focus();
}
/* Αν αλλάξει το μέγεθος της οθόνης (π.χ. κρύβεται η μπάρα του browser ή γυρίζει το κινητό), η κάρτα ξαναχωρίζεται */
let fitTimer = null;
window.addEventListener("resize", () => { clearTimeout(fitTimer); fitTimer = setTimeout(() => { if(PL.fcRedraw && $("#plan .fc") && !$("#plan").hidden) PL.fcRedraw(); }, 200); });
/* Η «Περίληψη» στη σελίδα της ενότητας: τα θέματα ως λίστα που ανοίγει τις ίδιες κάρτες σε όλη την οθόνη.
   Το ✕ και το «πίσω» του κινητού γυρίζουν στη σελίδα της ενότητας, στο ίδιο σημείο (st.retY). */
function cardLauncher(key, titles, next){
  return `<div class="sum-launch"><p class="pnote">${titles.length} κάρτες. Η καθεμιά χωράει στην οθόνη: σύρε δεξιά-αριστερά για τα μέρη της, πάνω για την επόμενη κάρτα.</p>
    <a class="btn" href="#study/${key}/c/0" data-cards-from="0">Ξεκίνα τις κάρτες</a>
    <div class="sum-list">${titles.map((t, i) => `<a class="fd-row" href="#study/${key}/c/${i}" data-cards-from="${i}"><span class="fd-num">${i + 1}</span><span class="pl-t"><b>${t}</b></span><span aria-hidden="true">›</span></a>`).join("")}</div>${next || ""}</div>`;
}
function bindCardLauncher(el, key, st){
  el.querySelectorAll("[data-cards-from]").forEach(a => a.onclick = e => { e.preventDefault(); openCardsFrom(key, +a.dataset.cardsFrom, st); });
}
function openCardsFrom(key, t, st){
  st.retY = window.scrollY; PL.fromFeed = key;
  location.hash = "#study/" + key + "/c/" + (t || 0);
}
function restoreScroll(st){
  if(st && st.retY != null){ const y = st.retY; st.retY = null; requestAnimationFrame(() => window.scrollTo(0, y)); }
}
/* Σύρσιμο στην κάρτα: οριζόντια τα μέρη, κάθετα οι κάρτες. Το κάθετο σύρσιμο αλλάζει κάρτα μόνο
   όταν το κείμενο της κάρτας έχει φτάσει στο τέλος (ή στην αρχή), αλλιώς απλώς κυλάει το κείμενο. */
function bindCardGestures(fc){
  const body = $(".fc-body", fc);
  let x0 = null, y0 = 0, atTop = true, atEnd = true;
  fc.addEventListener("touchstart", e => {
    if(e.touches.length !== 1){ x0 = null; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    atTop = body.scrollTop <= 2; atEnd = body.scrollTop + body.clientHeight >= body.scrollHeight - 2;
  }, {passive:true});
  fc.addEventListener("touchend", e => {
    if(x0 === null) return;
    const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
    x0 = null;
    if(Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) PL.fc.go(dx < 0 ? 1 : -1);
    else if(Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx) * 1.3){
      if(dy < 0 && atEnd) PL.fc.card(1);
      else if(dy > 0 && atTop) PL.fc.card(-1);
    }
  });
}
/* ↑ ↓ στο πληκτρολόγιο: η προηγούμενη και η επόμενη κάρτα */
document.addEventListener("keydown", e => {
  if(!PL.fc || !$("#plan .fc") || $("#plan").hidden || (e.target.closest && e.target.closest("input,textarea,select"))) return;
  if(e.key === "ArrowDown"){ e.preventDefault(); PL.fc.card(1); }
  else if(e.key === "ArrowUp"){ e.preventDefault(); PL.fc.card(-1); }
});

/* Τέλος ενότητας: τι κατάλαβες, τι θέλει μια ματιά ακόμα, και όλοι οι ορισμοί για το διαγώνισμα */
function unitEnd(key){
  const el = $("#plan"), deck = deckOf(key), m = cardMarks(key), p = cardProgress(key), sid = key.split("/")[1], s = unitState(key), T = t => unitText(key, t);
  PL.fromFeed = null;
  const again = deck.map((c, i) => i).filter(i => m[i] === 2), unseen = deck.map((c, i) => i).filter(i => !m[i]);
  const qi = PL.queue.indexOf(key), nextUnit = qi >= 0 ? PL.queue[qi + 1] : null;
  const ids = dayPlan(nextSchoolDay()).ids.filter(id => unitsOf(id).length), nextSid = ids.find(id => id !== sid);
  const row = i => `<a class="fd-row" href="#study/${key}/c/${i}"><span class="fd-num">${i + 1}</span><span class="pl-t"><b>${cardTitle(key, deck[i])}</b></span><span aria-hidden="true">›</span></a>`;
  const defs = deck.filter(c => c.b && c.b.def);
  el.innerHTML = `<div class="pl-done">
      <svg class="pl-confetti" viewBox="0 0 260 90" aria-hidden="true"><path d="M22 20l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" style="fill:var(--c-pink)"/><circle cx="236" cy="18" r="5" style="fill:var(--c-cyan)"/><rect x="214" y="62" width="10" height="10" rx="2" transform="rotate(20 219 67)" style="fill:var(--c-amber)"/><circle cx="40" cy="76" r="4" style="fill:var(--c-lime)"/><circle cx="130" cy="45" r="36" stroke-width="3" style="fill:color-mix(in srgb,var(--c-lime) 16%,transparent);stroke:var(--c-lime)"/><path d="M114 46l11 11 22-24" fill="none" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--c-lime)"/></svg>
      <h2 class="ct">${p.ok === p.n ? "Τα κατάλαβες όλα!" : p.ok ? `${p.ok} από ${p.n} τα κατάλαβες!` : "Τέλος ενότητας"}</h2>
      <p class="pl-sub">${unitLabel(key)}</p></div>
    <div class="fd-strip" style="--n:${p.n}">${deck.map((c, i) => `<a href="#study/${key}/c/${i}" class="${m[i] === 1 ? "ok" : m[i] === 2 ? "again" : ""}" aria-label="Κάρτα ${i + 1}: ${m[i] === 1 ? "την κατάλαβες" : m[i] === 2 ? "θέλει μια ματιά ακόμα" : "δεν την έκανες ακόμα"}"></a>`).join("")}</div>
    ${again.length ? `<div class="sheet fd-list"><h3 class="pl-h">Ας τα ξαναδούμε</h3>${again.map(row).join("")}</div>` : ""}
    ${unseen.length ? `<div class="sheet fd-list"><h3 class="pl-h">Δεν τις έκανες ακόμα</h3>${unseen.map(row).join("")}</div>` : ""}
    ${defs.length ? `<details class="sheet pl-again"><summary><span class="pl-again-ic" aria-hidden="true">✎</span><span class="pl-t"><b>Για το διαγώνισμα</b><small>${defs.length === 1 ? "1 ορισμός ή κανόνας" : defs.length + " ορισμοί και κανόνες"}, όλοι μαζί</small></span></summary>${defs.map(c => `<div class="pl-miss"><p><b>${C[key] ? c.b.h : esc(c.b.h)}</b></p><p>${T(c.b.def)}</p>${c.b.check ? `<p class="teach-mini"><b>Ρώτα τον καθηγητή:</b> ${T(c.b.check)}</p>` : ""}${hookList(key, c.b).filter(x => x.pin).map(x => `<p class="hook-mini">${PIN_SVG}<span>${x.own ? x.t : T(x.t)}</span></p>`).join("")}</div>`).join("")}</details>` : ""}
    <div class="pl-actions">
      ${again.length ? `<button class="btn" data-fd-again>Ξανά ${again.length === 1 ? "αυτή την κάρτα" : `αυτές τις ${again.length} κάρτες`}</button>` : ""}
      ${nextUnit ? `<a class="btn${again.length ? " ghost" : ""}" href="#study/${nextUnit}">Επόμενη ενότητα: ${unitLabel(nextUnit)}</a>` : nextSid ? `<a class="btn${again.length ? " ghost" : ""}" href="#plan/${nextSid}">Επόμενο για αύριο: ${esc(gradeSubject(selectedGrade, nextSid).name)}</a>` : ""}
      <a class="btn ghost" href="#check/${key}">Έλεγχος: όλες οι ερωτήσεις</a>
      ${bookButton(key)}
      <a class="btn ghost" href="#tomorrow">Φτάνει για σήμερα</a>
      <p class="pnote center"><a href="#study/${key}">Όλες οι κάρτες</a></p>
    </div>`;
  bindBookButton(el, key);
  const b = $("[data-fd-again]", el);
  /* Ξανά: οι κάρτες ξεκινούν από την αρχή, με το επόμενο παράδειγμα και νέα σειρά στις ερωτήσεις */
  if(b) b.onclick = () => {
    again.forEach(i => { s.part[i] = 0; s.life[i] = (s.life[i] || 0) + 1; delete s.quiz[i]; delete s.alt[i]; });
    s.review = again; location.hash = "#study/" + key + "/c/" + again[0];
  };
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

/* Δοκιμαστικό διαγώνισμα (#mock/<μάθημα>): σαν αληθινό διαγώνισμα, από τις ενότητες που διάλεξες.
   Μέρος Α: 6 ερωτήσεις πολλαπλής επιλογής, χωρίς να φαίνεται αν είναι σωστές. Μέρος Β: 3 θέματα για το τετράδιο
   (Εύκολο, Μέτριο, Δύσκολο). Με την «Παράδοση» φαίνονται οι απαντήσεις, η μέθοδος και το αποτέλεσμα. Χωρίς βαθμό. */
function mockExercises(keys){
  const pool = keys.flatMap(key => unitData(key).ex.map((e, ei) => ({key, ei, lvl:e.lvl}))), used = new Set(), out = [];
  for(const lvl of [1, 2, 3]){
    const list = shuffle(pool.filter(x => x.lvl === lvl && !out.includes(x)));
    const pick = list.find(x => !used.has(x.key)) || list[0] || shuffle(pool.filter(x => !out.includes(x)))[0];
    if(pick){ out.push(pick); used.add(pick.key); }
  }
  return out;
}
function renderMock(sid){
  const el = $("#plan"), g = subjectGroup(sid), sel = PL.sel[sid];
  const keys = g ? unitsOf(sid).filter(k => sel && sel.has(k)) : [];
  if(!keys.length){ location.replace(g ? "#plan/" + sid : "#tomorrow"); return; }
  const id = keys.join(",");
  if(!PL.mock || PL.mock.id !== id) PL.mock = { id, z:newQuiz(shuffle(quizPool(keys)).slice(0, 6), "mock"), ex:mockExercises(keys), done:false, t0:Date.now(), t1:null };
  const m = PL.mock, z = m.z, T = (key, t) => unitText(key, t), rr = () => renderMock(sid);
  const head = `<div class="pl-bar"><div><span class="ref">Δοκιμαστικό · ${esc(g.name)}</span><h2 class="pl-where">${keys.length === 1 ? unitLabel(keys[0]) : keys.length + " ενότητες"}</h2></div><span class="pl-tools"><a class="pl-round" href="#plan/${sid}" aria-label="Κλείσιμο"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></a></span></div>`;
  const cardOf = (key, topic) => Number.isInteger(topic) ? `<a class="mk-theory" href="#study/${key}/c/${topic}">Θεωρία: ${C[key] ? unitData(key).summary[topic].h : esc(unitData(key).summary[topic].h)} →</a>` : "";
  const partA = z.qs.map((q, i) => {
    const p = z.picked[i], has = p !== undefined, oq = unitData(q.key).quiz[q.oi];
    const opts = q.opts.map((o, j) => {
      const cls = !m.done ? (j === p ? " sel" : "") : o.ok ? " right" : j === p ? " wrong" : " dim";
      return `<button class="opt${cls}" data-mk-opt="${i}/${j}"${m.done ? " disabled" : ""} aria-pressed="${j === p}"><span class="l" aria-hidden="true">${m.done && o.ok ? "✓" : m.done && j === p ? "✕" : LETTERS[j]}</span><span>${plain(o.t)}</span></button>`;
    }).join("");
    return `<div class="sheet mk-q"><span class="tag">${i + 1} · ${unitName(q.key)}</span><h3>${rich(q.q)}</h3>${opts}
      ${m.done ? `<div class="why">${!has ? `<b class="n">Δεν απάντησες</b>` : q.opts[p].ok ? `<b class="y">Σωστά</b>` : `<b class="n">Όχι ακριβώς</b>`}${rich(q.why)}</div>${cardOf(q.key, oq.topic)}` : ""}</div>`;
  }).join("");
  const partB = m.ex.map(({key, ei}, i) => {
    const e = unitData(key).ex[ei];
    return `<div class="sheet mk-q"><span class="tag">Θέμα ${i + 1} · ${unitName(key)}</span><span class="lvl l${e.lvl}">${LEVELS[e.lvl]}</span>
      <p class="fc-q">${e.h && !C[key] ? `<b>${esc(e.h)}${/[;:;?.!]$/.test(e.h) ? "" : ":"}</b> ` : ""}${T(key, e.q)}</p>
      ${m.done ? `<p class="pl-h mk-sub">Η μέθοδος</p><ol class="pl-sol">${e.steps.map(x => `<li>${T(key, x)}</li>`).join("")}</ol><p class="ans">Απάντηση: <span>${T(key, e.ans)}</span></p>${cardOf(key, e.topic)}` : ""}</div>`;
  }).join("");
  const answered = Object.keys(z.picked).length, right = quizScore(z).right;
  if(m.done){
    const by = {};
    z.qs.forEach((q, i) => { const b = by[q.key] || (by[q.key] = [0, 0]); b[1]++; if(z.picked[i] !== undefined && q.opts[z.picked[i]].ok) b[0]++; });
    const weak = keys.filter(k => by[k] && by[k][0] < by[k][1]);
    el.innerHTML = head + `<div class="pl-done"><h2 class="ct">Παρέδωσες!</h2><p>Στο Μέρος Α βρήκες σωστά ${right} από ${z.qs.length}. Στο Μέρος Β σύγκρινε τις λύσεις σου με τη μέθοδο και την απάντηση.</p><p class="took">Το τελείωσες σε <b>${elapsedText(m.t1 - m.t0)}</b>.</p></div>
      ${weak.length ? `<h3 class="pl-h">Τι να ξαναδείς</h3><div class="brk">${weak.map(k => `<a href="#study/${k}"><span>${unitLabel(k)}</span><b class="${by[k][0] * 2 >= by[k][1] ? "mid" : "low"}">${by[k][0]}/${by[k][1]}</b></a>`).join("")}</div>` : ""}
      <h3 class="pl-h">Μέρος Α · Οι απαντήσεις</h3>${partA}
      ${partB ? `<h3 class="pl-h">Μέρος Β · Οι λύσεις</h3>${partB}` : ""}
      <div class="pl-actions"><button class="btn" data-mk-new>Νέο δοκιμαστικό</button><a class="btn ghost" href="#plan/${sid}">Πίσω στις ενότητες</a></div>`;
    $("[data-mk-new]", el).onclick = () => { PL.mock = null; renderMock(sid); window.scrollTo({top:0}); };
    return;
  }
  el.innerHTML = head + `<p class="pnote">Σαν αληθινό διαγώνισμα: απάντησε όσα μπορείς και μετά πάτα «Παράδοση». Τότε θα δεις τις απαντήσεις και τις λύσεις. Χωρίς βαθμό.</p>
    <h3 class="pl-h">Μέρος Α · Διάλεξε τη σωστή απάντηση</h3>${partA}
    ${partB ? `<h3 class="pl-h">Μέρος Β · Λύσε στο τετράδιο</h3><p class="pnote">Γράψε τις λύσεις σου στο τετράδιο. Στο τέλος θα δεις τη μέθοδο και την απάντηση.</p>${partB}` : ""}
    <div class="pl-actions"><button class="btn" data-mk-done>Παράδοση${answered < z.qs.length ? ` (${z.qs.length - answered} αναπάντητες στο Μέρος Α)` : ""}</button></div>`;
  el.querySelectorAll("[data-mk-opt]").forEach(b => b.onclick = () => {
    const [i, j] = b.dataset.mkOpt.split("/").map(Number), y = window.scrollY;
    z.picked[i] = j; rr(); window.scrollTo({top:y});
  });
  $("[data-mk-done]", el).onclick = () => {
    z.qs.forEach((q, i) => { if(z.picked[i] !== undefined) markAnswer(q.key, q.oi, q.opts[z.picked[i]].ok); });
    m.done = true; m.t1 = Date.now(); rr(); window.scrollTo({top:0});
  };
}

/* Επίπεδα γνώσης. Ο μαθητής διαβάζει όπως τον βολεύει (κάρτες, βιβλίο, σημειώσεις) και εδώ ελέγχει τι ξέρει.
   Το επίπεδο βγαίνει μόνο από τον έλεγχο με όλες τις ερωτήσεις της ενότητας (#check/<κλειδί>), ποτέ από δήλωση.
   diab-level: {κλειδί: [σωστές, ερωτήσεις]}, η καλύτερη προσπάθεια, οπότε το επίπεδο μόνο ανεβαίνει.
   Βασικό: τουλάχιστον οι μισές. Προχωρημένο: 8 στις 10. Κορυφαίο: όλες. («Πλήρες» είναι η ετικέτα του καταλόγου για ενότητες με όλο το περιεχόμενο· δεν τη χρησιμοποιούμε για επίπεδο.) Από το Προχωρημένο η ενότητα είναι «έτοιμη».
   Ο κύκλος της ενότητας γεμίζει όσο το ποσοστό, με το χρώμα του μαθήματος· το ποσοστό δεν γράφεται πουθενά.
   diab-taught: ενότητες που διδάχτηκαν στην τάξη. diab-way: πώς διάλεξε να διαβάσει ("cards" ή "self").
   diab-days: {μέρα: {μάθημα: κλειδί}}, ποια ενότητα διάβασε για ποια σχολική μέρα (για το ημερολόγιο). */
const LEVEL_NAMES = ["Ξεκίνησες", "Βασικό", "Προχωρημένο", "Κορυφαίο"];
const scoreOf = key => { const v = store.get("diab-level", {})[key]; return Array.isArray(v) && v[1] > 0 ? v[0] / v[1] : null; };
const levelOf = f => f === null ? -1 : f >= 1 ? 3 : f >= 0.8 ? 2 : f >= 0.5 ? 1 : 0;
const levelName = key => { const l = levelOf(scoreOf(key)); return l < 0 ? "Χωρίς έλεγχο ακόμα" : LEVEL_NAMES[l]; };
const isReady = key => levelOf(scoreOf(key)) >= 2;
function saveLevel(key, right, n){
  const all = store.get("diab-level", {}), old = all[key];
  if(!(Array.isArray(old) && old[1] > 0 && old[0] / old[1] >= right / n)){ all[key] = [right, n]; store.set("diab-level", all); }
}
const isTaught = key => !!store.get("diab-taught", {})[key];
function setTaught(key, on){ const t = store.get("diab-taught", {}); if(on) t[key] = 1; else delete t[key]; store.set("diab-taught", t); }
function noteDay(key){
  const all = store.get("diab-days", {}), date = nextSchoolDay(), d = all[date] || (all[date] = {}), sid = key.split("/")[1];
  if(d[sid] !== key){ d[sid] = key; store.set("diab-days", all); }
}
const subjectColor = sid => `var(--c-${(SUBJECT_LOOK[sid] || ["slate"])[0]})`;
/* Ο κύκλος: f από 0 έως 1. Με label γίνεται εικόνα για τον αναγνώστη οθόνης, αλλιώς διακοσμητικός. */
function ringSvg(f, color, size, label){
  const p = Math.round(Math.max(0, Math.min(1, f || 0)) * 1000) / 10;
  return `<svg class="lring" width="${size}" height="${size}" viewBox="0 0 100 100" style="--rc:${color}" ${label ? `role="img" aria-label="${label}"` : `aria-hidden="true"`}><circle cx="50" cy="50" r="40" class="lr-t"/>${p > 0 ? `<circle cx="50" cy="50" r="40" class="lr-b" pathLength="100" stroke-dasharray="${p} 100" transform="rotate(-90 50 50)"/>` : ""}</svg>`;
}
const unitRing = (key, size) => ringSvg(scoreOf(key), subjectColor(key.split("/")[1]), size, `${unitLabel(key).replace(/<[^>]+>/g, "")}: ${levelName(key)}`);
const READY_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/></svg>`;
const readyBadge = key => isReady(key) ? `<span class="lv-ready" title="Έτοιμος">${READY_SVG}</span>` : "";
const taughtBox = key => `<label class="lv-taught"><input type="checkbox" data-taught${isTaught(key) ? " checked" : ""}> Διδάχτηκε στην τάξη</label>`;
function bindTaught(el, key){ el.querySelectorAll("[data-taught]").forEach(x => x.onchange = () => setTaught(key, x.checked)); }

/* Στην αρχή της ενότητας: «Πώς θα το διαβάσεις;» μέχρι να διαλέξει. Μετά, ο κύκλος, το επίπεδο και ο έλεγχος. */
function unitStatus(key, p){
  const way = store.get("diab-way", {})[key], f = scoreOf(key), n = unitData(key).quiz.length;
  if(!way && !p.seen && f === null) return `<div class="sheet lv-ask"><h3 class="pl-h">Πώς θα το διαβάσεις;</h3>
      <button class="lv-way" data-way="cards"><span class="lv-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="13" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v13"/></svg></span><span class="pl-t"><b>Με τις κάρτες</b><small>${p.n} κάρτες, μία ιδέα η καθεμία, με ερωτήσεις στη διαδρομή.</small></span></button>
      <button class="lv-way" data-way="self"><span class="lv-ic self" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z"/></svg></span><span class="pl-t"><b>Το διάβασα αλλού</b><small>Από το βιβλίο ή τις σημειώσεις σου. Πάμε κατευθείαν στον έλεγχο: ${n} ερωτήσεις.</small></span></button>
      <p class="pnote">Μπορείς να αλλάξεις τρόπο όποτε θέλεις. Οι κάρτες μένουν εδώ.</p>${taughtBox(key)}</div>`;
  return `<div class="sheet lv-card"><div class="lv-row">${unitRing(key, 56)}<span class="pl-t"><b>${levelName(key)}${readyBadge(key)}</b><small>${f === null ? "Όταν νιώσεις έτοιμος, κάνε τον έλεγχο. Ο κύκλος γεμίζει όσο πιο πολλές βρίσκεις." : f >= 1 ? "Τις βρήκες όλες!" : "Ο κύκλος γεμίζει όσο πιο πολλές βρίσκεις."}</small></span></div>
      <a class="btn${f === null && way === "self" ? "" : " ghost"}" href="#check/${key}">${f === null ? `Έλεγχος: ${n} ερωτήσεις` : `Ξανά ο έλεγχος: ${n} ερωτήσεις`}</a>${taughtBox(key)}</div>`;
}
function bindUnitStatus(el, key){
  el.querySelectorAll("[data-way]").forEach(b => b.onclick = () => {
    const w = store.get("diab-way", {}); w[key] = b.dataset.way; store.set("diab-way", w);
    if(b.dataset.way === "self") location.hash = "#check/" + key; else unitFeed(key);
  });
  bindTaught(el, key);
}

/* Έλεγχος (#check/<κλειδί>): όλες οι ερωτήσεις της ενότητας, με άλλη σειρά κάθε φορά. Στο τέλος, το επίπεδο. */
function renderCheck(key){
  if(ALIAS[key]){ location.replace("#check/" + ALIAS[key]); return; }
  const u = unitData(key);
  if(!u || !u.quiz?.length || !SHOWN_GRADES.includes(key[0])){ location.replace("#tomorrow"); return; }
  noteDay(key);
  const el = $("#plan"), sid = key.split("/")[1];
  if(!PL.check || PL.check.key !== key) PL.check = { key, z:newQuiz(unitItems(key), "unit"), before:levelOf(scoreOf(key)) };
  const z = PL.check.z, rr = () => renderCheck(key), top = () => window.scrollTo({top:0});
  const head = `<div class="pl-bar"><div><span class="ref">Έλεγχος · ${unitName(key)}</span><h2 class="pl-where">${unitLabel(key)}</h2></div><span class="pl-tools"><a class="pl-round" href="#study/${key}" aria-label="Κλείσιμο"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></a></span></div>`;
  if(z.done){
    const {right} = quizScore(z), n = z.qs.length, best = levelOf(scoreOf(key)), up = best > PL.check.before, deck = deckOf(key);
    const miss = [...new Set(z.qs.filter((q, i) => !(z.picked[i] !== undefined && q.opts[z.picked[i]].ok)).map(q => u.quiz[q.oi].topic).filter(t => Number.isInteger(t) && deck[t]))].sort((a, b) => a - b);
    const title = up && best >= 1 ? (best === 3 ? "Κορυφαίο! Τις βρήκες όλες!" : `Έφτασες στο ${LEVEL_NAMES[best]}!`) : best >= 1 ? `Είσαι στο ${LEVEL_NAMES[best]}` : "Καλή αρχή!";
    const steps = [["Βασικό", "τουλάχιστον τις μισές"], ["Προχωρημένο", "8 στις 10"], ["Κορυφαίο", "όλες σωστές"]];
    el.innerHTML = head + `<div class="sheet lv-result">
        ${ringSvg(scoreOf(key), subjectColor(sid), 180, `${unitLabel(key).replace(/<[^>]+>/g, "")}: ${levelName(key)}`)}
        <h2 class="ct">${title}</h2>
        <p class="pl-sub">Αυτή τη φορά: ${right} σωστές από ${n}</p>
        <ul class="lv-steps">${steps.map(([name, rule], j) => `<li${best > j ? ` class="on"` : ""}><span>${name} · ${rule}</span><b>${best > j ? "✓" : best === j ? "επόμενο" : ""}</b></li>`).join("")}</ul></div>
      ${isReady(key) ? `<div class="sheet lv-badge">${READY_SVG}<span class="pl-t"><b>${unitLabel(key)}: έτοιμος</b><small>Μένει, ό,τι κι αν γίνει μετά.</small></span></div>` : ""}
      ${best < 3 && miss.length ? `<div class="sheet fd-list"><h3 class="pl-h">${best >= 2 ? "Για το Κορυφαίο" : "Ας τα ξαναδούμε"}</h3><p class="pnote">Δες τις κάρτες όσων σου ξέφυγαν και ξαναδοκίμασε. Οι ερωτήσεις ανακατεύονται κάθε φορά.</p>${miss.map(t => `<a class="fd-row" href="#study/${key}/c/${t}"><span class="fd-num">${t + 1}</span><span class="pl-t"><b>${cardTitle(key, deck[t])}</b></span><span aria-hidden="true">›</span></a>`).join("")}</div>` : ""}
      <div class="pl-actions"><button class="btn" data-lv-again>Ξανά ο έλεγχος</button><button class="btn ghost" data-lv-review>Δες τις απαντήσεις</button><a class="btn ghost" href="#study/${key}">Στις κάρτες της ενότητας</a></div>`;
    $("[data-lv-again]", el).onclick = () => { PL.check = null; rr(); top(); };
    $("[data-lv-review]", el).onclick = () => { z.done = false; z.qi = 0; rr(); top(); };
    return;
  }
  const v = quizView(z, rr);
  el.innerHTML = head + `<p class="pnote">Όλες οι ερωτήσεις της ενότητας, με άλλη σειρά κάθε φορά. Από εδώ βγαίνει το επίπεδό σου.</p>` + v.body;
  keyNav = v.go;
  el.querySelectorAll("[data-nav]").forEach(b => b.onclick = () => v.go && v.go(+b.dataset.nav));
  const slide = $(".slide", el);
  if(slide && v.go) swipe(slide, v.go);
  bindQuiz(el, z, rr, { top, finish:() => { saveLevel(key, quizScore(z).right, z.qs.length); saveBest(key, gradeOf(z)); } });
}

/* Ημερολόγιο (#calendar ή #calendar/2026-10): οι σχολικές μέρες του μήνα. Κάθε μέρα έχει έναν κύκλο για κάθε μάθημα
   του προγράμματος (το πολύ 7), στο χρώμα του μαθήματος, γεμάτο όσο το επίπεδο της ενότητας που διάβασες για εκείνη τη μέρα.
   Χωρίς μετρητές και χωρίς σερί: τίποτα δεν μηδενίζεται. */
const MONTHS_NOM = ["Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος", "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"];
function calendarDay(date, sched, days){
  const wd = dayAt(date).getDay(), ids = [];
  if(sched && sched.g === selectedGrade) sched.d[wd - 1].forEach(v => { if(v && !v.startsWith("~") && !ids.includes(v)) ids.push(v); });
  Object.keys(days[date] || {}).forEach(sid => { if(!ids.includes(sid) && gradeSubject(selectedGrade, sid)) ids.push(sid); });
  return ids.slice(0, 7).map(sid => ({ sid, key:(days[date] || {})[sid] || null }));
}
function renderCalendar(ym){
  const el = $("#plan"), now = new Date(), m0 = /^\d{4}-\d\d$/.test(ym || "") ? ym.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  const [y, m] = m0, sched = loadSchedule(), days = store.get("diab-days", {}), today = ymd(now), last = new Date(y, m, 0).getDate();
  const mk = (yy, mm) => `#calendar/${yy}-${String(mm).padStart(2, "0")}`, prev = m === 1 ? mk(y - 1, 12) : mk(y, m - 1), next = m === 12 ? mk(y + 1, 1) : mk(y, m + 1);
  const dates = [];
  for(let d = 1; d <= last; d++){ const s = ymd(new Date(y, m - 1, d)), wd = dayAt(s).getDay(); if(wd >= 1 && wd <= 5) dates.push(s); }
  const sel = dates.includes(PL.calDay) ? PL.calDay : dates.includes(today) ? today : dates[0];
  const lead = dates.length ? dayAt(dates[0]).getDay() - 1 : 0;
  const cell = s => { const list = calendarDay(s, sched, days);
    return `<button class="cal-d${s === today ? " today" : ""}${s === sel ? " sel" : ""}" data-cal="${s}" aria-pressed="${s === sel}" aria-label="${dayName(s)}${list.length ? `, ${list.length === 1 ? "1 μάθημα" : list.length + " μαθήματα"}` : ""}"><span class="cal-n">${dayAt(s).getDate()}</span><span class="cal-rings">${list.map(x => ringSvg(x.key ? scoreOf(x.key) : 0, subjectColor(x.sid), 14)).join("")}</span></button>`; };
  const detail = calendarDay(sel, sched, days);
  el.innerHTML = `<a class="back" href="#tomorrow">← Αύριο</a>
    <div class="cal-head"><a class="pl-round" href="${prev}" aria-label="Προηγούμενος μήνας"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></a><h2 class="ct">${MONTHS_NOM[m - 1]} ${y}</h2><a class="pl-round" href="${next}" aria-label="Επόμενος μήνας"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg></a></div>
    <div class="cal-grid cal-wd" aria-hidden="true"><span>ΔΕ</span><span>ΤΡ</span><span>ΤΕ</span><span>ΠΕ</span><span>ΠΑ</span></div>
    <div class="cal-grid">${"<span></span>".repeat(Math.max(0, lead))}${dates.map(cell).join("")}</div>
    <div class="sheet cal-detail"><h3 class="pl-h">${dayName(sel)}</h3>
      ${detail.length ? detail.map(x => { const s = gradeSubject(selectedGrade, x.sid), has = unitsOf(x.sid).length;
        return `<a class="cal-row" href="${x.key ? "#study/" + x.key : has ? "#plan/" + x.sid : courseHref(selectedGrade, x.sid)}">${ringSvg(x.key ? scoreOf(x.key) : 0, subjectColor(x.sid), 34)}<span class="pl-t"><b>${esc(s.name)}${x.key ? readyBadge(x.key) : ""}</b><small>${x.key ? `${unitLabel(x.key)} · ${levelName(x.key)}` : !has ? "Χωρίς ερωτήσεις στη σελίδα" : sel >= today ? "Διάλεξε ενότητα" : "Δεν διάβασες ενότητα εδώ γι' αυτή τη μέρα"}</small></span><span aria-hidden="true">›</span></a>`; }).join("")
        : `<p class="pnote">${sched ? "Δεν έχεις μαθήματα στο πρόγραμμα για αυτή τη μέρα." : `Γράψε το πρόγραμμά σου και εδώ θα βλέπεις τα μαθήματα κάθε μέρας. <a href="#schedule">Το πρόγραμμά μου</a>`}</p>`}</div>
    <p class="pnote center">Κάθε κύκλος είναι ένα μάθημα της μέρας. Γεμίζει με τον έλεγχο της ενότητας που διάβασες γι' αυτή τη μέρα. Όλα μένουν μόνο σε αυτή τη συσκευή.</p>`;
  el.querySelectorAll("[data-cal]").forEach(b => b.onclick = () => { PL.calDay = b.dataset.cal; renderCalendar(`${y}-${String(m).padStart(2, "0")}`); });
}
