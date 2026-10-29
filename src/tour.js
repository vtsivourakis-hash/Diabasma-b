/* Ξενάγηση (tour): η σελίδα δείχνει τι κάνει κάθε κομμάτι. Σκοτεινιάζει την οθόνη εκτός από ένα στοιχείο
   και ένα συννεφάκι εξηγεί. Σε μερικά βήματα ο μαθητής πατά ο ίδιος («Πάτα εδώ») και η ξενάγηση συνεχίζει.
   Περνά από μια πραγματική ενότητα (Γεωγραφία, μάθημα 1, κάρτα 4: έχει ερώτηση, κόλπο και «Ρώτα τον καθηγητή»).
   Την πρώτη φορά προτείνεται μία φορά· μετά ξεκινά από το κουμπί στο «Σχολείο». Μένει μόνο στη συσκευή (diab-tour). */
const TOUR_UNIT = "B/geography/0/2", TOUR_CARD = 3;
const TOUR = [
  { at:"#tomorrow", title:"Καλώς ήρθες!",
    text:"Αυτή η σελίδα σε βοηθά να διαβάζεις λίγο κάθε μέρα, με κάρτες που ακολουθούν τα σχολικά βιβλία. Η ξενάγηση κρατά δύο λεπτά. Μπορείς να τη σταματήσεις όποτε θέλεις." },
  { at:"#tomorrow", target:"nav.tabs", title:"Οι καρτέλες",
    text:"Από εδώ πας παντού. «Αύριο»: τι έχεις για την επόμενη μέρα. «Μαθήματα»: όλα τα βιβλία και οι ενότητες. «Εξάσκηση»: διαγωνίσματα και τα λάθη σου. «Σχολείο»: συμβουλές, και αυτή η ξενάγηση ξανά." },
  { at:"#tomorrow", target:"#plan a[href='#schedule']", title:"Το πρόγραμμά σου",
    text:"Γράψε μία φορά το εβδομαδιαίο πρόγραμμα της τάξης. Μετά, στο «Αύριο» θα βλέπεις κάθε μέρα τα μαθήματα της επόμενης μέρας. Πατώντας ένα μάθημα, διαλέγεις τι κάνατε στην τάξη." },
  { at:"#plan/geography", target:".pl-chap", title:"Τι κάνατε στην τάξη;",
    text:"Εδώ τσεκάρεις τις ενότητες που κάνατε. Μετά πατάς «Διάβασμα για αύριο» και ανοίγουν οι κάρτες. Ας ανοίξουμε μαζί το πρώτο μάθημα της Γεωγραφίας." },
  { at:"#study/" + TOUR_UNIT, target:".lv-ask, .lv-card", title:"Πώς θα το διαβάσεις;",
    text:"Σε κάθε ενότητα διαλέγεις: με τις κάρτες της σελίδας, ή «Το διάβασα αλλού», από το βιβλίο ή τις σημειώσεις σου, και πας κατευθείαν στον έλεγχο. Τσέκαρε και «Διδάχτηκε στην τάξη». Τώρα ας δούμε τις κάρτες." },
  { at:"#study/" + TOUR_UNIT, target:`.fd-tile[href="#study/${TOUR_UNIT}/c/${TOUR_CARD}"]`, wait:"click", title:"Οι κάρτες",
    text:"Κάθε ενότητα είναι μερικές κάρτες, μία ιδέα σε καθεμιά. Το ✓ δείχνει όσες κατάλαβες. Πάτα αυτή την κάρτα για να ανοίξει." },
  { target:".fc .pl-segs", title:"Τα μέρη της κάρτας",
    text:"Κάθε κάρτα έχει μέρη: «Η ιδέα», παραδείγματα, ασκήσεις, ερώτηση, και στο τέλος «Για το διαγώνισμα». Οι γραμμούλες εδώ πάνω δείχνουν πού είσαι." },
  { target:".fc .fc-actions .btn", wait:"click", title:"Προχώρα",
    text:"Πάτα εδώ για το επόμενο μέρος. Στο κινητό μπορείς και να σύρεις την κάρτα." },
  { part:"check", target:".fc .fc-body", area:".fc .fc-qh, .fc [data-fc-opt], .fc .why", wait:"opt", title:"Το κατάλαβες;",
    text:"Κάθε κάρτα έχει μια ερώτηση. Διάλεξε μια απάντηση. Αν κάνεις λάθος, το «Πες το μου αλλιώς» στο εξηγεί με άλλα λόγια, και η κάρτα ξανάρχεται στο τέλος." },
  { part:"def", target:".fc .defb", title:"Για το διαγώνισμα",
    text:"Αυτό είναι ό,τι γράφεις στο διαγώνισμα, με τα λόγια του βιβλίου." },
  { part:"def", target:".fc .fc-teach", title:"Ρώτα τον καθηγητή",
    text:"Κάποιες κάρτες έχουν αυτό το μπλε πλαίσιο: εκεί άλλες πηγές λένε κάτι διαφορετικό από το βιβλίο. Γράφεις ό,τι λέει το βιβλίο, αλλά ρώτα τον καθηγητή σου." },
  { part:"def", target:".fc .fc-hooks", title:"Κόλπο για να θυμάσαι",
    text:"Ένας εύκολος τρόπος να θυμηθείς τον κανόνα. Καρφίτσωσε όσα σε βοηθούν ή γράψε το δικό σου. Μένουν μόνο σε αυτή τη συσκευή." },
  { at:"#study/" + TOUR_UNIT, target:".lv-ask, .lv-card", title:"Ο έλεγχος και ο κύκλος",
    text:"Όταν νιώσεις έτοιμος, κάνε τον «Έλεγχο»: όλες οι ερωτήσεις της ενότητας. Ο κύκλος της ενότητας γεμίζει όσο πιο πολλές βρίσκεις: Βασικό, Προχωρημένο, Κορυφαίο. Μπορείς να τον ξανακάνεις όσες φορές θέλεις· ο κύκλος δεν αδειάζει ποτέ." },
  { at:"#calendar", target:".cal-grid:not(.cal-wd)", title:"Το ημερολόγιο",
    text:"Κάθε σχολική μέρα έχει έναν κύκλο για κάθε μάθημα του προγράμματός σου, στο χρώμα του μαθήματος. Γεμίζει με τον έλεγχο της ενότητας που διάβασες γι' αυτή τη μέρα. Θα το βρεις στο «Αύριο», δίπλα στο πρόγραμμά σου." },
  { at:"#practice", target:"#practice .pseg", title:"Εξάσκηση",
    text:"Δοκιμαστικό διαγώνισμα, «Τα λάθη μου» (όσες ερωτήσεις σου ξέφυγαν, για να τις ξαναδείς), χρονόμετρο μελέτης και το πρόγραμμά σου." },
  { at:"#practice", target:".app-toolbar", title:"Η πάνω μπάρα",
    text:"«Άκουσε»: η σελίδα σού διαβάζει δυνατά. «Αναζήτηση»: βρες ένα μάθημα ή μια ενότητα. «25΄»: χρονόμετρο για να διαβάζεις λίγο και να κάνεις διάλειμμα." },
  { at:"#tomorrow", title:"Έτοιμος!",
    text:"Αυτά ήταν. Ξεκίνα από το «Αύριο». Αν θέλεις να ξαναδείς την ξενάγηση, θα τη βρεις στην καρτέλα «Σχολείο»." }
];
/* Τα βήματα μέσα στην κάρτα ξεκινούν αμέσως μετά το «Πάτα την κάρτα» */
const TOUR_CARD_FROM = TOUR.findIndex(s => s.at && s.wait === "click") + 1;
const TS = { i:-1, el:null, expect:null, timer:0, offer:false };

