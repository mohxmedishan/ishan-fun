import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig={apiKey:"AIzaSyC5c-np0wNIMkcowH4Rr1i5r3B2-qGY1e4",authDomain:"ishan-fun.firebaseapp.com",projectId:"ishan-fun",storageBucket:"ishan-fun.firebasestorage.app",messagingSenderId:"919307010777",appId:"1:919307010777:web:35b659050c32e7c05c74c8",measurementId:"G-S8H37T0FNX"};
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);

// Private developer access. Add your Firebase Auth UID here to activate the
// floating developer tools. The ?dev=1 flag is an additional gate.
// Add ONLY your Firebase Authentication UID here.
// Example: const DEV_UIDS=new Set(["abc123..."]);
// The panel stays completely hidden until the signed-in user matches this UID
// AND the page has ?dev=1.
const DEV_UIDS=new Set([]);
const DEV_QUERY=new URLSearchParams(location.search).get("dev")==="1";
let currentUser=null;
let devAuthorized=false;

onAuthStateChanged(auth,u=>{currentUser=u;syncDevAccess()});
function syncDevAccess(){
  devAuthorized=DEV_QUERY&&!!currentUser&&DEV_UIDS.has(currentUser.uid);
  const tools=document.getElementById("dev-tools");
  if(!tools)return;
  tools.hidden=!devAuthorized;
  tools.setAttribute("aria-hidden",String(!devAuthorized));
  if(!devAuthorized){document.getElementById("dev-panel")?.setAttribute("hidden","");document.getElementById("dev-fab")?.setAttribute("aria-expanded","false");}
  if(devAuthorized)syncDevVoidToggle();
}
function syncDevVoidToggle(){
  const toggle=document.getElementById("dev-void-toggle"),status=document.getElementById("dev-status");
  if(!toggle)return;
  const on=localStorage.getItem("dev_void_purple")==="true";
  toggle.checked=on;
  if(status){status.textContent=on?"Void Purple unlocked for this browser.":"Void Purple is locked.";status.classList.toggle("active",on)}
  syncPicker();
}
function setDevVoidUnlocked(on){
  if(!devAuthorized)return;
  localStorage.setItem("dev_void_purple",String(!!on));
  syncDevVoidToggle();
  announce(on?"dev-void-unlock-on":"dev-void-unlock-off",on?"Void Purple Unlocked":"Void Purple Locked",on?"Developer test unlock enabled.":"Developer test unlock disabled.",false);
}
function initDevTools(){
  const tools=document.getElementById("dev-tools"),fab=document.getElementById("dev-fab"),panel=document.getElementById("dev-panel"),close=document.getElementById("dev-close"),handle=document.getElementById("dev-drag-handle"),toggle=document.getElementById("dev-void-toggle");
  if(!tools||!fab||!panel||!handle||!toggle)return;
  fab.addEventListener("click",()=>{const open=panel.hasAttribute("hidden");if(open)panel.removeAttribute("hidden");else panel.setAttribute("hidden","");fab.setAttribute("aria-expanded",String(open))});
  close?.addEventListener("click",()=>{panel.setAttribute("hidden","");fab.setAttribute("aria-expanded","false")});
  toggle.addEventListener("change",()=>setDevVoidUnlocked(toggle.checked));

  let drag=null;
  handle.addEventListener("pointerdown",e=>{
    if(e.target.closest("button"))return;
    const r=panel.getBoundingClientRect();
    drag={dx:e.clientX-r.left,dy:e.clientY-r.top};
    panel.classList.add("dragging");handle.setPointerCapture?.(e.pointerId);
  });
  handle.addEventListener("pointermove",e=>{
    if(!drag)return;
    const margin=8;
    const maxX=Math.max(margin,window.innerWidth-panel.offsetWidth-margin),maxY=Math.max(margin,window.innerHeight-panel.offsetHeight-margin);
    const x=Math.min(maxX,Math.max(margin,e.clientX-drag.dx)),y=Math.min(maxY,Math.max(margin,e.clientY-drag.dy));
    panel.style.left=`${x}px`;panel.style.top=`${y}px`;panel.style.right="auto";panel.style.bottom="auto";
  });
  const stopDrag=()=>{drag=null;panel.classList.remove("dragging")};
  handle.addEventListener("pointerup",stopDrag);handle.addEventListener("pointercancel",stopDrag);
}


