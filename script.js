import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const googleProvider = new GoogleAuthProvider();

// Web Audio API Synthesizer (Instant Lag-Free SFX)
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

// SFX Generator Functions
const playSFX = {
  click: () => {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  },
  logo: () => {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  },
  loginSuccess: () => {
    const ctx = getAudioContext();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 Major Arpeggio
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + (idx * 0.08));
      gain.gain.setValueAtTime(0.15, ctx.currentTime + (idx * 0.08));
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (idx * 0.08) + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + (idx * 0.08));
      osc.stop(ctx.currentTime + (idx * 0.08) + 0.15);
    });
  },
  playGame: () => {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }
};

// Global SFX Binding to all standard buttons
document.addEventListener("click", (e) => {
  const target = e.target.closest("button, .nav-btn, .action-btn, .close-btn");
  if (target && target.id !== "logo" && !target.classList.contains("sfx-link")) {
    playSFX.click();
  }
});

// DOM Elements
const logoBtn = document.getElementById("logo");
const authModal = document.getElementById("auth-modal");
const lbModal = document.getElementById("leaderboard-modal");
const openAuthBtn = document.getElementById("open-auth-btn");
const closeAuthBtn = document.getElementById("close-auth-modal");
const leaderboardBtn = document.getElementById("leaderboard-btn");
const closeLbBtn = document.getElementById("close-lb-modal");

const statusEl = document.getElementById("user-status");
const logoutBtn = document.getElementById("logout-btn");
const heroSubtitle = document.getElementById("hero-subtitle");
const leaderboardList = document.getElementById("leaderboard-list");

const personalRankBar = document.getElementById("personal-rank-bar");
const myRankEl = document.getElementById("my-rank");
const myNameEl = document.getElementById("my-name");
const myPtsEl = document.getElementById("my-pts");
const myHcEl = document.getElementById("my-hc");

const musicFab = document.getElementById("music-fab");
const bgMusic = document.getElementById("bg-music");
const musicIcon = document.getElementById("music-icon");

let cachedUsername = "Player";

// Background Music Toggle (Bottom-Right FAB)
if (bgMusic && musicFab) {
  bgMusic.volume = 0.2;

  musicFab.addEventListener("click", () => {
    if (bgMusic.paused) {
      bgMusic.play().then(() => {
        musicFab.classList.add("playing");
        musicIcon.textContent = "🔊";
      }).catch(err => console.warn("Audio autoplay blocked:", err));
    } else {
      bgMusic.pause();
      musicFab.classList.remove("playing");
      musicIcon.textContent = "🎵";
    }
  });
}

// Play Link SFX
document.querySelectorAll(".sfx-link").forEach(link => {
  link.addEventListener("click", () => playSFX.playGame());
});

// Brand Logo Refresh
logoBtn?.addEventListener("click", () => {
  playSFX.logo();
  setTimeout(() => window.location.reload(), 120);
});

// Modal Controls
openAuthBtn?.addEventListener("click", () => authModal.classList.add("active"));
closeAuthBtn?.addEventListener("click", () => authModal.classList.remove("active"));
leaderboardBtn?.addEventListener("click", () => {
  lbModal.classList.add("active");
  fetchLeaderboard();
});
closeLbBtn?.addEventListener("click", () => lbModal.classList.remove("active"));

// SIGN UP
document.getElementById("signup-btn")?.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const username = document.getElementById("username").value.trim() || "Player";

  if (!email || !password) return alert("Please fill in email and password.");

  try {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", res.user.uid), {
      username: username,
      email: email,
      points: 0,
      hcPoints: 0,
      createdAt: new Date()
    });
  } catch (err) {
    alert(err.message);
  }
});

// LOG IN
document.getElementById("login-btn")?.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) return alert("Please fill in email and password.");

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert(err.message);
  }
});

// GOOGLE SIGN IN
document.getElementById("google-btn")?.addEventListener("click", async () => {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    const userRef = doc(db, "users", res.user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        username: res.user.displayName || "Player",
        email: res.user.email,
        points: 0,
        hcPoints: 0,
        createdAt: new Date()
      });
    }
  } catch (err) {
    alert(err.message);
  }
});