function tourStart(){
  tourOfferClose();
  if(selectedGrade !== "B") selectGrade("B");
  TS.el = document.createElement("div");
  TS.el.className = "tour";
  TS.el.innerHTML = `<div class="tour-hole" aria-hidden="true"></div><div class="tour-blk" aria-hidden="true"></div><div class="tour-blk" aria-hidden="true"></div><div class="tour-blk" aria-hidden="true"></div><div class="tour-blk" aria-hidden="true"></div>
    <div class="tour-tip" role="dialog" aria-modal="false" aria-labelledby="tour-h"><p class="tour-n" id="tour-n"></p><h2 class="tour-h" id="tour-h" tabindex="-1"></h2><p class="tour-t" id="tour-t"></p>
      <div class="tour-row"><button class="btn ghost tour-b" type="button" data-tour="back">Πίσω</button><button class="btn tour-b" type="button" data-tour="next">Επόμενο</button></div>
      <button class="tour-x" type="button" data-tour="end" aria-label="Τέλος ξενάγησης">✕</button></div>`;
  document.body.appendChild(TS.el);
  TS.el.querySelectorAll("[data-tour]").forEach(b => b.onclick = () => ({ end:tourEnd, back:() => tourGo(TS.i - 1), next:() => tourGo(TS.i + 1) })[b.dataset.tour]());
  document.addEventListener("click", tourClick, true);
  document.addEventListener("keydown", tourKey, true);
  window.addEventListener("hashchange", tourHash);
  window.addEventListener("resize", tourPlace);
  window.addEventListener("scroll", tourPlace, true);
  tourGo(0);
}

