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
onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

let clicks = parseInt(localStorage.getItem("clicker_clicks") || "0");
let rebirths = parseInt(localStorage.getItem("clicker_rebirths") || "0");
let hardcoreClicks = parseInt(localStorage.getItem("clicker_hardcore") || "0");

const clickEl = document.getElementById("click-count");
const rebirthEl = document.getElementById("rebirth-count");
const hardcoreEl = document.getElementById("hardcore-count");

const clickBtn = document.getElementById("main-click-btn");
const hardcoreBtn = document.getElementById("hardcore-click-btn");
const rebirthBtn = document.getElementById("rebirth-btn");

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
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

  setTimeout(() => {
    toast.classList.add("toast-hide");
  }, 3800);

  setTimeout(() => {
    toast.remove();
  }, 4200);
}

function updateUI() {
  if (clickEl) clickEl.textContent = clicks.toLocaleString();
  if (rebirthEl) rebirthEl.textContent = rebirths.toLocaleString();
  if (hardcoreEl) hardcoreEl.textContent = hardcoreClicks.toLocaleString();
}

async function awardPoints(pts, hcPts) {
  if (!currentUser) return;
  try {
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
      points: increment(pts),
      hcPoints: increment(hcPts)
    });
  } catch (err) {
    console.error("Failed to sync achievement points:", err);
  }
}

function checkAchievements() {
  // Check 'Button Smasher!' (1,000 clicks in a single un-rebirthed run)
  if (clicks >= 1000 && rebirths === 0 && localStorage.getItem("ach_button_smasher") !== "true") {
    localStorage.setItem("ach_button_smasher", "true");
    triggerAchievementToast("Button Smasher!", "Reach 1,000 clicks in a single un-rebirthed run.", false);
    awardPoints(10, 0);
  }

  // Check 'Hardcore Survivor' (100 Hardcore clicks)
  if (hardcoreClicks >= 100 && localStorage.getItem("ach_hardcore_survivor") !== "true") {
    localStorage.setItem("ach_hardcore_survivor", "true");
    triggerAchievementToast("Hardcore Survivor", "Reach 100 Hardcore Mode clicks.", true);
    awardPoints(0, 5);
  }
}

clickBtn?.addEventListener("click", () => {
  clicks++;
  localStorage.setItem("clicker_clicks", clicks);
  updateUI();
  checkAchievements();
});

hardcoreBtn?.addEventListener("click", () => {
  hardcoreClicks++;
  localStorage.setItem("clicker_hardcore", hardcoreClicks);
  updateUI();
  checkAchievements();
});

rebirthBtn?.addEventListener("click", () => {
  if (clicks >= 1000) {
    clicks = 0;
    rebirths++;
    localStorage.setItem("clicker_clicks", clicks);
    localStorage.setItem("clicker_rebirths", rebirths);
    updateUI();
  } else {
    alert("You need at least 1,000 clicks to Rebirth!");
  }
});

updateUI();