const screens={difficulty:document.getElementById("difficulty-screen"),customize:document.getElementById("customize-screen"),gameplay:document.getElementById("gameplay-screen"),gameover:document.getElementById("gameover-screen")};
const canvas=document.getElementById("snake-board"),ctx=canvas.getContext("2d");
const appleEl=document.getElementById("apple-count"),lengthEl=document.getElementById("length-count"),modeEl=document.getElementById("current-mode-tag");
const configs={normal:{cols:24,rows:18,cell:28,target:20,interval:135},hardcore:{cols:28,rows:20,cell:25,target:50,interval:82}};
const state={mode:"normal",snake:[],apple:null,goldenApple:null,direction:{x:1,y:0},nextDirection:{x:1,y:0},apples:0,target:20,running:false,gameOver:false,timer:null,lastStep:0,skin:"white",fruit:"apple",secretDimension:false,goldenEligible:false,goldenSpawned:false};
const fruitEmoji={apple:"🍎",banana:"🍌",mango:"🥭",orange:"🍊",strawberry:"🍓"};
const skinNames={white:"White",red:"Red",green:"Green",blue:"Blue",yellow:"Yellow",rainbow:"Rainbow",gradient:"Gradient", "phase-purple":"Void Purple"};

let audio=null;
function audioCtx(){if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();return audio}
function tone(freq,dur,type="sine",vol=.08){const c=audioCtx(),o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,c.currentTime);g.gain.setValueAtTime(vol);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+dur);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+dur)}
function safeTone(...args){try{tone(...args)}catch(e){console.debug("Snake audio unavailable:",e)}}
function eatSfx(){safeTone(680,.08,"sine",.09);setTimeout(()=>safeTone(920,.1,"triangle",.07),45)}
function crashSfx(){safeTone(180,.28,"sawtooth",.08)}
function winSfx(){[523.25,659.25,783.99,1046.5].forEach((f,i)=>setTimeout(()=>safeTone(f,.18,"triangle",.11),i*75))}