function tourEnd(){
  if(!TS.el) return;
  clearTimeout(TS.timer);
  document.removeEventListener("click", tourClick, true);
  document.removeEventListener("keydown", tourKey, true);
  window.removeEventListener("hashchange", tourHash);
  window.removeEventListener("resize", tourPlace);
  window.removeEventListener("scroll", tourPlace, true);
  TS.el.remove(); TS.el = null; TS.i = -1; TS.expect = null;
  store.set("diab-tour", "done");
}

/* Πήγαινε στο βήμα i: άλλαξε σελίδα αν χρειάζεται, φέρε την κάρτα στο σωστό μέρος, και περίμενε το στοιχείο */
function tourGo(i){
  if(i < 0) return;
  if(i >= TOUR.length){ tourEnd(); location.hash = "#tomorrow"; return; }
  const s = TOUR[i], back = i < TS.i;
  TS.i = i;
  /* Πίσω σε βήμα της κάρτας: ξανανοίγουμε την κάρτα, γιατί τα μέρη της δεν είναι στη διεύθυνση */
  const at = s.at || (s.part || back && i >= TOUR_CARD_FROM ? `#study/${TOUR_UNIT}/c/${TOUR_CARD}` : null);
  if(at && location.hash !== at){ TS.expect = at; location.hash = at; }
  if(back && (i === TOUR_CARD_FROM || i === TOUR_CARD_FROM + 1) && PL.fc && !TS.expect) tourRewind();
  TS.rewound = !back || !(i === TOUR_CARD_FROM || i === TOUR_CARD_FROM + 1) || !TS.expect;
  tourShow(0);
}
const tourRewind = () => { for(let n = 0; n < 8; n++) if(!PL.fc.go(-1)) break; };
/* Φέρε την κάρτα στο μέρος του βήματος. Αν η κάρτα μόλις ανοίγει (π.χ. «Πίσω» από άλλη σελίδα), γίνεται όταν φανεί. */
function tourSeekPart(s){
  if(!$(".fc") || !PL.fc) return;
  if(!TS.rewound){ tourRewind(); TS.rewound = true; }
  if(s.part && !$(`.fc .fc-body.p-${s.part}`)){ tourRewind(); for(let n = 0; n < 8 && !$(`.fc .fc-body.p-${s.part}`); n++) if(!PL.fc.go(1)) break; }
}

