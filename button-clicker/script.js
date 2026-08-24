import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC5c-np0wNIMkcowH4Rr1i5r3B2-qGY1e4",
  authDomain: "ishan-fun.firebaseapp.com",
  projectId: "ishan-fun",
  storageBucket: "ishan-fun.firebasestorage.app",
  messagingSenderId: "919307010777",
  appId: "1:919307010777:web:35b659050c32e7c05c74c8",
  measurementId: "G-S8H37T0FNX"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
onAuthStateChanged(auth, (user) => { currentUser = user; });

// Game State
let isHardcore = false;
let clicks = 0;
let totalRawClicksThisRun = 0;
let rebirths = 0;
const REBIRTH_TARGET = 100;
const MAX_REBIRTHS = 5;

// Audio Synthesizer
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playClickSFX() {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(400 + (clicks % 200), ctx.currentTime);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}

function playRebirthSFX() {
  const ctx = getAudioContext();
  const notes = [300, 450, 600, 800];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(freq, ctx.currentTime + (i * 0.06));
    gain.gain.setValueAtTime(0.15, ctx.currentTime + (i * 0.06));
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (i * 0.06) + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + (i * 0.06));
    osc.stop(ctx.currentTime + (i * 0.06) + 0.2);
  });
}

function playAchievementSFX() {
  const ctx = getAudioContext();
  const notes = [523.25, 659.25, 783.99, 1046.50];
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + (idx * 0.07));
    gain.gain.setValueAtTime(0.2, ctx.currentTime + (idx * 0.07));
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (idx * 0.07) + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + (idx * 0.07));
    osc.stop(ctx.currentTime + (idx * 0.07) + 0.25);
  });
}