function screen(name){
  Object.entries(screens).forEach(([k,e])=>{
    const active=k===name;
    e.classList.toggle("active",active);
    e.setAttribute("aria-hidden",String(!active));
  });
  requestAnimationFrame(()=>window.scrollTo(0,0));
}
function resizeCanvas(){const c=configs[state.mode];canvas.width=c.cols*c.cell;canvas.height=c.rows*c.cell;draw()}
function randomCell(){const c=configs[state.mode];return{x:Math.floor(Math.random()*c.cols),y:Math.floor(Math.random()*c.rows)}}
function same(a,b){return a.x===b.x&&a.y===b.y}
function spawnGoldenApple(){
  if(state.mode!=="hardcore"||state.secretDimension||state.goldenSpawned||!state.goldenEligible)return false;
  const c=configs[state.mode];
  const occupied=new Set(state.snake.map(seg=>`${seg.x},${seg.y}`));
  if(state.apple)occupied.add(`${state.apple.x},${state.apple.y}`);
  if(state.goldenApple)occupied.add(`${state.goldenApple.x},${state.goldenApple.y}`);
  const free=[];
  for(let y=0;y<c.rows;y++) for(let x=0;x<c.cols;x++) if(!occupied.has(`${x},${y}`)) free.push({x,y});
  if(!free.length)return false;
  state.goldenApple=free[Math.floor(Math.random()*free.length)];
  state.goldenSpawned=true;
  return true;
}
function spawnApple(){
  const c=configs[state.mode];
  const occupied=new Set(state.snake.map(seg=>`${seg.x},${seg.y}`));
  const free=[];
  for(let y=0;y<c.rows;y++) for(let x=0;x<c.cols;x++){
    if(!occupied.has(`${x},${y}`)) free.push({x,y});
  }
  if(!free.length){state.apple=null;return false}
  state.apple=free[Math.floor(Math.random()*free.length)];
  return true;
}
function updateUI(){appleEl.textContent=`${state.apples} / ${state.target}`;lengthEl.textContent=String(state.snake.length);const label=appleEl.parentElement?.querySelector("span");if(label)label.textContent="FRUIT";const sub=document.getElementById("target-label");if(sub)sub.textContent=state.secretDimension?"SECRET DIMENSION • 100 FRUIT":`${state.mode.toUpperCase()} • ${state.target} FRUIT`}
function skinColor(i){const s=state.skin;if(s==="rainbow"){return `hsl(${(i*32+Date.now()/9)%360},100%,${i===0?68:60}%)`}if(s==="gradient"){const colors=["#ff3d00","#ff8a00","#ffd000","#4ade80","#38bdf8","#2563eb"];return colors[Math.min(colors.length-1,Math.floor(i/3))]}return {white:"#ffffff",red:"#ef4444",green:"#22c55e",blue:"#3b82f6",yellow:"#facc15","phase-purple":"#a855f7"}[s]||"#fff"}
function draw(){if(!canvas.width)return;const c=configs[state.mode];ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#0d0d10";ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle="rgba(255,255,255,.045)";ctx.lineWidth=1;for(let x=0;x<=c.cols;x++){ctx.beginPath();ctx.moveTo(x*c.cell+.5,0);ctx.lineTo(x*c.cell+.5,canvas.height);ctx.stroke()}for(let y=0;y<=c.rows;y++){ctx.beginPath();ctx.moveTo(0,y*c.cell+.5);ctx.lineTo(canvas.width,y*c.cell+.5);ctx.stroke()}
  if(state.secretDimension){ctx.save();ctx.strokeStyle="rgba(168,85,247,.16)";ctx.lineWidth=2;for(let x=0;x<=c.cols;x+=2){ctx.beginPath();ctx.moveTo(x*c.cell+.5,0);ctx.lineTo(x*c.cell+.5,canvas.height);ctx.stroke()}for(let y=0;y<=c.rows;y+=2){ctx.beginPath();ctx.moveTo(0,y*c.cell+.5);ctx.lineTo(canvas.width,y*c.cell+.5);ctx.stroke()}ctx.restore()}
  if(state.apple){const cx=state.apple.x*c.cell+c.cell/2,cy=state.apple.y*c.cell+c.cell/2;ctx.font=`${Math.floor(c.cell*.65)}px system-ui`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(fruitEmoji[state.fruit]||fruitEmoji.apple,cx,cy+1)}
  if(state.goldenApple){const cx=state.goldenApple.x*c.cell+c.cell/2,cy=state.goldenApple.y*c.cell+c.cell/2;ctx.save();ctx.shadowBlur=20;ctx.shadowColor="#facc15";ctx.font=`${Math.floor(c.cell*.7)}px system-ui`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("🍏",cx,cy+1);ctx.restore()}
  state.snake.forEach((seg,i)=>{const pad=i===0?3:4;const x=seg.x*c.cell+pad,y=seg.y*c.cell+pad,w=c.cell-pad*2;ctx.fillStyle=skinColor(i);ctx.shadowBlur=state.skin==="rainbow"?(i===0?24:7):(i===0?14:0);ctx.shadowColor=ctx.fillStyle;roundRect(ctx,x,y,w,w,Math.min(7,w*.22));ctx.fill();ctx.shadowBlur=0});
  if(state.running&&(state.skin==="rainbow"||state.skin==="gradient")){requestAnimationFrame(()=>{if(state.running)draw()})}
}
function roundRect(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function setDirection(x,y){
  if(!state.running)return;
  // Reject an immediate 180° turn, but allow a valid turn to be queued.
  if(x===-state.direction.x&&y===-state.direction.y)return;
  state.nextDirection={x,y};
}
function keyHandler(e){const key=e.key.toLowerCase();const map={arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]};if(map[key]){e.preventDefault();setDirection(...map[key])}}
function unlockedSkin(id){if(["white","red","green","blue","yellow"].includes(id))return true;if(id==="rainbow")return localStorage.getItem("ach_king_cobra")==="true";if(id==="gradient")return localStorage.getItem("ach_slither_king")==="true";if(id==="phase-purple")return localStorage.getItem("ach_void_serpent")==="true"||localStorage.getItem("dev_void_purple")==="true";return false}
function unlockedFruit(id){if(["apple","banana","orange"].includes(id))return true;if(id==="mango")return localStorage.getItem("ach_king_cobra")==="true";if(id==="strawberry")return localStorage.getItem("ach_slither_king")==="true";return false}
function syncPicker(){document.querySelectorAll("[data-skin]").forEach(b=>{const id=b.dataset.skin;const ok=unlockedSkin(id);b.disabled=!ok;b.classList.toggle("locked",!ok);b.classList.toggle("selected",state.skin===id);b.querySelector(".lock-mark")?.replaceChildren(document.createTextNode(ok?"":"🔒"))});document.querySelectorAll("[data-fruit]").forEach(b=>{const id=b.dataset.fruit;const ok=unlockedFruit(id);b.disabled=!ok;b.classList.toggle("locked",!ok);b.classList.toggle("selected",state.fruit===id);b.querySelector(".lock-mark")?.replaceChildren(document.createTextNode(ok?"":"🔒"))})}
function chooseMode(mode){state.mode=mode;state.skin="white";state.fruit="apple";syncPicker();screen("customize")}
function start(){
  const c=configs[state.mode];
  cancelAnimationFrame(state.timer);
  state.apple=null;
  state.goldenApple=null;
  state.snake=[{x:Math.floor(c.cols/2),y:Math.floor(c.rows/2)}];
  state.direction={x:1,y:0};
  state.nextDirection={x:1,y:0};
  state.apples=0;
  state.target=c.target;
  state.secretDimension=false;
  state.goldenEligible=state.mode==="hardcore" && Math.random()<0.38;
  state.goldenSpawned=false;
  state.running=true;
  state.gameOver=false;
  state.lastStep=performance.now();
  modeEl.textContent=state.mode.toUpperCase();
  modeEl.classList.toggle("hardcore",state.mode==="hardcore");
  spawnApple();
  updateUI();
  resizeCanvas();
  screen("gameplay");
  state.timer=requestAnimationFrame(loop);
}
function loop(now){
  if(!state.running)return;
  const interval=configs[state.mode].interval;
  // Keep movement running after dropped/slow frames without creating a huge
  // burst of moves. This prevents apparent freezes after fruit collisions.
  let elapsed=now-state.lastStep;
  const maxCatchUp=interval*4;
  if(elapsed>maxCatchUp){
    state.lastStep=now-maxCatchUp;
    elapsed=maxCatchUp;
  }
  while(state.running && elapsed>=interval){
    state.lastStep+=interval;
    step();
    elapsed=now-state.lastStep;
  }
  if(state.running) state.timer=requestAnimationFrame(loop);
}
function enterSecretDimension(){
  state.secretDimension=true;
  state.apples=0;
  state.target=100;
  state.goldenApple=null;
  state.apple=null;
  state.goldenEligible=false;
  state.goldenSpawned=true;
  spawnApple();
  document.getElementById("current-mode-tag").textContent="SECRET DIMENSION";
  document.getElementById("current-mode-tag").classList.add("secret-tier");
  updateUI();
  draw();
  safeTone(392,.12,"triangle",.1);setTimeout(()=>safeTone(523,.14,"triangle",.1),90);setTimeout(()=>safeTone(784,.2,"triangle",.1),190);
}
function step(){
  if(!state.running || state.gameOver || !state.snake.length)return;
  state.direction={...state.nextDirection};
  const c=configs[state.mode];
  const head={x:state.snake[0].x+state.direction.x,y:state.snake[0].y+state.direction.y};
  let nextHead=head;
  const phasesWalls=state.secretDimension||state.skin==="phase-purple";
  if(phasesWalls){
    nextHead={x:(head.x+c.cols)%c.cols,y:(head.y+c.rows)%c.rows};
  }
  const wall=nextHead.x<0||nextHead.x>=c.cols||nextHead.y<0||nextHead.y>=c.rows;
  const eating=!!state.apple&&same(nextHead,state.apple);
  const goldenEating=!!state.goldenApple&&same(nextHead,state.goldenApple);
  const bodyToCheck=(eating||goldenEating)?state.snake:state.snake.slice(0,-1);
  const self=bodyToCheck.some(seg=>same(seg,nextHead));
  if((!phasesWalls&&wall)||self){end(false);return}
  state.snake.unshift(nextHead);
  if(goldenEating){
    eatSfx();
    enterSecretDimension();
    state.snake.pop();
    updateUI();draw();return;
  }
  if(eating){
    state.apples++;
    eatSfx();
    updateUI();
    if(state.apples>=state.target){end(true);return}
    if(!state.secretDimension && state.mode==="hardcore" && state.goldenEligible && !state.goldenSpawned && Math.random()<0.16)spawnGoldenApple();
    if(!spawnApple()){end(true);return}
  }else{
    state.snake.pop();
  }
  updateUI();draw();
}
async function award(pts,hcp,scp=0){if(!currentUser)return;try{const payload={points:increment(pts),hcPoints:increment(hcp)};if(scp)payload.scp=increment(scp);await updateDoc(doc(db,"users",currentUser.uid),payload)}catch(e){console.error("Failed to sync Snake reward:",e)}}
function toast(title,desc,hard=false){let box=document.getElementById("achievement-toast-container");if(!box)return;const t=document.createElement("div");t.className=`achievement-toast ${hard?"hard-tier":""}`;t.innerHTML=`<div class="toast-info"><span class="toast-title">${title}</span><span class="toast-desc">${desc}</span></div><span class="toast-badge locked">LOCKED</span>`;box.appendChild(t);setTimeout(()=>{const b=t.querySelector(".toast-badge");if(b){b.textContent="COMPLETED";b.className=`toast-badge completed-pop ${hard?"hard-tier-badge":""}`}},600);setTimeout(()=>t.classList.add("toast-hide"),3800);setTimeout(()=>t.remove(),4200);tone(523,.12,"triangle",.09);setTimeout(()=>tone(659,.12,"triangle",.09),70);setTimeout(()=>tone(784,.16,"triangle",.09),140)}
function announce(id,title,description,hard=false){const event={id,title,description,isHardTier:hard,nonce:`${Date.now()}-${Math.random()}`};toast(title,description,hard);try{const bus=new BroadcastChannel("ishan-fun-achievements");bus.postMessage(event);bus.close()}catch{}try{localStorage.setItem("ishan_fun_achievement_event",JSON.stringify(event))}catch{}}
function completeOnce(key,id,title,desc,pts,hcp,hard){if(localStorage.getItem(key)==="true")return false;localStorage.setItem(key,"true");announce(id,title,desc,hard);award(pts,hcp);return true}
function checkHardcoreSlayer(){const completed=["ach_hardcore_button","ach_hardcore_elemental","ach_hardcore_snake"].filter(k=>localStorage.getItem(k)==="true").length;if(completed>=2&&localStorage.getItem("ach_hardcore_slayer")!=="true")completeOnce("ach_hardcore_slayer","hardcore-slayer","Hardcore Slayer","Beat 2 games on Hardcore Mode.",0,5,true)}
function finishAchievement(won){
  if(!won)return;
  if(state.secretDimension){completeOnce("ach_void_serpent","void-serpent","Void Serpent","Enter the hidden dimension and collect 100 fruit. Unlocks the purple phase-shift snake that can pass through walls.",0,0,true);if(localStorage.getItem("ach_void_serpent_scp_awarded")!=="true"){localStorage.setItem("ach_void_serpent_scp_awarded","true");award(0,0,1)}}
  else if(state.mode==="normal")completeOnce("ach_slither_king","slither-king","Slither King","Beat Snake on Normal Mode.",10,0,false);
  else if(state.mode==="hardcore")completeOnce("ach_king_cobra","king-cobra","King Cobra","Beat Snake on Hardcore Mode.",0,5,true);
  if(state.mode==="hardcore"){if(localStorage.getItem("ach_hardcore_survivor")!=="true")localStorage.setItem("ach_hardcore_survivor","true");if(localStorage.getItem("ach_hardcore_snake")!=="true"){localStorage.setItem("ach_hardcore_snake","true");checkHardcoreSlayer()}}
}
function end(won){
  if(state.gameOver)return;
  state.gameOver=true;state.running=false;cancelAnimationFrame(state.timer);state.timer=null;state.apple=null;state.goldenApple=null;
  won?winSfx():crashSfx();
  const c=configs[state.mode];
  const title=state.secretDimension?"DIMENSION CLEARED":(won?"VICTORY":"GAME OVER");
  const sub=state.secretDimension?(won?"You conquered the hidden dimension and collected all 100 fruit.":`The snake crashed after ${state.apples} fruit.`):(won?`You ate ${state.target} fruit and grew to ${state.snake.length}.`:`The snake crashed after ${state.apples} fruit.`);
  document.getElementById("result-eyebrow").textContent=won?"VICTORY":"RUN ENDED";
  document.getElementById("result-title").textContent=title;
  document.getElementById("result-sub").textContent=sub;
  document.getElementById("reward-label").textContent=won?(state.secretDimension?"SECRET REWARD":"REWARD"):"FRUIT EATEN";
  document.getElementById("final-apples").textContent=won?(state.secretDimension?"+1 SCP":(state.mode==="hardcore"?"+5 HCP":"+10 PTS")):String(state.apples);
  document.getElementById("final-mode").textContent=(state.secretDimension?"SECRET DIMENSION":state.mode.toUpperCase()+" MODE")+" • "+skinNames[state.skin]+" • "+state.fruit.toUpperCase();
  document.getElementById("final-length").textContent=String(state.snake.length);
  document.getElementById("final-target").textContent=String(state.target);
  document.getElementById("victory-badge")?.classList.toggle("secret",state.secretDimension);
  if(won)finishAchievement(true);screen("gameover");
}

initDevTools();syncDevAccess();
document.getElementById("select-normal-btn").addEventListener("click",()=>chooseMode("normal"));document.getElementById("select-hardcore-btn").addEventListener("click",()=>chooseMode("hardcore"));document.getElementById("confirm-customize-btn").addEventListener("click",start);document.querySelectorAll("[data-skin]").forEach(b=>b.addEventListener("click",()=>{if(unlockedSkin(b.dataset.skin)){state.skin=b.dataset.skin;syncPicker()}}));document.querySelectorAll("[data-fruit]").forEach(b=>b.addEventListener("click",()=>{if(unlockedFruit(b.dataset.fruit)){state.fruit=b.dataset.fruit;syncPicker()}}));document.getElementById("play-again-btn").addEventListener("click",()=>{syncPicker();screen("customize")});window.addEventListener("keydown",keyHandler);window.addEventListener("resize",resizeCanvas);
