import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Config
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

const tempColors = ["#0f0f12", "#005f73", "#0a9396", "#94d2bd", "#e9d8a6", "#ee9b00", "#ca6702", "#bb3e03", "#ae2012", "#9b5de5", "#f15bb5", "#00bbf9"];

const mainScreen = document.getElementById("main-screen");
const gameCard = document.getElementById("game-card");
const countEl = document.getElementById("count");
const incrementBtn = document.getElementById("increment-btn");
const rebirthBtn = document.getElementById("rebirth-btn");

const progressContainer = document.getElementById("progress-container");
const progressFill = document.getElementById("progress-fill");
const progressText = document.getElementById("progress-text");

const gameOverOverlay = document.getElementById("game-over-overlay");
const totalClicksEl = document.getElementById("total-clicks");
const restartBtn = document.getElementById("restart-btn");

let count = 0;
let rebirths = 0;
let totalClicks = 0;
let isGameOver = false;
let hasClickedOnce = false;

// Simple fade-in on load
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    gameCard.classList.add("fade-in");
  }, 100);
});

function animateButton(btn) {
  btn.animate([
    { transform: "scale(1)", filter: "brightness(1)" },
    { transform: "scale(0.93) translateY(2px)", filter: "brightness(1.4)" },
    { transform: "scale(1)", filter: "brightness(1)" }
  ], {
    duration: 100,
    easing: "ease-out"
  });
}

function animateRebirthButton() {
  rebirthBtn.animate([
    { transform: "translateY(-50%) scale(1)", filter: "brightness(1)" },
    { transform: "translateY(calc(-50% + 2px)) scale(0.93)", filter: "brightness(1.4)" },
    { transform: "translateY(-50%) scale(1)", filter: "brightness(1)" }
  ], {
    duration: 140,
    easing: "cubic-bezier(.34,1.25,.64,1)"
  });
}

function createParticle(x, y, value) {
  const particle = document.createElement("div");
  particle.className = "particle";
  particle.textContent = `+${value}`;

  const randomX = (Math.random() - 0.5) * 32;
  particle.style.left = `${x + randomX}px`;
  particle.style.top = `${y}px`;
  mainScreen.appendChild(particle);

  const animation = particle.animate([
    { transform: "translate(0,0) scale(0.9)", opacity: 1 },
    { transform: `translate(${randomX * 0.4}px,-55px) scale(1.15)`, opacity: 0.95, offset: 0.45 },
    { transform: `translate(${randomX * 0.8}px,-80px) scale(0.85)`, opacity: 0 }
  ], {
    duration: 750,
    easing: "cubic-bezier(.16,1,.3,1)"
  });

  animation.onfinish = () => particle.remove();
}

function updateProgressBar() {
  const percentage = Math.min(100, Math.floor((count / 100) * 100));
  progressFill.style.width = `${percentage}%`;
  progressText.textContent = `${percentage}%`;
}

function handleIncrement(e) {
  if (e) e.preventDefault();
  if (isGameOver) return;

  animateButton(incrementBtn);

  if (!hasClickedOnce) {
    hasClickedOnce = true;
    progressContainer.classList.remove("hide-progress");
    progressContainer.classList.add("show-progress");
    rebirthBtn.classList.remove("show-rebirth");
  }

  const incrementValue = Math.pow(2, rebirths);
  totalClicks += incrementValue;

  const rect = incrementBtn.getBoundingClientRect();
  const posX = e && e.clientX ? e.clientX : rect.left + rect.width / 2;
  const posY = rect.top - 28;
  createParticle(posX, posY, incrementValue);

  if (rebirths === 5 && (count + incrementValue) >= 100) {
    count = 100;
    countEl.textContent = count;
    updateProgressBar();
    triggerGameOver();
    return;
  }

  count += incrementValue;
  countEl.textContent = count;
  updateProgressBar();

  const cycleIndex = Math.floor(count / 5) % tempColors.length;
  mainScreen.style.backgroundColor = tempColors[cycleIndex];

  if (count >= 100) {
    progressContainer.classList.remove("show-progress");
    progressContainer.classList.add("hide-progress");

    rebirthBtn.textContent = `Rebirth to ${rebirths + 1}x (${Math.pow(2, rebirths + 1)} per click)`;
    rebirthBtn.classList.add("show-rebirth");
  }
}

function handleRebirth(e) {
  if (e) e.preventDefault();
  if (isGameOver) return;

  animateRebirthButton();

  if (count >= 100) {
    rebirths++;
    count = 0;
    countEl.textContent = count;

    progressFill.style.width = "0%";
    progressText.textContent = "0%";

    hasClickedOnce = false;

    progressContainer.classList.remove("show-progress", "hide-progress");
    rebirthBtn.classList.remove("show-rebirth");

    mainScreen.style.backgroundColor = tempColors[0];
  }
}

async function saveHighScoreToFirestore(score) {
  if (!auth.currentUser) return;
  try {
    const userRef = doc(db, "users", auth.currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const currentHighScore = userSnap.data().highScore || 0;
      if (score > currentHighScore) {
        await setDoc(userRef, { highScore: score }, { merge: true });
      }
    }
  } catch (err) {
    console.error("Score sync error:", err);
  }
}

function triggerGameOver() {
  isGameOver = true;
  totalClicksEl.textContent = totalClicks;
  saveHighScoreToFirestore(totalClicks);
  gameOverOverlay.classList.add("show");
}

function handleRestart(e) {
  if (e) e.preventDefault();

  animateButton(restartBtn);

  count = 0;
  rebirths = 0;
  totalClicks = 0;
  isGameOver = false;
  hasClickedOnce = false;

  countEl.textContent = count;
  progressFill.style.width = "0%";
  progressText.textContent = "0%";

  progressContainer.classList.remove("show-progress", "hide-progress");
  rebirthBtn.classList.remove("show-rebirth");

  mainScreen.style.backgroundColor = tempColors[0];
  gameOverOverlay.classList.remove("show");
}

incrementBtn.addEventListener("pointerdown", handleIncrement);
rebirthBtn.addEventListener("pointerdown", handleRebirth);
restartBtn.addEventListener("pointerdown", handleRestart);