// Toast Notification
function triggerAchievementToast(title, description, isHardTier = false) {
  let container = document.getElementById("achievement-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "achievement-toast-container";
    document.body.appendChild(container);
  }

  playAchievementSFX();

  const toast = document.createElement("div");
  toast.className = `achievement-toast ${isHardTier ? "hard-tier" : ""}`;
  toast.innerHTML = `
    <div class="toast-info">
      <span class="toast-title">${title}</span>
      <span class="toast-desc">${description}</span>
    </div>
    <span class="toast-badge locked">LOCKED</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    const badge = toast.querySelector(".toast-badge");
    if (badge) {
      badge.textContent = "COMPLETED";
      badge.className = `toast-badge completed-pop ${isHardTier ? "hard-tier-badge" : ""}`;
    }
  }, 600);

  setTimeout(() => { toast.classList.add("toast-hide"); }, 3800);
  setTimeout(() => { toast.remove(); }, 4200);
}

// Firestore Points Sync
async function awardPoints(pts, hcPts) {
  if (!currentUser) return;
  try {
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
      points: increment(pts),
      hcPoints: increment(hcPts)
    });
  } catch (err) {
    console.error("Failed to sync points:", err);
  }
}

// Multiplier Calculation
function getClickIncrement() {
  if (!isHardcore) {
    return 1 + rebirths; // Normal Mode: 1x, 2x, 3x, etc.
  }
  
  // Hardcore Mode Diminishing Returns: 1, 0.75, 0.5, 0.25, 0.125, 0.1
  const hardcoreRates = [1, 0.75, 0.5, 0.25, 0.125, 0.1];
  return hardcoreRates[Math.min(rebirths, hardcoreRates.length - 1)];
}

// UI & Animations Handler
const diffScreen = document.getElementById("difficulty-screen");
const gameScreen = document.getElementById("gameplay-screen");
const gameoverScreen = document.getElementById("gameover-screen");

const clickEl = document.getElementById("click-count");
const rebirthEl = document.getElementById("rebirth-count");
const clickBtn = document.getElementById("main-click-btn");
const modeTag = document.getElementById("current-mode-tag");

const progressContainer = document.getElementById("progress-container");
const progressFill = document.getElementById("progress-fill");
const progressText = document.getElementById("progress-text");
const rebirthBtn = document.getElementById("rebirth-btn");
const finishBtn = document.getElementById("finish-btn");

function updateUI() {
  clickEl.textContent = clicks.toLocaleString(undefined, { maximumFractionDigits: 3 });
  rebirthEl.textContent = `${rebirths} / ${MAX_REBIRTHS}`;

  if (clicks > 0 && rebirthBtn.classList.contains("hidden") && finishBtn.classList.contains("hidden")) {
    progressContainer.classList.remove("hidden");
  }

  const progressPercent = Math.min(100, (clicks / REBIRTH_TARGET) * 100);
  progressFill.style.width = `${progressPercent}%`;
  progressText.textContent = `${Math.floor(clicks)} / ${REBIRTH_TARGET} Clicks to Rebirth`;

  if (clicks >= REBIRTH_TARGET) {
    if (!progressContainer.classList.contains("hidden")) {
      progressContainer.classList.add("fade-out-scale");
      setTimeout(() => {
        progressContainer.classList.add("hidden");
        progressContainer.classList.remove("fade-out-scale");

        if (rebirths >= MAX_REBIRTHS) {
          finishBtn.classList.remove("hidden");
        } else {
          rebirthBtn.classList.remove("hidden");
        }
      }, 300);
    }
  }
}

// Game Mode Initialization
function startGame(hardcore) {
  isHardcore = hardcore;
  clicks = 0;
  totalRawClicksThisRun = 0;
  rebirths = 0;

  modeTag.textContent = isHardcore ? "HARDCORE MODE" : "NORMAL MODE";
  if (isHardcore) {
    modeTag.classList.add("hardcore");
  } else {
    modeTag.classList.remove("hardcore");
  }

  diffScreen.classList.add("hidden");
  gameoverScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  rebirthBtn.classList.add("hidden");
  finishBtn.classList.add("hidden");
  progressContainer.classList.add("hidden");

  updateUI();
}

// Click Triggering (Touch & Press Support)
function handleMainClick(e) {
  if (e) e.preventDefault();
  playClickSFX();

  clicks += getClickIncrement();
  totalRawClicksThisRun++;

  // Visual active trigger for soft taps/key releases
  clickBtn.classList.add("is-active");
  setTimeout(() => clickBtn.classList.remove("is-active"), 80);

  // Check Achievement: 'Button Smasher!' (1,000 raw clicks without rebirthing)
  if (totalRawClicksThisRun >= 1000 && rebirths === 0 && localStorage.getItem("ach_button_smasher") !== "true") {
    localStorage.setItem("ach_button_smasher", "true");
    triggerAchievementToast("Button Smasher!", "Reach 1,000 clicks in a single un-rebirthed run.", false);
    awardPoints(10, 0);
  }

  updateUI();
}

clickBtn.addEventListener("pointerdown", handleMainClick);

// Rebirth Action
rebirthBtn.addEventListener("click", () => {
  playRebirthSFX();
  rebirths++;
  clicks = 0;

  rebirthBtn.classList.add("fade-out-scale");
  setTimeout(() => {
    rebirthBtn.classList.add("hidden");
    rebirthBtn.classList.remove("fade-out-scale");
    progressContainer.classList.remove("hidden");
    updateUI();
  }, 300);
});

// Finish Game Action
finishBtn.addEventListener("click", () => {
  playAchievementSFX();
  
  document.getElementById("final-clicks").textContent = clicks.toLocaleString(undefined, { maximumFractionDigits: 3 });
  document.getElementById("final-mode").textContent = isHardcore ? "HARDCORE" : "NORMAL";

  // Check Achievement: 'Hardcore Player' (Beat any game in Hardcore Mode)
  if (isHardcore && localStorage.getItem("ach_hardcore_player") !== "true") {
    localStorage.setItem("ach_hardcore_player", "true");
    triggerAchievementToast("Hardcore Player", "Beat any game in Hardcore Mode.", true);
    awardPoints(0, 5);
  }

  gameScreen.classList.add("hidden");
  gameoverScreen.classList.remove("hidden");
});

// Button Setup
document.getElementById("select-normal-btn").addEventListener("click", () => startGame(false));
document.getElementById("select-hardcore-btn").addEventListener("click", () => startGame(true));
document.getElementById("play-again-btn").addEventListener("click", () => {
  gameoverScreen.classList.add("hidden");
  diffScreen.classList.remove("hidden");
});