function tourShow(tries){
  clearTimeout(TS.timer);
  if(!TS.el) return;
  const s = TOUR[TS.i];
  tourSeekPart(s);
  const t = s.target ? $(s.target) : null;
  if(s.target && !t && tries < 30){ TS.timer = setTimeout(() => tourShow(tries + 1), 100); return; }
  if(t && t.scrollIntoView) t.scrollIntoView({ block:"center", behavior:"instant" });
  $("#tour-n", TS.el).textContent = `${TS.i + 1} από ${TOUR.length}`;
  $("#tour-h", TS.el).textContent = s.title;
  $("#tour-t", TS.el).textContent = s.text;
  /* Αν το πάτημα έχει ήδη γίνει (π.χ. γύρισες με «Πίσω» σε ερώτηση που απάντησες), δεν περιμένουμε: φαίνεται το «Επόμενο» */
  const done = s.wait === "opt" && t && !$(".fc [data-fc-opt]:not([disabled])");
  const wait = !!(s.wait && t && !done);
  const next = $("[data-tour=next]", TS.el);
  next.hidden = wait;
  next.textContent = TS.i === TOUR.length - 1 ? "Τέλος" : "Επόμενο";
  $("[data-tour=back]", TS.el).hidden = TS.i === 0;
  TS.el.classList.toggle("tour-wait", wait);
  TS.el.classList.toggle("tour-center", !t);
  TS.target = t;
  tourPlace();
  /* Τα μέρη της κάρτας μπαίνουν με κίνηση (γλιστράνε από δεξιά): ξαναμετράμε όταν σταματήσουν */
  if(document.getAnimations) Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))).then(tourPlace);
  [150, 450, 900].forEach(ms => setTimeout(tourPlace, ms));
  $("#tour-h", TS.el).focus({ preventScroll:true });
}

/* Η «τρύπα» γύρω από το στοιχείο, τα τέσσερα κομμάτια που εμποδίζουν τα πατήματα έξω από αυτήν, και το συννεφάκι.
   Με "area" η τρύπα αγκαλιάζει μόνο αυτά τα στοιχεία (π.χ. ερώτηση και απαντήσεις), για να χωρά το συννεφάκι δίπλα τους. */
