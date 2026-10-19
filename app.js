(function(){
var DATA=window.AP_DATA,exercises=DATA.exercises,sections=DATA.sections;
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return Array.from((r||document).querySelectorAll(s))};
var storageKey='pick-lab-progress-v1',saved=JSON.parse(localStorage.getItem(storageKey)||'{}');
saved.done=saved.done||{};saved.notes=saved.notes||{};saved.session=saved.session||{};saved.week=saved.week||{};
var state={filter:'all',query:'',selected:1,startStroke:'down'},timer={seconds:60,handle:null,running:false};
$('#statExercises').textContent=DATA.meta.exerciseCount;
$('#statMeasures').textContent=DATA.meta.measureCount;
$('#statTempo').textContent=DATA.meta.tempo;

function persist(){localStorage.setItem(storageKey,JSON.stringify(saved));updateProgress()}
function toast(msg){var el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(function(){el.classList.remove('show')},2200)}
function doneCount(){return Object.keys(saved.done).filter(function(k){return saved.done[k]}).length}
function filtered(){
  var q=state.query.trim().toLowerCase();
  return exercises.filter(function(e){
    return (state.filter==='all'||e.section===state.filter)&&(!q||[e.title,e.sourceLabel,e.sectionLabel,e.patternLabel,e.bars,String(e.fretMin),String(e.fretMax),e.isFigure?'figure':''].join(' ').toLowerCase().indexOf(q)>=0)
  })
}
function updateProgress(){
  var total=exercises.length,done=doneCount();
  $('#roadSummary').textContent=done+' / '+total+' completed';
  $('#drillSummary').textContent='Showing '+filtered().length+' of '+total+' exercises';
  $$('.road-card').forEach(function(c){
    var ids=exercises.filter(function(e){return e.section===c.dataset.section}).map(function(e){return e.id});
    var n=ids.filter(function(id){return saved.done[id]}).length;
    $('.road-progress',c).textContent=n+'/'+ids.length
  })
}
function renderRoadmap(){
  $('#roadmapGrid').innerHTML=sections.map(function(s,i){
    return '<article class="road-card'+(state.filter===s.key?' current':'')+'" data-section="'+s.key+'" tabindex="0" role="button"><div class="road-num">0'+(i+1)+' · '+s.start+'–'+s.end+'<span class="road-progress">0/'+(s.end-s.start+1)+'</span></div><h3>'+s.label+'</h3><p>'+s.blurb+'</p><div class="road-range">Exercises '+s.start+'–'+s.end+'</div></article>'
  }).join('');
  $$('.road-card').forEach(function(c){
    var open=function(){
      state.filter=c.dataset.section;state.query='';$('#searchInput').value='';
      renderFilters();renderList();renderRoadmap();
      document.querySelector('#drills').scrollIntoView({behavior:'smooth'})
    };
    c.addEventListener('click',open);
    c.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}})
  });
  updateProgress()
}
function renderFilters(){
  var labels=[['all','All drills']].concat(sections.map(function(s){return [s.key,s.label.split(' · ')[0]]}));
  $('#filterBar').innerHTML=labels.map(function(x){return '<button class="filter'+(state.filter===x[0]?' active':'')+'" data-filter="'+x[0]+'" type="button">'+x[1]+'</button>'}).join('');
  $$('.filter').forEach(function(b){b.addEventListener('click',function(){state.filter=b.dataset.filter;renderFilters();renderList();renderRoadmap()})})
}
function renderList(){
  var list=filtered();
  var label=state.filter==='all'?'all sections':sections.find(function(s){return s.key===state.filter}).label.split(' · ')[0];
  $('#drillList').innerHTML='<div class="list-heading"><strong>'+list.length+' drills</strong><span>'+label+'</span></div>'+
    (list.length?list.map(function(e){return '<button class="drill-item'+(e.id===state.selected?' active':'')+(saved.done[e.id]?' done':'')+'" data-id="'+e.id+'" type="button"><span class="drill-no">'+String(e.id).padStart(2,'0')+'</span><span><span class="drill-name">'+e.title+'</span><span class="drill-meta">m. '+e.bars+' · '+e.patternLabel+'</span></span><span class="drill-check">'+(saved.done[e.id]?'✓':'')+'</span></button>'}).join(''):'<div class="empty">No drills match that search.</div>');
  $$('.drill-item').forEach(function(b){b.addEventListener('click',function(){state.selected=Number(b.dataset.id);renderList();renderDetail()})});
  updateProgress()
}
function esc(x){return String(x).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function tabSnapshot(ex){
  var n=ex.firstPattern.length;
  return [6,5,4,3,2,1].map(function(s){
    var cells=Array.from({length:n},function(){return '·'});
    ex.firstPattern.forEach(function(p,i){if(p.string===s)cells[i]=String(p.fret).padStart(2,' ')});
    return s+' | '+cells.join(' ')
  }).join('\n')
}
function routeSnapshot(ex){
  return ex.measurePatterns.map(function(m){
    return 'm. '+m.measure+'  '+m.notes.map(function(p){return p.string+':'+p.fret}).join('  ')+(m.text?'  ['+m.text+']':'')
  }).join('\n')
}
function renderPickMap(ex){
  return ex.firstPattern.map(function(p,i){
    var up=state.startStroke==='up'?i%2===0:i%2===1;
    return '<span class="pick-chip'+(up?' up':'')+'"><span class="stroke">'+(up?'↑':'↓')+'</span><span>'+p.string+':'+p.fret+'</span></span>'
  }).join('')
}
function svgFretboard(ex){
  var min=ex.fretMin,max=ex.fretMax,start=min<=1?0:Math.max(0,min-1),end=Math.max(start+6,Math.min(20,start+8));
  if(max>end){end=Math.min(20,max+1);start=Math.max(0,end-8)}
  var count=end-start+1,W=820,H=252,x0=72,x1=780,y0=42,y1=199,cw=(x1-x0)/count,sy=(y1-y0)/5;
  var out='<svg class="fretboard-svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Fretboard diagram for '+esc(ex.title)+'"><defs><linearGradient id="wood" x1="0" x2="1"><stop offset="0" stop-color="#7c5938"/><stop offset=".52" stop-color="#b38350"/><stop offset="1" stop-color="#6b482d"/></linearGradient></defs><rect x="54" y="17" width="748" height="210" rx="16" fill="url(#wood)" opacity=".84"/>';
  for(var i=0;i<=count;i++){var x=x0+i*cw;out+='<line x1="'+x+'" y1="'+(y0-13)+'" x2="'+x+'" y2="'+(y1+12)+'" stroke="'+(i===0?'#f6e4c2':'rgba(38,20,8,.5)')+'" stroke-width="'+(i===0?6:1.4)+'"/>'}
  for(var j=0;j<6;j++){var y=y0+j*sy;out+='<line x1="'+(x0-2)+'" y1="'+y+'" x2="'+x1+'" y2="'+y+'" stroke="rgba(248,241,220,.78)" stroke-width="'+(2.6-j*.25)+'"/><text x="'+(x0-22)+'" y="'+(y+4)+'" text-anchor="end" fill="#f8e6c6" font-size="12" font-weight="800">'+(6-j)+'</text>'}
  [3,5,7,9,12,15,17].forEach(function(f){if(f>=start&&f<=end){var x=x0+(f-start+.5)*cw;out+='<circle cx="'+x+'" cy="'+(y1+19)+'" r="'+(f===12?5:3.4)+'" fill="rgba(241,226,199,.72)"/>'}});
  var seen={};
  ex.firstPattern.forEach(function(p,i){
    var key=p.string+'-'+p.fret;if(seen[key])return;seen[key]=1;
    var row=6-p.string,x=p.fret===0?x0-18:x0+(p.fret-start+.5)*cw,y=y0+row*sy,color=['#5be0c7','#f3bd63','#b2a1ff','#ff91a5'][i%4];
    out+='<circle cx="'+x+'" cy="'+y+'" r="15" fill="'+color+'" stroke="#082029" stroke-width="3"/><text x="'+x+'" y="'+(y+4)+'" text-anchor="middle" fill="#061b20" font-size="11" font-weight="900">'+p.fret+'</text>'
  });
  for(var f=start;f<=end;f++){var xx=f===0?x0-18:x0+(f-start+.5)*cw;out+='<text x="'+xx+'" y="'+(H-8)+'" text-anchor="middle" fill="#f4dfbe" font-size="11" font-weight="800">'+(f===0?'open':f)+'</text>'}
  return out+'<text x="200" y="239" fill="#f4dfbe" font-size="10">low E 6 → high e 1</text></svg>'
}
function renderDetail(){
  var ex=exercises.find(function(e){return e.id===state.selected})||exercises[0];state.selected=ex.id;
  var section=sections.find(function(s){return s.key===ex.section}),done=!!saved.done[ex.id];
  $('#detailPanel').innerHTML='<div class="detail-header"><div><h2 class="detail-title">'+esc(ex.title)+'</h2><p class="detail-sub">'+esc(ex.sectionLabel)+' · source measures '+esc(ex.bars)+'</p></div><div class="detail-actions"><button class="btn small" id="prevBtn" type="button">← Prev</button><button class="btn small" id="nextBtn" type="button">Next →</button></div></div>'+
    '<div class="tag-row"><span class="tag teal">'+esc(ex.patternLabel)+'</span><span class="tag amber">'+ex.firstPatternLength+' notes in first bar</span><span class="tag">strings '+ex.strings.join(' · ')+'</span><span class="tag">frets '+ex.fretMin+'–'+ex.fretMax+'</span>'+(ex.isFigure?'<span class="tag">GP3 figure label</span>':'')+'</div>'+
    '<div class="detail-grid"><div class="inner-card"><div class="inner-title"><span>Exact source snapshot</span><strong>m. '+ex.measureStart+'</strong></div><div class="tab-snapshot"><pre>'+esc(tabSnapshot(ex))+'</pre></div><p class="tab-note">The snapshot is the first measure only; the source continues through measure '+ex.measureEnd+(ex.continuationMeasures.length?' with “segue simile…”':'')+'.</p><details class="route-details"><summary>Show full source route · m. '+ex.measureStart+'–'+ex.measureEnd+'</summary><div class="route-scroll"><pre>'+esc(routeSnapshot(ex))+'</pre></div></details></div>'+
    '<div class="inner-card"><div class="inner-title"><span>Pick map</span><strong>'+(state.startStroke==='down'?'↓ first':'↑ first')+'</strong></div><div class="pick-map">'+renderPickMap(ex)+'</div><div class="pick-key"><span><b>↓</b> downstroke</span><span><b>↑</b> upstroke</span><span><b>'+ex.direction+'</b> fret motion</span></div><div class="switch-row"><label class="switch"><input id="strokeToggle" type="checkbox" '+(state.startStroke==='up'?'checked':'')+'> start on upstroke</label></div></div></div>'+
    '<div class="fret-card"><div class="fret-card-head"><h3>First-bar fretboard map</h3><span>'+section.blurb+'</span></div>'+svgFretboard(ex)+'</div>'+
    '<div class="detail-bottom"><div class="practice-box"><h3>'+(done?'Completed — keep it warm':'Practice this loop')+'</h3><p>Play the exact cell slowly, then let the crossing become boring. If the pick catches, drop 10 BPM and restart from the first note.</p><div class="step-list"><div class="step-row"><b>1</b><span>Mute the strings and tap the <strong>'+(state.startStroke==='down'?'down/up':'up/down')+'</strong> pulse.</span></div><div class="step-row"><b>2</b><span>Play the first bar for three clean repetitions.</span></div><div class="step-row"><b>3</b><span>Connect the full measure range, '+(ex.measureCount===1?'then move on.':'m. '+ex.measureStart+'–'+ex.measureEnd+', then move on.')+'</span></div></div></div>'+
    '<div class="notes-box inner-card"><label for="exerciseNotes">Your note for this drill</label><textarea id="exerciseNotes" placeholder="What felt tight? Which tempo was clean?">'+esc(saved.notes[ex.id]||'')+'</textarea><small class="source-note">Saved locally as you type.</small></div></div>'+
    '<div class="detail-footer"><small>Guide section '+esc(section.label)+' · '+ex.totalNotes+' source notes across '+ex.measureCount+' measure'+(ex.measureCount===1?'':'s')+'.</small><button class="btn '+(done?'':'primary')+'" id="completeBtn" type="button">'+(done?'Mark incomplete':'Mark complete')+'</button></div>';
  $('#prevBtn').addEventListener('click',function(){moveSelection(-1)});$('#nextBtn').addEventListener('click',function(){moveSelection(1)});
  $('#completeBtn').addEventListener('click',function(){saved.done[ex.id]=!done;persist();renderList();renderDetail();toast(saved.done[ex.id]?'Exercise '+ex.id+' marked complete':'Exercise '+ex.id+' reopened')});
  $('#strokeToggle').addEventListener('change',function(e){state.startStroke=e.target.checked?'up':'down';renderDetail()});
  $('#exerciseNotes').addEventListener('input',function(e){saved.notes[ex.id]=e.target.value;persist()})
}
function moveSelection(delta){var list=filtered();if(!list.length)return;var i=list.findIndex(function(e){return e.id===state.selected});i=(i+delta+list.length)%list.length;state.selected=list[i].id;renderList();renderDetail()}
$('#searchInput').addEventListener('input',function(e){state.query=e.target.value;renderList()});
var sessionInputs=$$('#sessionChecklist input');
function loadSession(){sessionInputs.forEach(function(i){i.checked=!!saved.session[i.dataset.session];i.closest('.check').classList.toggle('done',i.checked);i.addEventListener('change',function(){saved.session[i.dataset.session]=i.checked;persist();i.closest('.check').classList.toggle('done',i.checked)})})}
function renderWeek(){var days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];$('#weekGrid').innerHTML=days.map(function(d){return '<label class="day"><span>'+d+'</span><input type="checkbox" data-day="'+d+'" '+(saved.week[d]?'checked':'')+'></label>'}).join('');$$('#weekGrid input').forEach(function(i){i.addEventListener('change',function(){saved.week[i.dataset.day]=i.checked;persist()})})}
function formatTime(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function updateTimer(){$('#timerDisplay').textContent=formatTime(timer.seconds);$('#timerBtn').textContent=timer.running?'Pause':timer.seconds===60?'Start':'Resume'}
$('#timerBtn').addEventListener('click',function(){if(timer.running){clearInterval(timer.handle);timer.running=false;updateTimer();return}timer.running=true;updateTimer();timer.handle=setInterval(function(){timer.seconds--;if(timer.seconds<=0){clearInterval(timer.handle);timer.running=false;toast('Focused minute complete — take a breath.');timer.seconds=60}updateTimer()},1000)});
$('#resetPracticeBtn').addEventListener('click',function(){saved.session={};persist();loadSession();renderWeek();toast('Session checklist reset')});
$('#tempoRange').addEventListener('input',function(e){$('#tempoOutput').textContent=e.target.value});
$('#pulseBtn').addEventListener('click',function(){try{var C=window.AudioContext||window.webkitAudioContext,ctx=new C(),o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=880;g.gain.setValueAtTime(.0001,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.12,ctx.currentTime+.01);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.11);o.connect(g).connect(ctx.destination);o.start();o.stop(ctx.currentTime+.12);toast('Pulse')}catch(e){toast('Pulse ready — use your metronome')}});
$('#exportBtn').addEventListener('click',function(){var payload={source:DATA.meta.sourceFile,completed:exercises.filter(function(e){return saved.done[e.id]}).map(function(e){return e.id}),notes:saved.notes,session:saved.session,week:saved.week,exportedAt:new Date().toISOString()},blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='pick-lab-progress.json';a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},500);toast('Progress exported')});
var observer=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){var id=e.target.id;$$('.tab').forEach(function(t){t.classList.toggle('active',t.getAttribute('href')==='#'+id)})}})},{rootMargin:'-35% 0px -55% 0px',threshold:0});
['start','roadmap','drills','technique','practice'].forEach(function(id){observer.observe(document.getElementById(id))});
renderFilters();renderRoadmap();renderList();renderDetail();loadSession();renderWeek();updateTimer();
})();

