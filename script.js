const $=id=>document.getElementById(id);
let albums=[],songs=[],cur=null,idx=-1,db=null,assets=null,pendingFile=null;
const save=()=>{try{localStorage.setItem("mw_albums",JSON.stringify(albums));localStorage.setItem("mw_songs",JSON.stringify(songs))}catch(e){}};
const rid=()=>Math.random().toString(36).slice(2,10);
const esc=s=>String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const aud=$("aud");
(()=>{const g=["✦","♡","★","✧","♡","✦"];for(let i=0;i<22;i++){const e=document.createElement("div");e.className="spark";e.textContent=g[i%g.length];e.style.left=Math.random()*96+"vw";e.style.top=Math.random()*94+"vh";e.style.fontSize=(14+Math.random()*22)+"px";e.style.animationDelay=(Math.random()*3)+"s";$("sp").appendChild(e)}})();

$("enter").onclick=()=>{$("welcome").style.display="none";$("app").style.display="block";connect()};

const firebaseConfig={
  apiKey:"AIzaSyDHNx69KlN6BNfi0_n-hx36yd3JhVx3gFo",
  authDomain:"musicworlds.firebaseapp.com",
  projectId:"musicworlds",
  storageBucket:"musicworlds.firebasestorage.app",
  messagingSenderId:"660824239036",
  appId:"1:660824239036:web:13b8e2bacfc573717819b9"
};

async function connect(){
  let err="";
  try{
    firebase.initializeApp(firebaseConfig);
    db=firebase.firestore();
    let cloudOk=false;
    const upd=s=>{const ok=!s.metadata.hasPendingWrites&&!s.metadata.fromCache;if(ok)cloudOk=true;$("sync").textContent=ok?"● synced with friends":"◌ saving… (waiting for the cloud)"};
    setTimeout(()=>{if(!cloudOk)$("sync").textContent="○ NOT reaching the cloud - check Firestore database & rules"},8000);
    const onErr=e=>{$("sync").textContent="○ can't reach the database ("+(e.code||"error")+")"};
    db.collection("albums").onSnapshot({includeMetadataChanges:true},s=>{upd(s);albums=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.ts||0)-(b.ts||0));render()},onErr);
    db.collection("songs").onSnapshot({includeMetadataChanges:true},s=>{upd(s);songs=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.ts||0)-(b.ts||0));render()},onErr);
  }catch(e){console.error(e);db=null}
  if(!db){try{albums=JSON.parse(localStorage.getItem("mw_albums")||"[]");songs=JSON.parse(localStorage.getItem("mw_songs")||"[]")}catch(e){}}
  if(!db)$("sync").textContent="○ saved on this device only";
  render();
}

function render(){
  $("albums").innerHTML=albums.length?albums.map(a=>{
    const n=songs.filter(s=>s.albumId===a.id).length;
    return `<div class="album" data-id="${esc(a.id)}"><div class="disc"></div><b>${esc(a.name)}</b><small>${n} song${n===1?"":"s"}</small></div>`}).join(""):'<p class="muted">No albums yet. Create the first one below!</p>';
  document.querySelectorAll(".album").forEach(e=>e.onclick=()=>openAlbum(e.dataset.id));
  if(cur){
    const list=songs.filter(s=>s.albumId===cur);
    $("songs").innerHTML=list.length?list.map((s,i)=>`<div class="song ${i===idx?"cur":""}" data-i="${i}"><span>${esc(s.title)} <span class="muted">· ${esc(s.artist)}</span></span><span>${s.url?"♪":""}</span></div>`).join(""):'<p class="muted">No songs yet. Add one below ♡</p>';
    document.querySelectorAll(".song").forEach(e=>e.onclick=()=>playSong(+e.dataset.i));
  }
}
function openAlbum(id){
  cur=id;idx=-1;const a=albums.find(x=>x.id===id);
  $("aTitle").textContent=a?a.name:"";
  $("home").style.display="none";$("album").style.display="block";closeAdd();window.scrollTo(0,0);render();
}
$("back").onclick=()=>{cur=null;aud.pause();$("home").style.display="block";$("album").style.display="none";render()};

