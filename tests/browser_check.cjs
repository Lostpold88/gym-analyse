/* Aufruf nach Build und reference_metrics.py. Playwright nur als Testwerkzeug. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium, webkit} = require('playwright');
const root = path.resolve(__dirname, '..');
const reference = JSON.parse(fs.readFileSync(path.join(root,'.qa/reference.json'),'utf8'));
const near = (actual,expected) => assert.ok(Math.abs(actual-expected)<1e-6,`${actual} != ${expected}`);
const fixture = 'Name,StartTime,Exercise,Reps,Weight,IsWarmup,Status\n' +
  [60,65,70,75,80,85].map((w,i)=>`Push,2026-06-${String(i+1).padStart(2,'0')}T12:00:00Z,"Drücken, eng",5,${w},false,Done`).join('\n');

(async()=>{
  for(const [name,engine] of Object.entries({chromium,webkit})) {
    const browser=await engine.launch({headless:true});
    for(const width of [1440,375]) {
      const context=await browser.newContext({viewport:{width,height:900},hasTouch:width===375,isMobile:width===375,deviceScaleFactor:1});
      const page=await context.newPage(), errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      await page.goto(pathToFileURL(path.join(root,'index.html')).href);
      const actual=await page.evaluate(()=>({sets:DATA.sets.length,sessions:DATA.sessions.length,
        volume:DATA.sets.reduce((n,s)=>n+s.volume,0),reps:DATA.sets.reduce((n,s)=>n+s.reps,0),
        comparison:comparisonData(),muscles:Object.fromEntries(muscleTotals(DATA.sets,'primary').map(m=>[m.cat,m.sets]))}));
      for(const key of ['sets','sessions','volume','reps'])near(actual[key],reference.total[key]);
      assert.equal(await page.evaluate(()=>DATA.excludedExercises.sets),reference.excludedSets);
      assert.equal(await page.evaluate(()=>DATA.sets.some(s=>EXCLUDED_EXERCISES.has(s.exercise))),false);
      const exclusion=await page.evaluate(csv=>{
        const extra=[...EXCLUDED_EXERCISES].map(name=>'Push,2026-06-09T12:00:00Z,'+name+',5,40,false,Done').join('\n');
        const data=buildData(csv+'\n'+extra);
        return {sets:data.sets.length,excluded:data.excludedExercises.sets,exercises:[...new Set(data.sets.map(s=>s.exercise))]};
      },fixture);
      assert.equal(exclusion.sets,6);assert.equal(exclusion.excluded,3);assert.deepEqual(exclusion.exercises,['Drücken, eng']);
      for(const period of ['first','last']) for(const key of ['sets','sessions','volume','perSession'])near(actual.comparison[period][key],reference[period][key]);
      assert.deepEqual(actual.muscles,reference.muscles);
      const progress=await page.evaluate(()=>Object.fromEntries([...new Set(DATA.sets.map(s=>s.exercise))].map(name=>[name,repsByWeight(exerciseSessions(DATA.sessions,name))])));
      for(const [name,rows] of Object.entries(reference.progress))assert.deepEqual(progress[name],rows);
      for(const mode of ['recent','start']) {
        const assessments=await page.evaluate(mode=>Object.fromEntries([...new Set(DATA.sets.map(s=>s.exercise))].map(name=>[name,exerciseAssessment(DATA.sessions,name,mode)])),mode);
        for(const [name,expected] of Object.entries(reference.trends[mode])) {
          const a=assessments[name];assert.equal(a.count,expected.count);assert.equal(a.status,expected.status);
          if(expected.pct!==undefined) {
            for(const key of ['first','last','pct'])near(a[key],expected[key]);
            for(const key of ['before','after'])assert.deepEqual(a[key].map(p=>[p.start,p.split]),expected[key]);
          }
        }
      }
      await page.screenshot({path:path.join(root,`.qa/${name}-${width}-start.png`)});
      for(const theme of ['light','dark']) {
        await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
        for(const property of ['backgroundColor','color','borderColor','boxShadow']) {
          assert.equal(await page.locator('.hero').evaluate((e,p)=>getComputedStyle(e)[p],property),
            await page.locator('.summary-card .tiles').evaluate((e,p)=>getComputedStyle(e)[p],property));
        }
        for(const view of ['overview','exercises','muscles','intensity','records','sessions']) {
          await page.locator(`#tabs [data-view="${view}"]`).click();
          await page.waitForTimeout(80);
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${name} ${width} ${view} Überlauf`);
          assert.equal(await page.locator(`#panel-${view}`).isVisible(),true);
          assert.doesNotMatch(await page.locator(`#panel-${view}`).innerText(),/Hammer Curls|JM-Press|Beinpresse \(Sitzend\)/);
          await page.screenshot({path:path.join(root,`.qa/${name}-${width}-${theme}-${view}.png`),fullPage:true});
        }
      }
      // Die Fortschrittsliste filtert, sucht und öffnet die richtige Übung.
      await page.locator('#tab-overview').click();
      await page.locator('[data-progress-filter="down"]').click();
      assert.ok(await page.locator('.progress-row').count()>0);
      assert.equal(await page.locator('.progress-row:not(.down)').count(),0);
      await page.locator('#progress-all').click();
      await page.locator('#progress-search').fill('Trizeps');
      assert.equal(await page.locator('.progress-row').count(),2);
      await page.locator('#progress-search').fill('Eine unbekannte Übung');
      assert.equal(await page.locator('.progress-row').count(),0);
      await page.locator('#progress-search').fill('');
      await page.locator('#progress-more').click();
      assert.equal(await page.locator('.progress-row').count(),Object.keys(reference.trends.recent).length);
      await page.locator('#progress-overview [data-progress-mode="start"]').click();
      assert.equal(await page.evaluate(()=>state.progressMode),'start');
      await page.locator('#progress-overview [data-progress-mode="recent"]').click();
      const selected=await page.locator('.progress-row').first().getAttribute('data-exercise');
      await page.locator('.progress-row').first().click();
      assert.equal(await page.evaluate(()=>state.exercise),selected);
      await page.locator('#ex-insight summary').click();
      assert.equal(await page.locator('#ex-insight tbody tr').count(),6);
      await page.locator('#ex-insight [data-progress-mode="start"]').click();
      assert.equal(await page.evaluate(()=>state.progressMode),'start');
      await page.locator('#ex-insight [data-progress-mode="recent"]').click();
      // Native Tastaturnavigation und Sortierung.
      await page.locator('#tab-overview').focus();await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#tab-exercises').getAttribute('aria-selected'),'true');
      await page.locator('#ex-btn').click();assert.equal(await page.locator('#ex-list').isVisible(),true);
      assert.equal(await page.locator('#ex-list').evaluate(e=>e.getBoundingClientRect().right<=innerWidth && e.getBoundingClientRect().left>=0),true);
      await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
      assert.equal(await page.locator('#ex-list').isVisible(),false);
      await page.locator('#tab-records').click();
      await page.locator('#pr-table th button').first().click();
      assert.notEqual(await page.locator('#pr-table th').first().getAttribute('aria-sort'),'none');
      await page.locator('#tab-overview').click();
      if(width===375) {
        await page.locator('#tab-sessions').click();
        await page.locator('.session-card > summary').first().tap();
        assert.equal(await page.locator('.session-card').first().getAttribute('open'),'');
        await page.locator('.session-sort select').selectOption('volume');
        await page.locator('#tab-overview').click();
        await page.locator('#sessvol-chart .hit').first().tap();
        await page.waitForFunction(()=>getComputedStyle(document.getElementById('tt')).opacity==='1');
        assert.equal(await page.locator('#tt').evaluate(e=>getComputedStyle(e).opacity),'1');
      }
      if(!await page.locator('#filter-panel').evaluate(e=>e.open))await page.locator('#filter-panel > summary').click();
      await page.locator('[data-range="custom"]').click();
      await page.locator('#date-from').fill('2026-07-01');await page.locator('#date-from').dispatchEvent('change');
      await page.locator('#date-to').fill('2026-07-31');await page.locator('#date-to').dispatchEvent('change');
      assert.equal(await page.evaluate(()=>activeRange().from),'2026-07-01');
      await page.locator('[data-range="30"]').click();
      assert.equal(await page.evaluate(()=>daysBetween(activeRange().from,activeRange().to)+1),30);
      await page.locator('#split-chips .chip').first().click();
      assert.equal(await page.evaluate(()=>new Set(filtered().map(s=>s.split)).size),1);
      await page.locator('#reset-filters').click();
      await page.locator('[data-tbl="week"][data-mode="table"]').click();
      assert.equal(await page.locator('#week-table').isVisible(),true);
      // Defekte Exporte dürfen weder Daten noch Quelle überschreiben.
      for(const bad of ['Exercise,Reps\nA,2', 'Name,StartTime,Exercise,Reps,Weight\nPush,2026-02-30,A,5,10', fixture+'\n"offen', fixture+'\nPush,2026-06-08,A,5,abc']) {
        const kept=await page.evaluate(text=>{const old=DATA,raw=RAW_CSV;return loadCSV(text,'kaputt.csv')===false && DATA===old && RAW_CSV===raw;},bad);
        assert.equal(kept,true);
      }
      // Quoten, optionale Spalten, deutsches Dezimalformat, Import per Datei.
      await page.locator('#file-input').setInputFiles({name:'test.csv',mimeType:'text/csv',buffer:Buffer.from(fixture)});
      await page.waitForFunction(()=>DATA.sessions.length===6);
      assert.equal(await page.evaluate(()=>state.range),'all');
      const trend=await page.evaluate(()=>exerciseTrend(filtered(),'Drücken, eng'));
      near(trend.first,65*(1+5/30));near(trend.last,80*(1+5/30));near(trend.pct,100*(80-65)/65);
      // Gegenläufige Entwicklung: langfristig verbessert, zuletzt zurückgegangen.
      const directionCases=await page.evaluate(()=>{
        const data=(weights,name='Test')=>buildData('Name,StartTime,Exercise,Reps,Weight,Status\n'+weights.map((w,i)=>'Push,2026-06-'+String(i+1).padStart(2,'0')+'T12:00:00Z,'+name+',5,'+w+',Done').join('\n')).sessions;
        const ss=data([50,50,50,80,80,80,65,65,65]);
        return {recent:exerciseAssessment(ss,'Test','recent','2026-06-09'),start:exerciseAssessment(ss,'Test','start','2026-06-09'),
          outlier:exerciseAssessment(data([60,60,600,66,66,66]),'Test','recent','2026-06-09'),
          stable:exerciseAssessment(data([60,60,60,61,61,61]),'Test','recent','2026-06-09'),
          short:exerciseAssessment(data([60,60,60,61,61]),'Test','recent','2026-06-09'),
          stale:exerciseAssessment(ss,'Test','recent','2026-09-09'),
          bodyweight:exerciseAssessment(data([60,60,60,70,70,70],'Klimmzüge'),'Klimmzüge','recent','2026-06-09')};
      });
      assert.equal(directionCases.recent.status,'down');near(directionCases.recent.pct,-18.75);
      assert.equal(directionCases.start.status,'up');near(directionCases.start.pct,30);
      assert.equal(directionCases.outlier.status,'up');near(directionCases.outlier.pct,10);
      assert.equal(directionCases.stable.status,'stable');
      assert.equal(directionCases.short.status,'stable');assert.equal(directionCases.short.confidence,'early');
      for(const key of ['stale','bodyweight'])assert.equal(directionCases[key].status,'unclear');
      const example='Name,StartTime,Exercise,Reps,Weight,Status\n'+[
        'Push,2026-06-01T10:00:00Z,A,4,50,Done',
        'Push,2026-06-01T10:00:00Z,A,6,50,Done',
        'Push,2026-06-02T10:00:00Z,A,8,50,Done',
        'Upper,2026-06-02T14:00:00Z,A,9,50,Done',
        'Upper,2026-06-02T14:00:00Z,A,99,50,Failed',
        'Upper,2026-06-02T14:00:00Z,A,8,60,Done',
        'Upper,2026-06-02T14:00:00Z,A,1,70,Failed'
      ].join('\n');
      const paired=await page.evaluate(csv=>repsByWeight(exerciseSessions(buildData(csv).sessions,'A')),example);
      assert.equal(paired.length,2);assert.equal(paired[0].delta,null);assert.equal(paired[0].count,1);
      assert.equal(paired[1].count,3);assert.equal(paired[1].first.reps,6);assert.equal(paired[1].last.reps,9);assert.equal(paired[1].delta,3);
      assert.equal(await page.locator('#work-only').count(),0);
      assert.equal(await page.locator('body').innerText().then(t=>/Aufwärm|Arbeitssätze/.test(t)),false);
      assert.equal(await page.evaluate(()=>num('27,5')),27.5);
      assert.equal(await page.evaluate(()=>fDur(59.8)),'1 h 00 min');
      assert.equal(await page.evaluate(()=>Number.isFinite(parseTimestamp('2026-06-01 12:00:00'))),true);
      // Leerer Zeitraum und fehlende Vergleichshistorie.
      await page.evaluate(()=>{state.range='custom';state.from='2027-01-01';state.to='2027-01-31';render();});
      assert.equal(await page.locator('#hero-val').textContent(),'0 kg');
      await page.locator('#tab-exercises').click();
      assert.match(await page.locator('#ex-insight').textContent(),/Keine Übungen/);
      await page.evaluate(()=>{state.range='all';render();});
      assert.deepEqual(await page.evaluate(()=>{const c=comparisonData();return [c.firstFrom,c.firstTo,c.lastFrom,c.lastTo];}),['2026-06-01','2026-06-03','2026-06-04','2026-06-06']);
      assert.equal(errors.length,0,errors.join('\n'));
      console.log(`OK: ${name}, ${width}px – Zahlen, sechs Ansichten, Hell/Dunkel, Filter, Import und Trends`);
      await context.close();
    }
    await browser.close();
  }
})().catch(e=>{console.error(e);process.exit(1);});