// LOG OUT
logoutBtn?.addEventListener("click", () => signOut(auth));

// AUTH STATE OBSERVER
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists() && userSnap.data().username) {
        cachedUsername = userSnap.data().username;
      } else {
        cachedUsername = user.displayName || user.email?.split("@")[0] || "Player";
      }
    } catch (e) {
      cachedUsername = user.displayName || user.email?.split("@")[0] || "Player";
    }

    if (statusEl) statusEl.textContent = cachedUsername;
    if (openAuthBtn) openAuthBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";

    if (heroSubtitle) {
      heroSubtitle.textContent = `🔥 Welcome back, ${cachedUsername}! Compete with top players on the leaderboard.`;
    }

    // Play Victory SFX on Login & Dismiss Modal
    if (authModal && authModal.classList.contains("active")) {
      playSFX.loginSuccess();
      authModal.classList.remove("active");
    }
  } else {
    cachedUsername = "Player";
    if (statusEl) statusEl.textContent = "Not logged in";
    if (openAuthBtn) openAuthBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";

    if (heroSubtitle) {
      heroSubtitle.textContent = "Log in to save your points to the global leaderboard.";
    }
  }
});

// FETCH LEADERBOARD
async function fetchLeaderboard() {
  if (!leaderboardList) return;
  leaderboardList.innerHTML = '<li class="loading-item">Loading leaderboard...</li>';
  if (personalRankBar) personalRankBar.style.display = "none";

  try {
    const q = query(collection(db, "users"), orderBy("points", "desc"), limit(50));
    const querySnapshot = await getDocs(q);

    leaderboardList.innerHTML = "";
    let rank = 1;
    let currentUserRank = null;
    let currentUserData = null;
    let myUserElement = null;

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const pts = data.points || 0;
      const hcPts = data.hcPoints || 0;
      const isMe = auth.currentUser && docSnap.id === auth.currentUser.uid;

      if (isMe) {
        currentUserRank = rank;
        currentUserData = { pts, hcPts, name: data.username || cachedUsername };
      }

      const li = document.createElement("li");
      li.className = `leaderboard-item ${isMe ? "current-user-item" : ""}`;
      li.innerHTML = `
        <span class="rank">#${rank}</span>
        <span class="name">${data.username || "Anonymous"}</span>
        <div class="scores">
          <span class="score-norm">${pts} pts</span>
          <span class="score-hc">${hcPts} HCP</span>
        </div>
      `;

      if (isMe) myUserElement = li;
      leaderboardList.appendChild(li);
      rank++;
    });

    if (auth.currentUser) {
      if (!currentUserRank) {
        const myDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        const myData = myDoc.exists() ? myDoc.data() : { points: 0, hcPoints: 0 };
        currentUserData = { 
          pts: myData.points || 0, 
          hcPts: myData.hcPoints || 0, 
          name: myData.username || cachedUsername 
        };
        currentUserRank = "50+";
      }

      myRankEl.textContent = `#${currentUserRank}`;
      myNameEl.textContent = currentUserData.name;
      myPtsEl.textContent = `${currentUserData.pts} pts`;
      myHcEl.textContent = `${currentUserData.hcPts} HCP`;

      const updateRankBarVisibility = () => {
        if (!myUserElement) {
          personalRankBar.style.display = "flex";
          return;
        }

        const listRect = leaderboardList.getBoundingClientRect();
        const itemRect = myUserElement.getBoundingClientRect();

        const isVisible = (
          itemRect.top >= listRect.top &&
          itemRect.bottom <= listRect.bottom
        );

        personalRankBar.style.display = isVisible ? "none" : "flex";
      };

      updateRankBarVisibility();
      leaderboardList.onscroll = updateRankBarVisibility;
    }

  } catch (err) {
    console.error("Leaderboard fetch error:", err);
    leaderboardList.innerHTML = '<li class="loading-item">Failed to load leaderboard.</li>';
  }
}
