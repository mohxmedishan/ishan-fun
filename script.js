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

let cachedUsername = "Player";

// Brand Refresh Click
logoBtn?.addEventListener("click", () => window.location.reload());

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

    if (authModal) authModal.classList.remove("active");
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

// FETCH LEADERBOARD WITH VISIBILITY CHECK
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

      // Populate Pinned Bar
      myRankEl.textContent = `#${currentUserRank}`;
      myNameEl.textContent = currentUserData.name;
      myPtsEl.textContent = `${currentUserData.pts} pts`;
      myHcEl.textContent = `${currentUserData.hcPts} HCP`;

      // Helper to calculate visibility within the scroll box
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

      // Initial visibility check & scroll observer
      updateRankBarVisibility();
      leaderboardList.onscroll = updateRankBarVisibility;
    }

  } catch (err) {
    console.error("Leaderboard fetch error:", err);
    leaderboardList.innerHTML = '<li class="loading-item">Failed to load leaderboard.</li>';
  }
}
// Background Music Control
const bgMusic = document.getElementById("bg-music");
const musicToggleBtn = document.getElementById("music-toggle-btn");

if (bgMusic && musicToggleBtn) {
  bgMusic.volume = 0.25; // Set soft ambient background volume (25%)

  musicToggleBtn.addEventListener("click", () => {
    if (bgMusic.paused) {
      bgMusic.play().then(() => {
        musicToggleBtn.textContent = "🔊 Music: On";
        musicToggleBtn.classList.add("active-music");
      }).catch(err => {
        console.warn("Audio play blocked by browser policy:", err);
      });
    } else {
      bgMusic.pause();
      musicToggleBtn.textContent = "🎵 Music: Off";
      musicToggleBtn.classList.remove("active-music");
    }
  });
}
