/* Datums- und Wochenvergleich: unabhängige CSV-Referenz und echte Bedienwege. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..');
const reference=JSON.parse(fs.readFileSync(path.join(root,'.qa/reference.json'),'utf8'));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

async function checkPeriod(page,key) {
  const expected=reference.periods[key];
  const actual=await page.evaluate(()=>({window:progressWindow(),assessments:progressAssessments(filtered()),dates:filtered().map(s=>s.date)}));
  for(const field of ['from','to','days'])assert.equal(actual.window[field],expected[field]);
  assert.deepEqual(actual.assessments.map(a=>a.name).sort(),Object.keys(expected.assessments).sort());
  assert.ok(actual.dates.every(d=>d>=expected.from && d<=expected.to));
  for(const a of actual.assessments) {
    const e=expected.assessments[a.name];
    assert.ok(a.points.every(p=>p.date>=expected.from && p.date<=expected.to));
    assert.ok((a.before||[]).concat(a.after||[]).every(p=>p.date>=expected.from && p.date<=expected.to));
    const starts=new Set((a.before||[]).map(p=>p.start+'|'+p.split));
    assert.ok((a.after||[]).every(p=>!starts.has(p.start+'|'+p.split)));
    for(const field of ['count','beforeCount','afterCount','status','confidence'])assert.equal(a[field],e[field],`${key}, ${a.name}, ${field}`);
    if(e.pct===undefined)assert.equal(a.pct,undefined);
    else {
      for(const field of ['first','last','pct'])near(a[field],e[field]);
      for(const field of ['before','after'])assert.deepEqual(a[field].map(p=>[p.start,p.split]),e[field]);
    }
  }
}

(async()=>{
  for(const [engineName,engine] of Object.entries({chromium,webkit})) {
    const browser=await engine.launch({headless:true});
    for(const width of [1440,375]) {
      const page=await browser.newPage({viewport:{width,height:950},hasTouch:width===375,isMobile:width===375});
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      await page.goto(pathToFileURL(path.join(root,'index.html')).href);
      await page.locator('#progress-overview [data-progress-mode="weeks"]').click();
      await checkPeriod(page,'weeks4');
      const weeks=page.locator('#progress-period [name="weeks"]');
      for(const invalid of ['0','-3','2.5','105','']) {
        await weeks.fill(invalid);
        await page.locator('#progress-period button[type="submit"]').click();
        assert.equal(await page.evaluate(()=>state.weeks),4);
        assert.match(await page.locator('#progress-period .form-error').textContent(),/1 bis 104/);
      }
      await weeks.fill('6');await weeks.press('Enter');
      await checkPeriod(page,'weeks6');
      assert.match(await page.locator('#filter-summary').textContent(),/6 Wochen/);
      await weeks.fill('1');await weeks.press('Enter');
      await checkPeriod(page,'weeks1');
      await page.locator('#filter-panel > summary').click();
      await page.locator('#split-chips .chip').filter({hasText:/^Push/}).click();
      await checkPeriod(page,'weeks1Push');
      assert.equal(await page.evaluate(()=>progressAssessments(filtered()).every(a=>a.pct===undefined)),true);
      await page.locator('#filter-panel > summary').click();
      await page.evaluate(()=>document.documentElement.dataset.theme='dark');
      await page.locator('#progress-overview').screenshot({path:path.join(root,`.qa/short-weeks-${engineName}-${width}.png`),animations:'disabled'});
      assert.equal(await page.locator('[name="fallback"]').count(),0);
      assert.doesNotMatch(await page.locator('#progress-overview').innerText(),/Vorzeitraum|Ersatzvergleich/);
      await page.locator('#filter-panel > summary').click();
      await page.locator('#split-chips .chip').filter({hasText:/^Push/}).click();
      await page.locator('#filter-panel > summary').click();
      await weeks.fill('6');await weeks.press('Enter');
      const chosen=await page.evaluate(()=>progressAssessments(filtered()).find(a=>a.pct!==undefined)?.name);
      assert.ok(chosen);
      await page.evaluate(name=>openExercise(name),chosen);
      assert.equal(await page.locator('#ex-insight [name="weeks"]').inputValue(),'6');
      await page.locator('#ex-insight details > summary').click();
      assert.equal(await page.locator('#ex-insight tbody tr').count(),reference.periods.weeks6.assessments[chosen].before.length+reference.periods.weeks6.assessments[chosen].after.length);
      // Der Datumsmodus ist auch direkt aus der Übungsansicht nutzbar.
      await page.locator('#ex-insight [data-progress-mode="custom"]').click();
      const from=page.locator('#ex-insight [name="from"]'),to=page.locator('#ex-insight [name="to"]');
      const oldRange=await page.evaluate(()=>activeRange());
      await from.fill('2026-09-10');await to.fill('2026-08-01');
      await page.locator('#ex-insight .period-form button').click();
      assert.deepEqual(await page.evaluate(()=>activeRange()),oldRange);
      assert.match(await page.locator('#ex-insight .form-error').textContent(),/gültiges Start-/);
      await from.fill('');await page.locator('#ex-insight .period-form button').click();
      assert.deepEqual(await page.evaluate(()=>activeRange()),oldRange);
      await from.fill('2026-07-20');await to.fill('2026-08-16');
      await page.locator('#ex-insight .period-form button').click();
      await checkPeriod(page,'custom');
      for(const view of ['overview','exercises','muscles','intensity','records','sessions']) {
        await page.locator('#tab-'+view).click();
        assert.equal(await page.evaluate(()=>state.progressMode),'custom');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      }
      await page.locator('#tab-records').click();
      const recordName=await page.locator('#pr-table .exercise-link').first().textContent();
      await page.locator('#pr-table .exercise-link').first().click();
      assert.equal(await page.evaluate(()=>state.exercise),recordName);
      assert.equal(await page.locator('#panel-exercises').isVisible(),true);
      await page.locator('#tab-overview').click();
      assert.equal(await page.locator('#progress-period [name="from"]').inputValue(),'2026-07-20');
      for(const theme of ['light','dark']) {
        await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
        await page.locator('#progress-overview').screenshot({path:path.join(root,`.qa/period-${engineName}-${width}-${theme}.png`)});
      }
      // Beide Vergleichsgruppen bleiben innerhalb derselben Split- und Datumsauswahl.
      await page.locator('#filter-panel > summary').click();
      await page.locator('#split-chips .chip').first().click();
      assert.equal(await page.evaluate(()=>progressAssessments(filtered()).every(a=>(a.before||[]).concat(a.after||[]).every(p=>state.splits.has(p.split)))),true);
      await page.locator('[data-range="weeks"]').click();
      await page.locator('#weeks-range input').fill('4');await page.locator('#weeks-range button').click();
      assert.equal(await page.locator('#progress-period [name="weeks"]').inputValue(),'4');
      await page.locator('#reset-filters').click();
      assert.equal(await page.evaluate(()=>state.progressMode),'recent');
      // Auch ein weit gefasster Zeitraum nutzt nur vorhandene Einheiten innerhalb der Auswahl.
      await page.locator('#progress-overview [data-progress-mode="weeks"]').click();
      await page.locator('#progress-period [name="weeks"]').fill('104');await page.locator('#progress-period button[type="submit"]').click();
      assert.equal(await page.evaluate(()=>progressAssessments(filtered()).some(a=>a.status!=='unclear')),true);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      const edgeCases=await page.evaluate(()=>{
        const csv='Name,StartTime,Exercise,Reps,Weight,Status\n'+[999,50,60,65,67,70,80,90,999].map((w,i)=>'Push,2026-01-'+String(i+1).padStart(2,'0')+'T12:00:00Z,Test,5,'+w+',Done').join('\n');
        const ss=buildData(csv).sessions,window={from:'2026-01-02',to:'2026-01-08'};
        const full=exerciseTrend(ss,'Test','custom',window);
        const even=exerciseTrend(ss,'Test','custom',{from:'2026-01-03',to:'2026-01-06'});
        const two=exerciseTrend(ss,'Test','custom',{from:'2026-01-02',to:'2026-01-03'});
        const one=exerciseTrend(ss,'Test','custom',{from:'2026-01-02',to:'2026-01-02'});
        const empty=exerciseTrend(ss,'Test','custom',{from:'2026-02-01',to:'2026-02-28'});
        loadCSV(csv,'Zeitraumtest.csv');
        const mode=state.progressMode,range=state.range;
        state.range='custom';state.progressMode='custom';state.from=window.from;state.to=window.to;
        const assessment=exerciseAssessment(filtered(),'Test');
        const amount=comparisonData();
        state.to=state.from;const singleDay=comparisonData();
        return {full,even,two,one,empty,assessment,amount,singleDay,mode,range};
      });
      near(edgeCases.full.first,60*7/6);near(edgeCases.full.last,80*7/6);near(edgeCases.full.pct,100/3);
      assert.equal(edgeCases.full.count,7);assert.equal(edgeCases.full.before[0].date,'2026-01-02');
      assert.equal(edgeCases.full.after.at(-1).date,'2026-01-08');
      near(edgeCases.even.first,62.5*7/6);near(edgeCases.even.last,68.5*7/6);
      near(edgeCases.two.pct,20);assert.equal(edgeCases.two.beforeCount,1);
      assert.equal(edgeCases.one.pct,undefined);assert.equal(edgeCases.one.count,1);
      assert.equal(edgeCases.empty.pct,undefined);assert.equal(edgeCases.empty.count,0);
      assert.equal(edgeCases.assessment.status,'up');assert.equal(edgeCases.assessment.confidence,'solid');
      assert.equal(edgeCases.amount.firstFrom,'2026-01-02');assert.equal(edgeCases.amount.firstTo,'2026-01-04');
      assert.equal(edgeCases.amount.lastFrom,'2026-01-06');assert.equal(edgeCases.amount.lastTo,'2026-01-08');
      near(edgeCases.amount.first.volume,(50+60+65)*5);near(edgeCases.amount.last.volume,(70+80+90)*5);
      assert.equal(edgeCases.singleDay.halfDays,0);
      assert.equal(edgeCases.mode,'recent');assert.equal(edgeCases.range,'all');
      assert.deepEqual(errors,[]);
      console.log(`OK: ${engineName}, ${width}px – Wochen, Datum, Median, Referenzdaten, Eingabefehler und Historie`);
      await page.close();
    }
    await browser.close();
  }
})().catch(e=>{console.error(e);process.exit(1);});