$("addAlbum").onclick=async()=>{
  const name=$("newAlbum").value.trim();if(!name)return;
  const a={name,ts:Date.now()},id=rid();$("newAlbum").value="";
  try{ if(db) db.collection("albums").doc(id).set(a).catch(e=>alert("Could not save: "+(e.message||e.code))); else {albums.push({id,...a});save();render()} }catch(e){alert("Could not save: "+(e.message||e.code))}
};
$("addSong").onclick=async()=>{
  const title=$("sT").value.trim();if(!title||!cur)return;
  const btn=$("addSong");btn.disabled=true;btn.textContent="Saving…";
  const s={albumId:cur,title,artist:$("sA").value.trim(),lyrics:$("sL").value,url:$("sU").value.trim(),ts:Date.now()},id=rid();
  try{
    
    if(db) db.collection("songs").doc(id).set(s).catch(e=>alert("Could not save: "+(e.message||e.code))); else {songs.push({id,...s});save();render()}
    ["sT","sA","sL","sU"].forEach(k=>$(k).value="");closeAdd();
  }catch(e){alert("Could not save: "+(e.message||e.code))}
  btn.disabled=false;btn.textContent="+ Add song & sync";
};

function closeAdd(){$("addBox").style.display="none";$("toggleAdd").textContent="+ Add a song"}
$("toggleAdd").onclick=()=>{const b=$("addBox"),o=b.style.display==="none";b.style.display=o?"grid":"none";$("toggleAdd").textContent=o?"✕ Close":"+ Add a song"};
function media(u){
  let m;
  if(m=u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/))([\w-]{11})/))return{t:"embed",src:"https://www.youtube.com/embed/"+m[1]+"?autoplay=1",h:220};
  if(m=u.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode)\/(\w+)/))return{t:"embed",src:"https://open.spotify.com/embed/"+m[1]+"/"+m[2],h:m[1]==="track"?152:352};
  if(/^https?:\/\//i.test(u))return{t:"audio",src:u};
  return null;
}
function playSong(i){
  const list=songs.filter(s=>s.albumId===cur);if(!list[i])return;
  idx=i;const s=list[i];
  $("nowT").textContent=s.title;$("nowA").textContent=s.artist;$("lyr").textContent=s.lyrics||"No lyrics added.";
  const e=$("embed");e.innerHTML="";aud.pause();aud.removeAttribute("src");
  const m=media(s.url||"");
  if(m&&m.t==="embed"){
    const f=document.createElement("iframe");f.src=m.src;f.width="100%";f.height=m.h;f.style.border="0";f.style.borderRadius="14px";
    f.allow="autoplay; encrypted-media; clipboard-write; fullscreen";f.loading="lazy";e.appendChild(f);
    $("vinyl").classList.add("on");
  }else if(m){aud.src=m.src;aud.play().catch(()=>{})}
  else{$("nowA").textContent=(s.artist||"")+" · (no link added)";$("vinyl").classList.remove("on")}
  render();
  if(window.innerWidth<=760)$("nowT").scrollIntoView({behavior:"smooth",block:"center"});
}
$("play").onclick=()=>{ if(!aud.src)return; aud.paused?aud.play():aud.pause() };
$("next").onclick=()=>{const n=songs.filter(s=>s.albumId===cur).length;if(n)playSong((idx+1)%n)};
$("prev").onclick=()=>{const n=songs.filter(s=>s.albumId===cur).length;if(n)playSong((idx-1+n)%n)};
aud.onplay=()=>{$("play").textContent="⏸";$("vinyl").classList.add("on")};
aud.onpause=()=>{$("play").textContent="▶";$("vinyl").classList.remove("on")};
aud.onended=()=>$("next").click();
aud.ontimeupdate=()=>{$("fill").style.width=(aud.duration?aud.currentTime/aud.duration*100:0)+"%"};
$("bar").onclick=e=>{if(aud.duration){const r=$("bar").getBoundingClientRect();aud.currentTime=(e.clientX-r.left)/r.width*aud.duration}};