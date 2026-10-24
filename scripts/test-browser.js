// Integration checks: npm install --no-save playwright; node scripts/test-browser.js
// Optional PLAYWRIGHT_MODULE and CHROME_PATH select an existing test installation.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const catalogue = require('../src/curriculum.json');
const root = path.resolve(__dirname,'..');
async function main(){
  const server = http.createServer(async(req,res)=>{
    try{
      const pathname = new URL(req.url,'http://localhost').pathname;
      const file = path.resolve(root,'.'+(pathname==='/'?'/index.html':decodeURIComponent(pathname)));
      if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
      const data = await fs.readFile(file);
      res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'application/javascript':file.endsWith('.webmanifest')?'application/manifest+json':'application/octet-stream');
      res.end(data);
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://localhost:${server.address().port}`;
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844}});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(() => {
      window.voiceCalls = [];
      window.voiceCancels = 0;
      window.SpeechSynthesisUtterance = class {constructor(text){this.text=text;}};
      Object.defineProperty(window, 'speechSynthesis', {value:{
        getVoices:()=>[{lang:'el-GR',name:'Greek'}],
        speak:utterance=>window.voiceCalls.push({text:utterance.text,lang:utterance.lang}),
        cancel:()=>window.voiceCancels++
      }});
    });
    await page.goto(base);
    await page.evaluate(()=>navigator.serviceWorker.ready);
    const route=async hash=>{await page.evaluate(hash=>{location.hash=hash;},hash);await page.waitForFunction(()=>[...document.querySelectorAll('.panel')].filter(e=>!e.hidden).length===1);await page.waitForFunction(hash=>location.hash===hash,hash);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};
    await route('#lesson/B/math/0/2');
    await page.locator('#app-voice').click();
    assert.equal(await page.locator('#app-voice').getAttribute('aria-pressed'),'true');
    assert.deepEqual(errors,[]);
    assert.equal(await page.evaluate(()=>voiceCalls[0].lang),'el-GR');
    assert.ok(await page.evaluate(()=>voiceCalls[0].text.trim().length>0));
    await page.locator('#app-voice').click();
    assert.equal(await page.locator('#app-voice').getAttribute('aria-pressed'),'false');
    await route('#lesson/B/ancient/0/2');
    await page.locator('#catalogue [data-go="voc"]').click();
    assert.ok((await page.evaluate(()=>currentReadingText())).includes(await page.locator('#catalogue .vcard strong').innerText()),'Reads vocabulary card');
    await page.locator('#catalogue .vcard').click();
    assert.ok((await page.evaluate(()=>currentReadingText())).includes(await page.locator('#catalogue .vcard strong').innerText()),'Reads flipped vocabulary card');
    await route('#lesson/B/math/0/2');
    await page.locator('#catalogue [data-go="quiz"]').click();
    const spokenQuiz = await page.evaluate(()=>currentReadingText());
    assert.ok(spokenQuiz.includes(await page.locator('#catalogue .qcard h3').innerText()));
    for(const option of await page.locator('#catalogue .opt').allTextContents()){
      assert.ok(spokenQuiz.includes(option.trim().slice(1).trim()),'Reads quiz choices');
    }
    await page.locator('#app-voice').click();
    await page.locator('#catalogue .opt').first().click();
    assert.equal(await page.locator('#app-voice').getAttribute('aria-pressed'),'false','Stops when quiz content changes');
    await page.locator('#app-voice').click();
    await route('#class/B');
    assert.equal(await page.locator('#app-voice').getAttribute('aria-pressed'),'false','Stops on navigation');
    for(const g of catalogue.grades){
      await route(`#class/${g.id}`);
      assert.equal(await page.locator('.subject-card').count(),g.subjects.length);
      for(const s of g.subjects){
        await route(`#course/${g.id}/${s.id}`);
        assert.equal(await page.locator('#catalogue h2').textContent(),s.name);
        assert.equal(await page.locator('#course-books article').count(),s.books.length);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${g.id}/${s.id} overflows mobile`);
      }
      const s=g.subjects.find(subject=>subject.books.some(book=>book.sections.length));
      const bi=s.books.findIndex(book=>book.sections.length);
      await route(`#lesson/${g.id}/${s.id}/${bi}/0`);
      assert.equal(await page.locator('#catalogue .seg button').count(),4);
      assert.equal(await page.locator('#catalogue .slide').count(),1);
      await page.locator('#catalogue [data-oview="quiz"]').click();
      assert.ok(await page.locator('#catalogue .opt').count()>=3);
      await page.locator('#catalogue [data-oview="ex"]').click();
      assert.equal(await page.locator('#catalogue [data-otask]').count(),5);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${g.id} lesson overflows mobile`);
    }
    for(let unit=1;unit<=18;unit++){
      await route(`#lesson/A/ancient/0/${unit}`);
      assert.equal(await page.locator('#catalogue .seg button').count(),5,`Ancient unit ${unit} has five study tabs`);
      assert.equal(await page.locator('#catalogue [data-oview="grammar"]').count(),1,`Ancient unit ${unit} has grammar tab`);
      await page.locator('#catalogue [data-oview="grammar"]').click();
      assert.match(await page.locator('#catalogue .blk .k').textContent(),/Γραμματική/);
      assert.equal(await page.locator('#catalogue [data-oview="quiz"]').count(),1,`Ancient unit ${unit} has Quiz tab`);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Ancient unit ${unit} overflows mobile`);
    }
    await route('#class/A');
    await page.locator('#catalogue-query').fill('κλασματα');
    assert.ok(await page.locator('.search-hit').count()>0,'Accent-insensitive lesson search');
    await page.locator('#catalogue-query').fill('Οικονομικά');
    assert.equal(await page.locator('.subject-card').count(),0);
    await page.locator('#all-grades').check();
    assert.equal(await page.locator('.subject-card[href="#course/C/economics"]').count(),1);
    await page.locator('#catalogue-query').fill('<img src=x onerror=alert(1)>');
    assert.equal(await page.locator('.empty-state').count(),1);
    await route('#course/A/math');
    await page.locator('#lesson-query').fill('κλασματα');
    assert.ok(await page.locator('.lesson-item:visible').count()>0);
    await route('#lesson/A/math/0/2');
    assert.match(await page.locator('#catalogue .slide').innerText(),/φυσικοί αριθμοί/i);
    await page.locator('#catalogue [data-oview="voc"]').click();
    assert.match(await page.locator('#catalogue .slide').innerText(),/Αριθμός του συνόλου Ν/);
    await page.locator('#catalogue [data-oview="quiz"]').click();
    assert.equal(await page.locator('#catalogue .opt').count(),4);
    await page.locator('#catalogue [data-oview="ex"]').click();
    assert.equal(await page.locator('#catalogue [data-otask]').count(),3);
    await page.locator('#catalogue [data-otask="0"]').click();
    assert.match(await page.locator('#catalogue .sol').first().innerText(),/72\.506/);
    await page.locator('#themebtn').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
    await page.evaluate(()=>localStorage.setItem('diab-best',JSON.stringify({'B/math/0/2':18})));
    await route('#course/B/math');
    assert.match(await page.locator('.lesson-item[href="#lesson/B/math/0/2"]').innerText(),/18\/20/);
    for(const key of ['B/math/0/2','B/math/0/3','B/ancient/0/1','B/ancient/0/2','B/translated/0/2','B/translated/0/6']){
      await route('#lesson/'+key);
      assert.equal(await page.locator('#grade-nav [aria-current]').innerText(),'Β΄ Γυμνασίου');
      await page.locator('#catalogue [data-go="quiz"]').click();
      assert.equal(await page.locator('#catalogue .opt').count(),4);
    }
    await route('#course/B/translated');
    assert.equal(await page.locator('.lesson-item[href="#lesson/B/translated/0/2"]').count(),3,'Rhapsody A covers three book sections');
    for(const old of ['#F','#F/1.1','#M/A1.1','#G/u1','#A/r3','#send/F/1.1']){
      await route(old);
      assert.equal(await page.locator('#catalogue .seg').count(),0,`Old route ${old} no longer opens a unit`);
    }
    await route('#practice');
    await page.locator('[data-subj="physics"]').click();
    await page.locator('[data-sel="B/physics/0/4"]').click();
    await page.locator('[data-px="start"]').click();
    assert.equal(await page.locator('#practice .opt').count(),4);
    await page.locator('#practice .opt').first().click();
    assert.equal(await page.locator('#practice .opt:disabled').count(),4);
    await route('#class/C');
    await route('#practice');
    assert.equal(await page.locator('#practice .opt').count(),0,'B quizzes must not appear as C material');
    await route('#timer');assert.equal(await page.locator('#tclock').innerText(),'25:00');
    await route('#class/A');await route('#class/C');await page.goBack();
    await page.waitForFunction(()=>document.querySelector('#grade-nav [aria-current]')?.textContent==='Α΄ Γυμνασίου');
    await page.reload();assert.equal(await page.locator('#grade-nav [aria-current]').innerText(),'Α΄ Γυμνασίου');
    await route('#course/A/missing');assert.match(await page.locator('#catalogue').innerText(),/δεν βρέθηκε/);
    await route('#%E0%A4%A');assert.equal(await page.locator('.subject-card').count(),22);
    await route('#class/C');
    for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
    await context.setOffline(true);
    await page.reload();
    assert.equal(await page.locator('.subject-card').count(),23,'Catalogue available offline');
    assert.equal(await page.locator('[data-connection].offline').count(),1);
    await route('#lesson/B/ancient/0/1');assert.equal(await page.locator('#catalogue .seg').isVisible(),true);
    await context.setOffline(false);
    const isolated=await browser.newContext();
    await isolated.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('Storage blocked');}});});
    const fresh=await isolated.newPage();fresh.on('pageerror',e=>errors.push(e.message));await fresh.goto(base+'/#class/A');
    assert.equal(await fresh.locator('.subject-card').count(),22,'Works with storage blocked');
    assert.deepEqual(errors,[]);
    console.log('PASS: 67 subject routes; official lesson cards/quizzes/activities for all grades; search; 6 content/ units under their book sections; old routes closed; scores; exams; class isolation; back/reload; malformed routes; mobile/desktop; offline; blocked storage.');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