function tourRect(){
  const s = TOUR[TS.i], t = TS.target;
  if(!t) return null;
  const els = s.area ? [...document.querySelectorAll(s.area)] : t.isConnected ? [t] : [];
  if(!els.length) return null;
  const rs = els.map(e => e.getBoundingClientRect());
  return { left:Math.min(...rs.map(r => r.left)), top:Math.min(...rs.map(r => r.top)), right:Math.max(...rs.map(r => r.right)), bottom:Math.max(...rs.map(r => r.bottom)) };
}
function tourPlace(){
  if(!TS.el) return;
  const W = window.innerWidth, H = window.innerHeight, t = TS.target, hole = $(".tour-hole", TS.el), blk = TS.el.querySelectorAll(".tour-blk"), tip = $(".tour-tip", TS.el);
  const r = tourRect(), p = 6;
  /* Η τρύπα μένει πάντα μέσα στην οθόνη, από όποια πλευρά κι αν ξεφεύγει το στοιχείο */
  const x0 = r && Math.max(4, r.left - p), y0 = r && Math.max(4, r.top - p);
  const box = r ? { x:x0, y:y0, w:Math.max(0, Math.min(W - 4, r.right + p) - x0), h:Math.max(0, Math.min(H - 4, r.bottom + p) - y0) } : { x:W / 2, y:H / 2, w:0, h:0 };
  Object.assign(hole.style, { left:box.x + "px", top:box.y + "px", width:box.w + "px", height:box.h + "px" });
  const wait = TS.el.classList.contains("tour-wait");
  const rects = wait ? [[0, 0, W, box.y], [0, box.y + box.h, W, H - box.y - box.h], [0, box.y, box.x, box.h], [box.x + box.w, box.y, W - box.x - box.w, box.h]] : [[0, 0, W, H], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  blk.forEach((b, k) => Object.assign(b.style, { left:rects[k][0] + "px", top:rects[k][1] + "px", width:Math.max(0, rects[k][2]) + "px", height:Math.max(0, rects[k][3]) + "px" }));
  const tw = Math.min(360, W - 32), th = tip.offsetHeight || 180;
  let x = r ? Math.min(Math.max(16, box.x + box.w / 2 - tw / 2), W - tw - 16) : (W - tw) / 2, y;
  if(!r) y = Math.max(16, (H - th) / 2);
  else if(box.y + box.h + 12 + th < H - 8) y = box.y + box.h + 12;
  else if(box.y - 12 - th > 8) y = box.y - 12 - th;
  /* Δεν χωράει ούτε από πάνω ούτε από κάτω: στη μεριά της οθόνης που έχει περισσότερο χώρο */
  else y = box.y > H - (box.y + box.h) ? 8 : Math.max(8, H - th - 8);
  Object.assign(tip.style, { left:x + "px", top:y + "px", width:tw + "px" });
}

/* Στα βήματα «Πάτα εδώ»: αφήνουμε το πάτημα να γίνει και μετά πάμε στο επόμενο βήμα */
function tourClick(e){
  if(!TS.el || TS.el.contains(e.target)) return;
  const s = TOUR[TS.i];
  if(!s.wait || !TS.target) return;
  const hit = s.wait === "opt" ? e.target.closest("[data-fc-opt]") : e.target.closest(s.target);
  if(!hit || !TS.target.contains(hit) && hit !== TS.target) return;
  const href = hit.getAttribute && hit.getAttribute("href");
  if(href && href.startsWith("#")) TS.expect = href;
  /* Μετά από την απάντηση, αφήνουμε λίγο χρόνο να φανεί αν ήταν σωστή */
  if(s.wait === "opt") setTimeout(tourPlace, 60);
  TS.timer = setTimeout(() => tourGo(TS.i + 1), s.wait === "opt" ? 1400 : 250);
}

/* Αν ο μαθητής φύγει μόνος του (π.χ. με το «πίσω» του κινητού), η ξενάγηση σταματά */
function tourHash(){
  if(!TS.el) return;
  if(TS.expect && location.hash === TS.expect){ TS.expect = null; return; }
  if(location.hash === TOUR[TS.i].at || location.hash.startsWith(`#study/${TOUR_UNIT}/c/${TOUR_CARD}`)) return;
  tourEnd();
}
function tourKey(e){
  if(!TS.el) return;
  if(e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); tourEnd(); }
  else if(e.key === "Tab"){
    const f = [...TS.el.querySelectorAll("button:not([hidden])")];
    if(TOUR[TS.i].wait && TS.target) return;
    if(!f.includes(document.activeElement)){ e.preventDefault(); f[0].focus(); }
  } else if(!TOUR[TS.i].wait && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) e.stopPropagation();
}

/* Η πρόταση της πρώτης φοράς: μία φορά, στο «Αύριο», χωρίς να κρύβει τη σελίδα */
function tourOffer(){
  if(TS.el || TS.offer || store.get("diab-tour", "") || !/^(#tomorrow)?$/.test(location.hash)) return;
  TS.offer = true;
  const d = document.createElement("div");
  d.className = "tour-offer";
  d.setAttribute("role", "dialog");
  d.setAttribute("aria-labelledby", "tour-offer-h");
  d.innerHTML = `<h2 id="tour-offer-h">Πρώτη φορά εδώ;</h2><p>Μια σύντομη ξενάγηση σού δείχνει πώς δουλεύει η σελίδα.</p><div class="tour-row"><button class="btn ghost" type="button" data-to="no">Όχι τώρα</button><button class="btn" type="button" data-to="go">Ξενάγηση</button></div>`;
  document.body.appendChild(d);
  d.querySelector("[data-to=no]").onclick = () => { store.set("diab-tour", "later"); tourOfferClose(); };
  d.querySelector("[data-to=go]").onclick = tourStart;
}
function tourOfferClose(){ const d = $(".tour-offer"); if(d) d.remove(); }

/* Τα κουμπιά «Ξενάγηση» (στο «Σχολείο» και στο «Αύριο», που ξαναζωγραφίζεται): ένας ακροατής για όλα */
document.addEventListener("click", e => { if(e.target.closest("[data-tour-start]") && !TS.el) tourStart(); });
setTimeout(tourOffer, 900);
