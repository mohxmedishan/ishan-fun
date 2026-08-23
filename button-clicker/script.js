const tempColors=["#121212","#005f73","#0a9396","#94d2bd","#e9d8a6","#ee9b00","#ca6702","#bb3e03","#ae2012","#9b5de5","#f15bb5","#00bbf9"];

const loadingCircle=document.getElementById("loading-circle");
const charcoalOverlay=document.getElementById("charcoal-overlay");
const loadingContent=document.getElementById("loading-content");
const typewriterEl=document.getElementById("typewriter");
const cursorEl=document.getElementById("cursor");
const playBtn=document.getElementById("play-btn");

const mainScreen=document.getElementById("main-screen");
const gameCard=document.getElementById("game-card");
const countEl=document.getElementById("count");
const incrementBtn=document.getElementById("increment-btn");
const rebirthBtn=document.getElementById("rebirth-btn");

const progressContainer=document.getElementById("progress-container");
const progressFill=document.getElementById("progress-fill");
const progressText=document.getElementById("progress-text");

const gameOverOverlay=document.getElementById("game-over-overlay");
const gameOverBox=document.getElementById("game-over-box");
const gameOverTitle=document.getElementById("game-over-title");
const gameOverStats=document.getElementById("game-over-stats");
const totalClicksEl=document.getElementById("total-clicks");
const restartBtn=document.getElementById("restart-btn");

const textToType="Button Clicker";
let charIndex=0;
let count=0;
let rebirths=0;
let totalClicks=0;
let isGameOver=false;
let hasClickedOnce=false;

window.addEventListener("DOMContentLoaded",()=>{
  setTimeout(()=>{
    loadingCircle.classList.add("circle-expanded");
    setTimeout(typeText,600);
  },400);
});

function typeText(){
  if(charIndex<textToType.length){
    typewriterEl.textContent+=textToType.charAt(charIndex);
    charIndex++;
    setTimeout(typeText,90);
  }else{
    cursorEl.classList.add("hide-cursor");
    setTimeout(()=>playBtn.classList.add("show-play"),300);
  }
}

function animatePlayButton(){
  playBtn.animate([
    {transform:"scale(1)",filter:"brightness(1)"},
    {transform:"scale(.82)",filter:"brightness(1.5)"},
    {transform:"scale(1.12)",filter:"brightness(1.2)"},
    {transform:"scale(1)",filter:"brightness(1)"}
  ],{
    duration:350,
    easing:"cubic-bezier(.34,1.85,.64,1)"
  });
}

function handlePlay(){
  animatePlayButton();
  setTimeout(()=>loadingContent.classList.add("slingshot-zoom"),150);
  setTimeout(()=>charcoalOverlay.classList.add("charcoal-expand"),600);
  setTimeout(()=>{
    document.getElementById("loading-screen").style.display="none";
    gameCard.classList.add("bounce-in");
  },1450);
}

function animateButton(btn){
  btn.animate([
    {transform:"scale(1)",filter:"brightness(1)"},
    {transform:"scale(.93) translateY(2px)",filter:"brightness(1.4)"},
    {transform:"scale(1)",filter:"brightness(1)"}
  ],{
    duration:100,
    easing:"ease-out"
  });
}

function animateRebirthButton(){
  rebirthBtn.animate([
    {
      transform:"translateY(-50%) scale(1)",
      filter:"brightness(1)"
    },
    {
      transform:"translateY(calc(-50% + 2px)) scale(.93)",
      filter:"brightness(1.4)"
    },
    {
      transform:"translateY(-50%) scale(1)",
      filter:"brightness(1)"
    }
  ],{
    duration:140,
    easing:"cubic-bezier(.34,1.25,.64,1)"
  });
}

