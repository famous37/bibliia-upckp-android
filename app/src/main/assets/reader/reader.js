'use strict';

const $ = id => document.getElementById(id);
const page = $('page'), main = $('main'), nav = $('nav'), overlay = $('overlay'), sheet = $('sheet');
const sections = {old:'Старий Завіт',new:'Новий Завіт',app:'Додатки'};
const tabs = {reader:'Читання',books:'Книги',search:'Пошук',saved:'Закладки'};
const icons = {
  reader:'<path d="M2 5q5-2 10 1.4Q17 3 22 5v13.5q-5-2-10 1.4-5-3.4-10-1.4zM12 6.4v13.5"/>',
  books:'<path d="M3.5 4h4v16h-4zM10 4h3.6v16H10zM15.8 6l3.3-1 4.1 14.3-3.3 1z"/>',
  search:'<circle cx="10.4" cy="10.4" r="6.8"/><path d="m16 16 4.8 4.8"/>',
  saved:'<path d="M6 4q0-1.5 1.5-1.5h9Q18 2.5 18 4v17l-6-4-6 4z"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-9v.2"/>',
  next:'<path d="m9 5 7 7-7 7"/>',prev:'<path d="m15 5-7 7 7 7"/>',down:'<path d="m6 9 6 6 6-6"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/>',
  share:'<circle cx="6" cy="12" r="2.5"/><circle cx="17" cy="5.5" r="2.5"/><circle cx="17" cy="18.5" r="2.5"/><path d="m8 11 7-4m-7 6 7 4"/>',
  scan:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8m-8 4h5"/>',
  logo:'<path d="M2 6q5.5-1.5 10 2.2Q17 4.5 22 6v13q-5.5-1.5-10 2.2Q7 17.5 2 19zM12 8.2v13M6.8 9v6m-2-4 4 1"/>'
};
const artwork='<svg class="hero-art" viewBox="0 0 145 140" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4"><g transform="rotate(-8 83 84)"><path d="M17 45q28-8 53 9 27-15 56-6v61q-30-7-55 7-25-16-54-10zM20 110q25-5 51 10 27-15 56-8M70 54l1 62M25 41q21-5 42 9m9 1q22-13 46-7M92 61v28m-10-18h20M29 58q13-1 27 5m-27 5q13-1 27 5m-27 5q13-1 27 5m-27 5q13-1 27 5"/></g></svg>';
function icon(id,extra=''){return '<svg class="ico '+extra+'" aria-hidden="true" viewBox="0 0 24 24">'+icons[id]+'</svg>';}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fold(s){return String(s).toLowerCase().normalize('NFC').replace(/i/g,'і').replace(/h/g,'н').replace(/['’ʼ‘]/g,'').replace(/\u00ad/g,'').replace(/\s+/g,' ').trim();}
function get(key,fallback){try{const v=JSON.parse(localStorage.getItem('bibliia.'+key));return v===null?fallback:v;}catch(_){return fallback;}}
function put(key,value){try{localStorage.setItem('bibliia.'+key,JSON.stringify(value));}catch(_){}}
function plural(n,one,few,many){return n+' '+(n%10===1&&n%100!==11?one:n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?few:many);}
function ref(b,c,v){return b.section==='app'?b.title:(b.id===27?'Псалом':b.title)+' '+c+(v>0?':'+v:'');}
function chap(b,n){return (b.id===27?'Псалом ':'Глава ')+n;}
function actButton(a,label,cls='btn',ico=''){return '<button class="'+cls+'" data-action="'+a+'">'+(ico?icon(ico):'')+esc(label)+'</button>';}
function segments(entries,chosen,attr){return '<div class="seg">'+Object.keys(entries).map(k=>'<button data-'+attr+'="'+k+'" aria-pressed="'+(k===chosen)+'">'+esc(entries[k])+'</button>').join('')+'</div>';}
function field(id,label,val){return '<div class="field">'+icon('search')+'<input id="'+id+'" aria-label="'+label+'" placeholder="'+label+'" type="text" inputmode="search" enterkeyhint="search" autocomplete="off" value="'+esc(val)+'"><button class="icon-button" data-clear="'+id+'" aria-label="Очистити поле" '+(val?'':'hidden')+'>'+icon('close')+'</button></div>';}
function empty(ico,title,sub){return '<div class="empty"><span class="badge">'+icon(ico)+'</span><h2>'+esc(title)+'</h2><p class="sub">'+esc(sub)+'</p></div>';}
function heading(t){return '<header class="view-head"><h1>'+esc(t)+'</h1></header>';}
function showToast(s){$('toast').textContent=s;$('toast').classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('on'),1900);}
const darkMedia=matchMedia('(prefers-color-scheme: dark)');
const pref=Object.assign({theme:'system',face:'serif',size:21,spacing:'normal'},get('settings',{}));
function apply(){
  pref.size=Math.min(34,Math.max(16,Number(pref.size)||21));
  const dark=pref.theme==='dark'||(pref.theme==='system'&&darkMedia.matches),root=document.documentElement;
  root.dataset.dark=dark?'1':'0';root.dataset.face=pref.face;root.dataset.size=String(pref.size);root.dataset.spacing=pref.spacing;
  if(window.BibleAndroid)BibleAndroid.theme(dark);
}
if(darkMedia.addEventListener)darkMedia.addEventListener('change',apply);else darkMedia.addListener(apply);
let marks=get('marks',[]);if(!Array.isArray(marks))marks=[];
let place=get('position',{b:0,c:1,r:null,y:0});
let catalog=[],byId=new Map(),current=null,view='reader',version=0,freezing=false;
let section='old',filter='',query='',limit=45;
let searchRun=0,searchTimer,placeTimer,toastTimer,lastSearch=null;
let sheetFocus,selectedRow,pickerBook,scan=1057,zoom=false;
const historyStack=[], books=new Map(), indexed=new Map();

async function jsonFile(path){const res=await fetch(path);if(!res.ok)throw Error('Missing edition asset');return res.json();}
function getBook(id){
  if(!books.has(id)){
    const job=jsonFile('data/'+id+'.json').catch(e=>{books.delete(id);throw e;});
    books.set(id,job);
  }
  return books.get(id);
}
function markNav(){
  nav.innerHTML=Object.keys(tabs).map(k=>'<button class="nav-item" data-tab="'+k+'" '+(view===k||view==='scans'&&k==='books'?'aria-current="page"':'')+'><span class="nav-symbol">'+icon(k)+'</span>'+tabs[k]+'</button>').join('');
}
function savePlace(){
  if(!current||view!=='reader'||freezing)return;
  const top=main.getBoundingClientRect().top;
  const row=main.scrollTop<=2?null:Array.from(page.querySelectorAll('[data-row]')).find(e=>e.offsetHeight&&e.getBoundingClientRect().bottom>top+1);
  place={b:current.b.id,c:current.ch.n,r:row?Number(row.dataset.row):null,y:row?Math.round(row.getBoundingClientRect().top-top):0};
  put('position',place);
}
window.savePlace=savePlace;
main.addEventListener('scroll',()=>{clearTimeout(placeTimer);placeTimer=setTimeout(savePlace,120);},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)savePlace();});
function pushHistory(){
  savePlace();historyStack.push({view,place:Object.assign({},place),section,filter,query,scan,scroll:main.scrollTop});
  if(historyStack.length>25)historyStack.shift();
}
function enter(v){
  clearTimeout(placeTimer);clearTimeout(searchTimer);searchRun++;version++;view=v;current=null;freezing=false;main.scrollTop=0;markNav();
}
function goTab(v){
  if(!catalog.length)return;
  savePlace();closeSheet(false);historyStack.length=0;
  if(v==='reader'){openChapter(place.b,place.c,place.r,{y:place.y});return;}
  enter(v);
  if(v==='books'){const last=byId.get(place.b);section=last?last.section:'old';filter='';showBooks();}
  if(v==='search'){showSearch();$('query').focus();}
  if(v==='saved')showMarks();
}
function sheetOpen(title,body){
  if(overlay.hidden)sheetFocus=document.activeElement;
  sheet.innerHTML='<header class="sheet-head"><h2 id="sheet-title">'+esc(title)+'</h2><button class="icon-button" data-action="close" aria-label="Закрити">'+icon('close')+'</button></header><div class="sheet-body">'+body+'</div>';
  overlay.hidden=false;sheet.querySelector('button').focus({preventScroll:true});
  [document.querySelector('.top'),main,nav].forEach(e=>{e.inert=true;e.setAttribute('aria-hidden','true');});
}
function closeSheet(restore=true){
  if(overlay.hidden)return;
  overlay.hidden=true;sheet.innerHTML='';
  [document.querySelector('.top'),main,nav].forEach(e=>{e.inert=false;e.removeAttribute('aria-hidden');});
  if(restore&&sheetFocus&&sheetFocus.isConnected)sheetFocus.focus({preventScroll:true});
}
function pageNeighbor(direction){
  const b=current.b,c=current.ch.n+direction;
  if(c>=1&&c<=b.count)return [b.id,c];
  const list=catalog.filter(o=>(o.section==='app')===(b.section==='app'));
  const next=list[list.indexOf(b)+direction];return next?[next.id,direction>0?1:next.count]:null;
}
function turns(){
  function button(d,name,ico){
    const p=pageNeighbor(d);return '<button class="btn" data-turn="'+d+'" '+(p?'aria-label="'+esc(ref(byId.get(p[0]),p[1],0))+'"':'disabled')+'>'+(d<0?icon(ico):'')+name+(d>0?icon(ico):'')+'</button>';
  }
  return '<div class="buttons">'+button(-1,'Назад','prev')+button(1,'Далі','next')+'</div>';
}
async function openChapter(id,n,r=null,opts={}){
  if(opts.push)pushHistory();else savePlace();
  closeSheet(false);enter('reader');freezing=true;
  const token=version,b=byId.get(Number(id))||byId.get(0);
  n=Math.max(1,Math.min(b.count,Number(n)||1));
  page.innerHTML='<p class="msg">Відкриваємо текст…</p>';
  try{
    const data=await getBook(b.id);if(version!==token)return;
    const ch=data[n-1];current={b,ch};
    const app=b.section==='app',title=b.id===27?'Псалом '+n:b.title;
    const saved=new Set(marks.filter(x=>x.b===b.id&&x.c===n).map(x=>x.r));
    let content='',inNotes=false;
    ch.rows.forEach(([v,t],i)=>{
      if(v<0){
        if(!inNotes){inNotes=true;content+='<details class="notes"><summary>Примітки й паралельні місця</summary>';}
        content+='<p class="note" data-row="'+i+'">'+esc(t)+'</p>';return;
      }
      if(inNotes){content+='</details>';inNotes=false;}
      if(app&&i===0&&fold(t)===fold(title))return;
      content+='<button class="'+(v?'verse':'para')+(saved.has(i)?' marked':'')+'" data-row="'+i+'" data-select="'+i+'">'+(v?'<span class="num">'+v+'</span>':'')+'<span class="words">'+esc(t)+'</span></button>';
    });
    if(inNotes)content+='</details>';
    page.innerHTML='<section class="hero">'+artwork+'<p class="eyebrow">'+icon('reader')+sections[b.section]+'</p><h1>'+esc(title)+'</h1><button class="hero-button" data-action="'+(app?'contents':'picker')+'">'+(app?'Усі додатки':b.id===27?'Обрати псалом':chap(b,n)+esc(ch.mark))+' '+icon('down')+'</button></section><article class="passage'+(app?' appendix':'')+'">'+content+'</article>'+turns();
    const row=r!==null&&Number(r)>=0?page.querySelector('[data-row="'+Number(r)+'"]'):null;
    if(row&&row.closest('details'))row.closest('details').open=true;
    requestAnimationFrame(()=>{
      if(token!==version)return;
      if(row){
        main.scrollTop+=row.getBoundingClientRect().top-main.getBoundingClientRect().top-(Number(opts.y)||0);
        if(opts.flash){row.classList.add('flash');setTimeout(()=>row.classList.remove('flash'),1700);}
      }else main.scrollTop=0;
      freezing=false;savePlace();
    });
  }catch(_){
    if(version===token){freezing=false;page.innerHTML=empty('reader','Не вдалося відкрити книгу','Спробуйте відкрити її ще раз.')+actButton('retry','Повторити');}
  }
}
function picker(b,mode='chapter'){
  pickerBook=b.id;
  const same=current&&current.b===b,canVerse=same&&b.section!=='app';
  const segment=canVerse?segments({chapter:b.id===27?'Псалми':'Глави',verse:'Вірші'},mode,'pick'):'';
  let grid='';
  if(mode==='verse'&&same){
    current.ch.rows.forEach(([v],r)=>{if(v>0)grid+='<button data-jump="'+r+'" aria-label="Вірш '+v+'">'+v+'</button>';});
  }else{
    for(let i=1;i<=b.count;i++)grid+='<button data-chapter="'+i+'" aria-label="'+chap(b,i)+'" aria-pressed="'+Boolean(same&&current.ch.n===i)+'">'+i+'</button>';
  }
  sheetOpen(b.title,segment+'<div class="grid">'+grid+'</div>'+actButton('contents','До переліку книг','action','books'));
  const selected=sheet.querySelector('.grid [aria-pressed="true"]');
  if(selected&&same&&current.ch.n>35)selected.scrollIntoView({block:'center'});
}
function selectVerse(r){
  selectedRow=r;
  const c=current,[v,t]=c.ch.rows[r];
  const found=marks.some(x=>x.b===c.b.id&&x.c===c.ch.n&&x.r===r);
  sheetOpen(ref(c.b,c.ch.n,v),'<blockquote>'+esc(t)+'</blockquote>'+actButton('mark',found?'Прибрати із закладок':'Додати до закладок','action','saved')+actButton('copy','Скопіювати уривок','action','copy')+actButton('share','Поділитися','action','share'));
}
function markOrSend(a){
  const {b,ch}=current,r=selectedRow,[v,t]=ch.rows[r], title=ref(b,ch.n,v);
  if(a==='mark'){
    const exists=marks.some(x=>x.b===b.id&&x.c===ch.n&&x.r===r);
    marks=marks.filter(x=>!(x.b===b.id&&x.c===ch.n&&x.r===r));
    if(!exists)marks.unshift({b:b.id,c:ch.n,r,v,text:t});
    put('marks',marks);page.querySelector('[data-select="'+r+'"]').classList.toggle('marked',!exists);showToast(exists?'Закладку прибрано':'Додано до закладок');
  }else{
    const clip=t+'\n'+title+' · Переклад Патріарха Філарета';
    if(window.BibleAndroid){if(a==='copy')BibleAndroid.copy(clip);else BibleAndroid.share(clip);if(a==='copy')showToast('Уривок скопійовано');}
    else if(a==='copy'&&navigator.clipboard)navigator.clipboard.writeText(clip).then(()=>showToast('Уривок скопійовано')).catch(()=>{});
    else if(a==='share'&&navigator.share)navigator.share({text:clip}).catch(()=>{});
  }
  closeSheet();
}
function settings(){
  sheetOpen('Вигляд читання','<p class="label">Тема</p>'+segments({system:'Системна',light:'Світла',dark:'Темна'},pref.theme,'theme')+
    '<p class="label">Шрифт</p>'+segments({serif:'Із зарубками',sans:'Без зарубок'},pref.face,'face')+
    '<div class="step"><span>Розмір тексту</span><span class="counter"><button data-size="-1" aria-label="Зменшити шрифт" '+(pref.size<=16?'disabled':'')+'>−</button><output>'+pref.size+'</output><button data-size="1" aria-label="Збільшити шрифт" '+(pref.size>=34?'disabled':'')+'>+</button></span></div>'+
    '<p class="label">Міжрядковий інтервал</p>'+segments({compact:'Щільний',normal:'Звичайний',wide:'Широкий'},pref.spacing,'spacing')+
    '<p class="sample">На початку створив Бог небо і землю.</p>');
}
function about(){
  sheetOpen('Про видання','<p class="label">Переклад</p><p>Святійший Патріарх Київський і всієї Руси-України Філарет</p><p class="label">Видання УПЦ Київського Патріархату</p><p class="sub">50 книг Старого Завіту, 27 книг Нового Завіту, додатки та покажчик старозавітних читань на церковних службах.</p><p class="label">Розробник</p><p>Василь Шлемко</p><p class="label">Версія</p><p>2.0.1</p>');
}
function showBooks(){page.innerHTML=heading('Книги')+segments(sections,section,'section')+field('filter','Знайти книгу',filter)+'<div id="list"></div>';listBooks();}
function listBooks(){
  const f=fold(filter);
  const list=catalog.filter(b=>(!f?b.section===section:[b.title,b.original].concat(b.aliases).some(x=>fold(x).includes(f))));
  let last='',str='';
  list.forEach(b=>{
    const group=b.group||sections[b.section],name=f&&sections[b.section]!==group?sections[b.section]+' · '+group:group;
    if(last!==name){str+='<p class="label">'+esc(name)+'</p>';last=name;}
    const number=b.id===27?plural(b.count,'псалом','псалми','псалмів'):plural(b.count,'глава','глави','глав');
    str+='<button class="row" data-book="'+b.id+'"><span class="row-main"><span class="row-title">'+esc(b.title)+'</span></span>'+(b.section==='app'?'':'<span class="count">'+number+'</span>')+icon('next','end')+'</button>';
  });
  if((section==='app'&&!f)||(f&&fold('Покажчик старозавітних читань на церковних службах').includes(f))){
    str+='<button class="row" data-action="scans"><span class="badge">'+icon('scan')+'</span><span class="row-main"><span class="row-title">Покажчик старозавітних читань</span><span class="sub">Сторінки оригінального видання</span></span>'+icon('next','end')+'</button>';
  }
  $('list').innerHTML=str||empty('books','Книги не знайдено','Спробуйте біблійне скорочення або частину назви.');
}
function resultRow(h){
  const b=byId.get(h.b);if(!b)return '';
  return '<button class="row" data-open="'+h.b+'" data-c="'+h.c+'" data-r="'+h.r+'"><span class="row-main"><span class="ref">'+esc(ref(b,h.c,h.v))+(h.v===-1?' · Примітка':'')+'</span><span class="row-text">'+esc(h.text)+'</span></span>'+icon('next','end')+'</button>';
}
function showMarks(){page.innerHTML=heading('Закладки')+(marks.length?marks.map(resultRow).join(''):empty('saved','Поки що немає закладок','Торкніться вірша під час читання й виберіть «Додати до закладок».'));}
function showScans(){
  const pages=Array.from({length:6},(_,i)=>'<option value="'+(1057+i)+'" '+(scan===1057+i?'selected':'')+'>Сторінка '+(1057+i)+'</option>').join('');
  page.innerHTML=heading('Покажчик читань')+'<div class="scan-controls"><select id="scan-page" aria-label="Сторінка покажчика">'+pages+'</select>'+actButton('zoom',zoom?'Зменшити':'Збільшити')+'</div><div class="scan'+(zoom?' zoom':'')+'"><img src="scans/'+scan+'.png" alt="Покажчик старозавітних читань, сторінка '+scan+'"></div>'+actButton('contents','До додатків','btn','prev');
}
function parseRef(s){
  const m=s.trim().match(/^(.+?)\.?\s*(\d{1,3})(?:\s*[:,]\s*(\d{1,3}))?$/);
  if(!m)return null;
  const clean=x=>fold(x).replace(/[.\s]/g,'');
  const b=catalog.find(b=>b.section!=='app'&&[b.title].concat(b.aliases).some(x=>clean(x)===clean(m[1])));
  return b&&+m[2]>=1&&+m[2]<=b.count?{b,c:+m[2],v:+m[3]||0}:null;
}
function showSearch(){
  page.innerHTML=heading('Пошук')+field('query','Слово, фраза або місце',query)+'<div id="search-list" aria-live="polite"></div>';queueSearch();
}
function quickRefs(){return '<p class="label">Перейти до місця</p><div class="chips">'+['Ін 3:16','Пс 50','Мф 5:9'].map(s=>'<button class="chip" data-example="'+s+'">'+s+'</button>').join('')+'</div>';}
function renderHits(data){
  const out=$('search-list');if(!out)return;
  if(!data.total){out.innerHTML=empty('search','Збігів немає','Спробуйте коротшу фразу або іншу форму слова.');return;}
  out.innerHTML='<p class="label">'+plural(data.total,'збіг','збіги','збігів')+'</p>'+data.hits.map(resultRow).join('')+(data.total>data.hits.length?actButton('more','Показати ще','btn more'):'');
}
async function findText(id,q){
  const term=fold(q),hits=[];let total=0;
  for(let i=0;i<catalog.length;i++){
    if(searchRun!==id)return;
    const b=catalog[i];
    if(!indexed.has(b.id)){
      const chapters=await getBook(b.id);
      if(searchRun!==id)return;
      const entries=[];
      chapters.forEach(ch=>ch.rows.forEach(([v,t],r)=>entries.push({c:ch.n,r,v,t,f:fold(t)})));
      indexed.set(b.id,entries);
    }
    for(const e of indexed.get(b.id)){
      const pos=e.f.indexOf(term);if(pos<0)continue;total++;
      if(hits.length<limit){
        const start=Math.max(0,pos-42),end=Math.min(e.t.length,Math.max(start+142,pos+term.length+40));
        hits.push({b:b.id,c:e.c,r:e.r,v:e.v,text:(start?'…':'')+e.t.slice(start,end)+(end<e.t.length?'…':'')});
      }
    }
    if(i%4===3)await new Promise(resolve=>setTimeout(resolve,0));
  }
  if(searchRun===id){lastSearch={q,limit,data:{hits,total}};renderHits(lastSearch.data);}
}
function queueSearch(){
  clearTimeout(searchTimer);const id=++searchRun,out=$('search-list'),q=query.trim();
  if(!out)return;
  if(!q){out.innerHTML=quickRefs();return;}
  const dest=parseRef(q);
  function failed(){if(searchRun===id)out.innerHTML='<p class="msg">Не вдалося виконати пошук.</p>'+actButton('again','Повторити');}
  if(dest){
    getBook(dest.b.id).then(all=>{
      if(searchRun!==id)return;
      const ch=all[dest.c-1],i=dest.v?ch.rows.findIndex(([v])=>v===dest.v):ch.rows.findIndex(([v])=>v>0);
      out.innerHTML=i<0?empty('search','Такого вірша немає','Виберіть інший номер вірша.'):'<p class="label">Біблійне посилання</p>'+resultRow({b:dest.b.id,c:dest.c,r:dest.v?i:-1,v:dest.v,text:ch.rows[i][1]});
    }).catch(failed);return;
  }
  if(q.length<2){out.innerHTML='<p class="msg">Введіть щонайменше дві літери.</p>';return;}
  if(lastSearch&&lastSearch.q===q&&lastSearch.limit===limit){renderHits(lastSearch.data);return;}
  out.innerHTML='<p class="msg">Шукаємо у виданні…</p>';
  searchTimer=setTimeout(()=>findText(id,q).catch(failed),160);
}
function act(a){
  switch(a){
    case 'close':closeSheet();break;
    case 'picker':picker(current.b);break;
    case 'contents':closeSheet(false);pushHistory();section=view==='scans'?'app':current?current.b.section:section;filter='';enter('books');showBooks();break;
    case 'scans':pushHistory();enter('scans');showScans();break;
    case 'zoom':zoom=!zoom;showScans();break;
    case 'more':limit+=60;queueSearch();break;
    case 'again':lastSearch=null;queueSearch();break;
    case 'retry':goTab('reader');break;
    case 'mark':case 'copy':case 'share':markOrSend(a);break;
  }
}
document.addEventListener('click',e=>{
  const el=e.target.closest('button');if(!el)return;
  if(el.id==='brand'){goTab('reader');return;}if(el.id==='appearance'){settings();return;}if(el.id==='about'){about();return;}
  const d=el.dataset;
  if(d.action){act(d.action);return;}if(d.tab){goTab(d.tab);return;}
  if(d.open!==undefined){openChapter(+d.open,+d.c,+d.r<0?null:+d.r,{push:true,flash:+d.r>=0});return;}
  if(d.select!==undefined){selectVerse(+d.select);return;}
  if(d.section){section=d.section;filter='';showBooks();return;}
  if(d.book!==undefined){const b=byId.get(+d.book);if(b.count===1)openChapter(b.id,1,null,{push:true});else picker(b);return;}
  if(d.turn){const p=pageNeighbor(+d.turn);if(p)openChapter(p[0],p[1]);return;}
  if(d.pick){picker(byId.get(pickerBook),d.pick);return;}
  if(d.chapter){openChapter(pickerBook,+d.chapter,null,{push:view!=='reader'});return;}
  if(d.jump!==undefined){openChapter(current.b.id,current.ch.n,+d.jump,{flash:true});return;}
  if(d.clear){const f=$(d.clear);f.value='';f.dispatchEvent(new Event('input',{bubbles:true}));f.focus();return;}
  if(d.example){const f=$('query');f.value=d.example;f.dispatchEvent(new Event('input',{bubbles:true}));return;}
  const attr=['theme','face','spacing','size'].find(k=>d[k]!==undefined);
  if(attr){pref[attr]=attr==='size'?pref.size+Number(d.size):d[attr];apply();put('settings',pref);settings();const x=sheet.querySelector('[data-'+attr+'="'+d[attr]+'"]');if(x&&!x.disabled)x.focus({preventScroll:true});}
});
document.addEventListener('input',e=>{
  if(e.target.id==='filter'){filter=e.target.value;listBooks();}
  else if(e.target.id==='query'){query=e.target.value;limit=45;queueSearch();}
  else return;
  e.target.parentElement.querySelector('[data-clear]').hidden=!e.target.value;
});
document.addEventListener('change',e=>{if(e.target.id==='scan-page'){scan=Number(e.target.value);zoom=false;showScans();}});
$('shade').addEventListener('click',()=>closeSheet());
window.readerBack=()=>{
  if(!overlay.hidden){closeSheet();return true;}
  const prev=historyStack.pop();
  if(prev){
    savePlace();section=prev.section;filter=prev.filter;query=prev.query;scan=prev.scan;
    if(prev.view==='reader')openChapter(prev.place.b,prev.place.c,prev.place.r,{y:prev.place.y});
    else{enter(prev.view);if(view==='books')showBooks();if(view==='search')showSearch();if(view==='saved')showMarks();if(view==='scans')showScans();main.scrollTop=prev.scroll;}
    return true;
  }
  if(view!=='reader'){goTab('reader');return true;}savePlace();return false;
};
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&window.readerBack())e.preventDefault();
  if(e.key==='Enter'&&e.target.id==='query')e.target.blur();
  if(e.key==='Tab'&&!overlay.hidden){
    const f=Array.from(sheet.querySelectorAll('button:not([disabled]),select,input'));const first=f[0],last=f[f.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
});
async function start(){
  $('logo').innerHTML=icon('logo');$('about').innerHTML=icon('info');apply();markNav();
  try{catalog=await jsonFile('data/catalog.json');byId=new Map(catalog.map(b=>[b.id,b]));await openChapter(place.b,place.c,place.r,{y:place.y});}
  catch(_){page.innerHTML=empty('reader','Не вдалося відкрити видання','Закрийте застосунок і відкрийте його ще раз.');}
}
start();
