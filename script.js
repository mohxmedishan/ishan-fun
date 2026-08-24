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
const myPtsEl = document.getElementById("my-pts");
const myHcEl = document.getElementById("my-hc");

// Brand Refresh Click
logoBtn?.addEventListener("click", () => {
  window.location.reload();
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
    let displayUsername = "";
    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists() && userSnap.data().username) {
        displayUsername = userSnap.data().username;
      }
    } catch (e) {
      console.warn("Firestore fetch deferred:", e);
    }

    if (!displayUsername) {
      displayUsername = user.displayName || user.email?.split("@")[0] || "Player";
    }

    if (statusEl) statusEl.textContent = displayUsername;
    if (openAuthBtn) openAuthBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";

    if (heroSubtitle) {
      heroSubtitle.textContent = `🔥 Welcome back, ${displayUsername}! Compete with top players on the leaderboard.`;
    }

    if (authModal) {
      authModal.classList.remove("active");
    }
  } else {
    if (statusEl) statusEl.textContent = "Not logged in";
    if (openAuthBtn) openAuthBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";

    if (heroSubtitle) {
      heroSubtitle.textContent = "Log in to save your points to the global leaderboard.";
    }
  }
});

// FETCH LEADERBOARD (Top players + Personal Pinned Rank Bar)
async function fetchLeaderboard() {
  if (!leaderboardList) return;
  leaderboardList.innerHTML = '<li class="loading-item">Loading leaderboard...</li>';
  personalRankBar.style.display = "none";

  try {
    const q = query(collection(db, "users"), orderBy("points", "desc"), limit(50));
    const querySnapshot = await getDocs(q);

    leaderboardList.innerHTML = "";
    let rank = 1;
    let currentUserRank = null;
    let currentUserData = null;

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const pts = data.points || 0;
      const hcPts = data.hcPoints || 0;

      if (auth.currentUser && docSnap.id === auth.currentUser.uid) {
        currentUserRank = rank;
        currentUserData = { pts, hcPts };
      }

      const li = document.createElement("li");
      li.className = "leaderboard-item";
      li.innerHTML = `
        <span class="rank">#${rank}</span>
        <span class="name">${data.username || "Anonymous"}</span>
        <div class="scores">
          <span class="score-norm">${pts} pts</span>
          <span class="score-hc">${hcPts} HCP</span>
        </div>
      `;
      leaderboardList.appendChild(li);
      rank++;
    });

    // Populate pinned personal rank bar if user logged in
    if (auth.currentUser) {
      personalRankBar.style.display = "flex";
      if (currentUserRank) {
        myRankEl.textContent = `#${currentUserRank}`;
        myPtsEl.textContent = `${currentUserData.pts} pts`;
        myHcEl.textContent = `${currentUserData.hcPts} HCP`;
      } else {
        // User logged in but unranked in top 50
        const myDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        const myData = myDoc.exists() ? myDoc.data() : { points: 0, hcPoints: 0 };
        myRankEl.textContent = "#50+";
        myPtsEl.textContent = `${myData.points || 0} pts`;
        myHcEl.textContent = `${myData.hcPoints || 0} HCP`;
      }
    }

  } catch (err) {
    console.error("Leaderboard fetch error:", err);
    leaderboardList.innerHTML = '<li class="loading-item">Failed to load leaderboard.</li>';
  }
}