function createParticle(x,y,value){
  const particle=document.createElement("div");
  particle.className="particle";
  particle.textContent=`+${value}`;

  const randomX=(Math.random()-.5)*32;
  particle.style.left=`${x+randomX}px`;
  particle.style.top=`${y}px`;
  mainScreen.appendChild(particle);

  const animation=particle.animate([
    {transform:"translate(0,0) scale(.9)",opacity:1},
    {transform:`translate(${randomX*.4}px,-55px) scale(1.15)`,opacity:.95,offset:.45},
    {transform:`translate(${randomX*.8}px,-80px) scale(.85)`,opacity:0}
  ],{
    duration:750,
    easing:"cubic-bezier(.16,1,.3,1)"
  });

  animation.onfinish=()=>particle.remove();
}

function updateProgressBar(){
  const percentage=Math.min(100,Math.floor((count/100)*100));
  progressFill.style.width=`${percentage}%`;
  progressText.textContent=`${percentage}%`;
}

function handleIncrement(e){
  if(e)e.preventDefault();
  if(isGameOver)return;

  animateButton(incrementBtn);

  if(!hasClickedOnce){
    hasClickedOnce=true;
    progressContainer.classList.remove("hide-progress");
    progressContainer.classList.add("show-progress");
    rebirthBtn.classList.remove("show-rebirth");
  }

  const incrementValue=Math.pow(2,rebirths);
  totalClicks+=incrementValue;

  const rect=incrementBtn.getBoundingClientRect();
  const posX=e&&e.clientX?e.clientX:rect.left+rect.width/2;
  const posY=rect.top-28;
  createParticle(posX,posY,incrementValue);

  if(rebirths===5&&(count+incrementValue)>=100){
    count=100;
    countEl.textContent=count;
    updateProgressBar();
    triggerGameOver();
    return;
  }

  count+=incrementValue;
  countEl.textContent=count;
  updateProgressBar();

  const cycleIndex=Math.floor(count/5)%tempColors.length;
  mainScreen.style.backgroundColor=tempColors[cycleIndex];

  if(count>=100){
    progressContainer.classList.remove("show-progress");
    progressContainer.classList.add("hide-progress");

    rebirthBtn.textContent=`Rebirth to ${rebirths+1}x (${Math.pow(2,rebirths+1)} per click)`;
    rebirthBtn.classList.add("show-rebirth");
  }
}

function handleRebirth(e){
  if(e)e.preventDefault();
  if(isGameOver)return;

  animateRebirthButton();

  if(count>=100){
    rebirths++;
    count=0;
    countEl.textContent=count;

    progressFill.style.width="0%";
    progressText.textContent="0%";

    hasClickedOnce=false;

    progressContainer.classList.remove("show-progress","hide-progress");
    rebirthBtn.classList.remove("show-rebirth");

    mainScreen.style.backgroundColor=tempColors[0];
  }
}

function triggerGameOver(){
  isGameOver=true;

  const currentBg=mainScreen.style.backgroundColor||"#121212";
  gameOverBox.style.backgroundColor=currentBg;
  restartBtn.style.backgroundColor=currentBg;
  totalClicksEl.textContent=totalClicks;

  gameOverOverlay.classList.add("show");

  setTimeout(()=>gameOverTitle.classList.add("slide-up"),500);
  setTimeout(()=>gameOverStats.classList.add("show-stats"),1000);
  setTimeout(()=>restartBtn.classList.add("show-btn"),1500);
}

function handleRestart(e){
  if(e)e.preventDefault();

  animateButton(restartBtn);

  count=0;
  rebirths=0;
  totalClicks=0;
  isGameOver=false;
  hasClickedOnce=false;

  countEl.textContent=count;
  progressFill.style.width="0%";
  progressText.textContent="0%";

  progressContainer.classList.remove("show-progress","hide-progress");
  rebirthBtn.classList.remove("show-rebirth");

  mainScreen.style.backgroundColor=tempColors[0];

  gameOverOverlay.classList.remove("show");
  gameOverTitle.classList.remove("slide-up");
  gameOverStats.classList.remove("show-stats");
  restartBtn.classList.remove("show-btn");
}

playBtn.addEventListener("pointerdown",handlePlay);
incrementBtn.addEventListener("pointerdown",handleIncrement);
rebirthBtn.addEventListener("pointerdown",handleRebirth);
restartBtn.addEventListener("pointerdown",handleRestart);