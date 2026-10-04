const $=id=>document.getElementById(id);
let albums=[],songs=[],cur=null,idx=-1,db=null,assets=null,pendingFile=null;
const save=()=>{try{localStorage.setItem("mw_albums",JSON.stringify(albums));localStorage.setItem("mw_songs",JSON.stringify(songs))}catch(e){}};
const rid=()=>Math.random().toString(36).slice(2,10);
const esc=s=>String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const aud=$("aud");
if($("ver"))$("ver").textContent="v6 ✓";
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
    if(idx<0){$("nowT").textContent=list.length?"Pick a song":"No songs in this album yet";$("nowA").textContent="";$("lyr").textContent="—"}
  }
}
function openAlbum(id){
  stopAll();cur=id;idx=-1;$("nowA").textContent="";$("lyr").textContent="—";const a=albums.find(x=>x.id===id);
  $("aTitle").textContent=a?a.name:"";
  $("home").style.display="none";$("album").style.display="block";closeAdd();window.scrollTo(0,0);render();
}
$("back").onclick=()=>{cur=null;stopAll();$("home").style.display="block";$("album").style.display="none";render()};

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
let ctrl=null,yt=null,sp=null,tick=null,token=0,ytP=null,spP=null,spDur=0,lastEnd=0;
const loadScript=src=>new Promise(r=>{const s=document.createElement("script");s.src=src;s.onload=r;document.head.appendChild(s)});
const getYT=()=>{if(window.YT&&YT.Player)return Promise.resolve();return ytP||(ytP=new Promise(r=>{window.onYouTubeIframeAPIReady=r;loadScript("https://www.youtube.com/iframe_api")}))};
const getSP=()=>spP||(spP=new Promise(r=>{window.onSpotifyIframeApiReady=a=>r(a);loadScript("https://open.spotify.com/embed/iframe-api/v1")}));
function setPlaying(b){$("play").textContent=b?"⏸":"▶";$("vinyl").classList.toggle("on",!!b)}
function setProg(f){$("fill").style.width=(Math.max(0,Math.min(1,f||0))*100)+"%"}
function songEnded(){const t=Date.now();if(t-lastEnd>2000){lastEnd=t;$("next").click()}}
function stopAll(){
  aud.pause();aud.removeAttribute("src");clearInterval(tick);
  try{yt&&yt.destroy()}catch(e){}yt=null;
  try{sp&&sp.destroy()}catch(e){}sp=null;
  ctrl=null;$("embed").innerHTML="";setPlaying(false);setProg(0);
}
function playSong(i){
  const list=songs.filter(s=>s.albumId===cur);if(!list[i])return;
  idx=i;const s=list[i],my=++token;
  $("nowT").textContent=s.title;$("nowA").textContent=s.artist;$("lyr").textContent=s.lyrics||"No lyrics added.";
  stopAll();
  const m=media(s.url||"");
  const u=s.url||"";
  if(m&&m.t==="embed"&&m.src.includes("youtube")){
    const id=m.src.split("/embed/")[1].split("?")[0];
    const d=document.createElement("div");d.id="ytdiv";$("embed").appendChild(d);
    getYT().then(()=>{ if(my!==token)return;
      yt=new YT.Player("ytdiv",{width:"100%",height:220,videoId:id,playerVars:{autoplay:1,playsinline:1,rel:0},events:{
        onStateChange:e=>{if(e.data===1)setPlaying(true);else if(e.data===2)setPlaying(false);else if(e.data===0){setPlaying(false);songEnded()}}}});
      ctrl={toggle:()=>{yt.getPlayerState()===1?yt.pauseVideo():yt.playVideo()},seek:f=>{const t=yt.getDuration();if(t)yt.seekTo(f*t,true)}};
      tick=setInterval(()=>{try{const t=yt.getDuration();if(t)setProg(yt.getCurrentTime()/t)}catch(e){}},500);
    });
  }else if(m&&m.t==="embed"){
    const x=u.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode)\/(\w+)/);
    const d=document.createElement("div");$("embed").appendChild(d);
    getSP().then(api=>{ if(my!==token)return;
      api.createController(d,{uri:"spotify:"+x[1]+":"+x[2],width:"100%",height:m.h},c=>{
        if(my!==token){try{c.destroy()}catch(e){}return}
        sp=c;spDur=0;
        c.addListener("ready",()=>c.play());
        c.addListener("playback_update",e=>{const p=e.data;if(!p)return;spDur=p.duration||0;setPlaying(!p.isPaused);if(spDur)setProg(p.position/spDur);if(spDur&&p.position>=spDur-400&&p.isPaused)songEnded()});
        ctrl={toggle:()=>c.togglePlay(),seek:f=>{if(spDur)c.seek(f*spDur/1000)}};
      });
    });
  }else if(m){
    aud.src=m.src;aud.play().catch(()=>{});
    ctrl={toggle:()=>{aud.paused?aud.play():aud.pause()},seek:f=>{if(aud.duration)aud.currentTime=f*aud.duration}};
  }else{$("nowA").textContent=(s.artist||"")+" · (no link added)"}
  render();
  if(window.innerWidth<=760)$("nowT").scrollIntoView({behavior:"smooth",block:"center"});
}
$("play").onclick=()=>{if(ctrl)ctrl.toggle()};
$("next").onclick=()=>{const n=songs.filter(s=>s.albumId===cur).length;if(n)playSong((idx+1)%n)};
$("prev").onclick=()=>{const n=songs.filter(s=>s.albumId===cur).length;if(n)playSong((idx-1+n)%n)};
aud.onplay=()=>setPlaying(true);
aud.onpause=()=>setPlaying(false);
aud.onended=songEnded;
aud.ontimeupdate=()=>setProg(aud.duration?aud.currentTime/aud.duration:0);
$("bar").onclick=e=>{if(ctrl){const r=$("bar").getBoundingClientRect();ctrl.seek((e.clientX-r.left)/r.width)}};
