import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

const ELEMENTS = {
  fire:   { name: "Fire", emoji: "🔥", beats: ["nature"] },
  nature: { name: "Nature", emoji: "🌿", beats: ["water"] },
  water:  { name: "Water", emoji: "💧", beats: ["fire"] }
};

const state = {
  mode: null,
  playerLives: 3,
  botLives: 3,
  playerWins: 0,
  botWins: 0,
  round: 1,
  history: [],
  locked: false,
  currentUser: null
};

const screens = {
  difficulty: document.getElementById("difficulty-screen"),
  gameplay: document.getElementById("gameplay-screen"),
  result: document.getElementById("result-screen")
};

let audioCtx = null;

function getAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

const sfx = {
  click() {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + .05);
    gain.gain.setValueAtTime(.11, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.01, ctx.currentTime + .05);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + .05);
  },

  reveal() {
    const ctx = getAudio();

    [330, 440, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(.08, ctx.currentTime + i * .06);
      gain.gain.exponentialRampToValueAtTime(.01, ctx.currentTime + i * .06 + .13);

      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * .06);
      osc.stop(ctx.currentTime + i * .06 + .13);
    });
  },

  win() {
    const ctx = getAudio();

    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(.14, ctx.currentTime + i * .08);
      gain.gain.exponentialRampToValueAtTime(.01, ctx.currentTime + i * .08 + .18);

      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * .08);
      osc.stop(ctx.currentTime + i * .08 + .18);
    });
  },

  lose() {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(260, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + .28);
    gain.gain.setValueAtTime(.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.01, ctx.currentTime + .28);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + .28);
  }
};

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomElement() {
  const keys = Object.keys(ELEMENTS);
  return keys[Math.floor(Math.random() * keys.length)];
}

function counterFor(element) {
  return Object.keys(ELEMENTS).find(
    key => ELEMENTS[key].beats.includes(element)
  ) || randomElement();
}

function predictPlayerMove() {
  if (!state.history.length) return randomElement();

  const counts = { fire: 0, nature: 0, water: 0 };
  state.history.forEach(move => counts[move]++);

  const max = Math.max(...Object.values(counts));
  const candidates = Object.keys(counts).filter(
    key => counts[key] === max
  );

  const recent = state.history[state.history.length - 1];

  if (recent && Math.random() < 0.35) {
    return recent;
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

function chooseBotMove() {
  const predicted = predictPlayerMove();

  if (state.mode === "hardcore") {
    // 90% correct prediction, 10% wrong prediction.
    if (Math.random() < 0.90) {
      return counterFor(predicted);
    }
    return randomElement();
  }

  // Normal starts out close to random and only gradually leans on its read
  // of you as more rounds are played, instead of hard-countering right away.
  const roundsPlayed = state.history.length;
  const learn = Math.min(roundsPlayed / 6, 1); // ramps up over ~6 rounds
  const counterChance = 0.12 + learn * 0.28; // 12% early game -> 40% once "learned"

  if (predicted && Math.random() < counterChance) {
    return counterFor(predicted);
  }

  return randomElement();
}

function getOutcome(player, bot) {
  if (player === bot) return "draw";
  return ELEMENTS[player].beats.includes(bot) ? "win" : "lose";
}

function showScreen(name) {
  Object.values(screens).forEach(screen => screen.classList.add("hidden"));
  screens[name].classList.remove("hidden");

  requestAnimationFrame(() => {
    screens[name].style.animation = "none";
    void screens[name].offsetWidth;
    screens[name].style.animation = "";
  });
}

function renderLives() {
  document.getElementById("player-lives").textContent =
    "♥ ".repeat(Math.max(0, state.playerLives)).trim() || "—";

  document.getElementById("bot-lives").textContent =
    "♥ ".repeat(Math.max(0, state.botLives)).trim() || "—";

  document.getElementById("round-score").textContent =
    `${state.playerWins} - ${state.botWins}`;

  document.getElementById("round-label").textContent =
    `ROUND ${state.round}`;
}

function setElementDisplay(id, element) {
  const target = document.getElementById(id);
  target.textContent = element ? ELEMENTS[element].emoji : "?";
  target.classList.remove("hit-win", "hit-lose", "hit-draw");
}

function startMode(mode) {
  sfx.click();

  state.mode = mode;
  state.playerLives = 3;
  state.botLives = 3;
  state.playerWins = 0;
  state.botWins = 0;
  state.round = 1;
  state.history = [];
  state.locked = false;

  document.getElementById("current-mode-tag").textContent =
    mode === "hardcore" ? "HARDCORE" : "NORMAL";

  document.getElementById("battle-message").innerHTML =
    "<strong>Choose your element</strong><span>Three lives each. First to 0 loses.</span>";

  document.getElementById("player-element").textContent = "?";
  document.getElementById("bot-element").textContent = "?";
  document.getElementById("choice-prompt").textContent = "Choose your element";

  document.querySelectorAll(".element-btn").forEach(btn => {
    btn.classList.remove("selected");
  });

  renderLives();
  showScreen("gameplay");
}

async function playRound(playerChoice) {
  if (state.locked) return;

  state.locked = true;
  sfx.click();

  document.querySelectorAll(".element-btn").forEach(btn => {
    btn.classList.remove("selected");
  });

  document
    .querySelector(`[data-element="${playerChoice}"]`)
    .classList.add("selected");

  state.history.push(playerChoice);

  document.getElementById("choice-prompt").textContent =
    "Bot is choosing...";

  document.getElementById("battle-message").innerHTML =
    "<strong>Reading the battlefield...</strong><span>Reveal incoming.</span>";

  await wait(650);

  const botChoice = chooseBotMove();

  setElementDisplay("player-element", playerChoice);
  setElementDisplay("bot-element", botChoice);

  sfx.reveal();

  await wait(480);

  const result = getOutcome(playerChoice, botChoice);

  const playerCard = document.getElementById("player-element");
  const botCard = document.getElementById("bot-element");

  if (result === "win") {
    state.botLives--;
    state.playerWins++;

    playerCard.classList.add("hit-win");
    botCard.classList.add("hit-lose");

    sfx.win();

    document.getElementById("battle-message").innerHTML =
      `<strong>✨ ${ELEMENTS[playerChoice].name} wins!</strong>
       <span>${ELEMENTS[playerChoice].name} overcomes ${ELEMENTS[botChoice].name}.</span>`;
  } else if (result === "lose") {
    state.playerLives--;
    state.botWins++;

    playerCard.classList.add("hit-lose");
    botCard.classList.add("hit-win");

    sfx.lose();

    document.getElementById("battle-message").innerHTML =
      `<strong>💥 ${ELEMENTS[botChoice].name} wins!</strong>
       <span>The bot's ${ELEMENTS[botChoice].name} counters your ${ELEMENTS[playerChoice].name}.</span>`;
  } else {
    playerCard.classList.add("hit-draw");
    botCard.classList.add("hit-draw");

    document.getElementById("battle-message").innerHTML =
      `<strong>⚖️ Draw!</strong>
       <span>Both sides chose ${ELEMENTS[playerChoice].name}.</span>`;
  }

  renderLives();

  if (state.playerLives <= 0 || state.botLives <= 0) {
    await wait(900);
    finishBattle(state.botLives <= 0);
    return;
  }

  state.round++;

  await wait(700);

  document.getElementById("player-element").textContent = "?";
  document.getElementById("bot-element").textContent = "?";
  document.getElementById("choice-prompt").textContent = "Choose your element";

  document.getElementById("battle-message").innerHTML =
    "<strong>Next round</strong><span>Read the pattern and make your move.</span>";

  document.querySelectorAll(".element-btn").forEach(btn => {
    btn.classList.remove("selected");
  });

  state.locked = false;
  renderLives();
}

function broadcastAchievement(id, title, description, hard = false) {
  const event = {
    id,
    title,
    description,
    isHardTier: hard,
    nonce: `${Date.now()}-${Math.random()}`
  };

  // Same-page toast.
  showAchievementToast({
    title,
    description,
    hard
  });

  // Other Ishan.fun tabs/pages.
  try {
    const channel = new BroadcastChannel("ishan-fun-achievements");
    channel.postMessage(event);
    channel.close();
  } catch {}

  // Fallback for browsers without BroadcastChannel.
  try {
    localStorage.setItem("ishan_fun_achievement_event", JSON.stringify(event));
  } catch {}
}

function showAchievementToast({ title, description, hard = false }) {
  const container = document.getElementById("achievement-toast-container");

  const toast = document.createElement("div");
  toast.className = `achievement-toast ${hard ? "hard-tier" : ""}`;

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
      badge.className = `toast-badge completed ${hard ? "hard" : ""}`;
    }
  }, 600);

  setTimeout(() => toast.classList.add("toast-hide"), 3800);
  setTimeout(() => toast.remove(), 4200);
}

// Listen for achievement toasts from the hub or another game tab.
try {
  const channel = new BroadcastChannel("ishan-achievements");
  channel.addEventListener("message", event => {
    if (event.data) showAchievementToast(event.data);
  });
} catch {}

window.addEventListener("storage", event => {
  if (event.key !== "ishan-achievement-event" || !event.newValue) return;

  try {
    const data = JSON.parse(event.newValue);
    showAchievementToast(data);
  } catch {}
});

async function awardAchievement(points, hcPoints) {
  if (!state.currentUser) return;

  try {
    const userRef = doc(db, "users", state.currentUser.uid);
    const rewards = {};
    if (points) rewards.points = increment(points);
    if (hcPoints) rewards.hcPoints = increment(hcPoints);
    if (Object.keys(rewards).length) await updateDoc(userRef, rewards);
  } catch (error) {
    console.error("Could not update achievement reward:", error);
  }
}

function checkHardcoreSlayer() {
  if (
    localStorage.getItem("ach_hardcore_button") === "true" &&
    localStorage.getItem("ach_hardcore_elemental") === "true" &&
    localStorage.getItem("ach_hardcore_slayer") !== "true"
  ) {
    localStorage.setItem("ach_hardcore_slayer", "true");
    broadcastAchievement(
      "hardcore-slayer",
      "Hardcore Slayer",
      "Beat 2 games on Hardcore Mode.",
      true
    );
    awardAchievement(0, 5);
  }
}

async function finishBattle(playerWon) {
  const hardcore = state.mode === "hardcore";

  document.getElementById("result-icon").textContent =
    playerWon ? "🏆" : "💥";

  document.getElementById("result-title").textContent =
    playerWon ? "Victory!" : "Defeat";

  document.getElementById("result-sub").textContent =
    playerWon
      ? `You took the Elemental Battle with ${state.playerLives} life${state.playerLives === 1 ? "" : "s"} left.`
      : "The bot took all three lives before you could.";

  document.getElementById("result-record").textContent =
    `${state.playerWins} - ${state.botWins}`;

  if (hardcore) {
    document.getElementById("result-reward").textContent =
      playerWon ? "+1 HCP" : "0 HCP";
  } else {
    document.getElementById("result-reward").textContent =
      playerWon ? "+5 PTS" : "-5 PTS";
  }

  // Rewards only apply when a user is signed in.
  if (state.currentUser) {
    try {
      const userRef = doc(db, "users", state.currentUser.uid);

      if (hardcore) {
        if (playerWon) {
          await updateDoc(userRef, { hcPoints: increment(1) });
        }
      } else {
        await updateDoc(userRef, {
          points: increment(playerWon ? 5 : -5)
        });
      }
    } catch (error) {
      console.error("Could not update Elemental Battle reward:", error);
    }
  }

  // Achievement progress is recorded locally so it is only awarded once.
  const noLivesLost = state.playerLives === 3;

  if (playerWon && !hardcore && noLivesLost &&
      localStorage.getItem("ach_elemental_master") !== "true") {
    localStorage.setItem("ach_elemental_master", "true");
    broadcastAchievement(
      "elemental-master",
      "Elemental Master",
      "Beat Elemental Battle on Normal Mode without losing any lives."
    );
    await awardAchievement(10, 0);
  }

  // Hardcore Survivor is earned by actually winning an Elemental Battle on Hardcore.
  if (playerWon && hardcore) {
    if (localStorage.getItem("achievement-hardcore-survivor") !== "true") {
      localStorage.setItem("achievement-hardcore-survivor", "true");

      broadcastAchievement(
        "hardcore-survivor",
        "Hardcore Survivor",
        "You won an Elemental Battle on Hardcore.",
        true
      );
    }

    // Elemental God requires a flawless Hardcore Elemental Battle.
    if (noLivesLost &&
        localStorage.getItem("ach_elemental_god") !== "true") {
      localStorage.setItem("ach_elemental_god", "true");
      broadcastAchievement(
        "elemental-god",
        "Elemental God",
        "Beat Elemental Battle on Hardcore without losing any lives.",
        true
      );
      await awardAchievement(0, 5);
    }

    // This game counts toward the two-hardcore-games achievement.
    if (localStorage.getItem("ach_hardcore_elemental") !== "true") {
      localStorage.setItem("ach_hardcore_elemental", "true");
      checkHardcoreSlayer();
    }
  }

  showScreen("result");
}

function resetToModes() {
  sfx.click();
  state.locked = false;
  showScreen("difficulty");
}

document.querySelectorAll(".mode-card").forEach(card => {
  card.addEventListener("click", () => {
    startMode(
      card.id === "select-hardcore-btn"
        ? "hardcore"
        : "normal"
    );
  });
});

document.querySelectorAll(".element-btn").forEach(button => {
  button.addEventListener("click", () => {
    playRound(button.dataset.element);
  });
});

document.getElementById("play-again-btn").addEventListener("click", () => {
  startMode(state.mode || "normal");
});

onAuthStateChanged(auth, async user => {
  state.currentUser = user;

  // The profile is normally created by the homepage.
  // This fallback keeps the game from failing for a newly authenticated user.
  if (user) {
    try {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        console.warn("User profile does not exist yet; homepage should create it.");
      }
    } catch (error) {
      console.warn("Could not read user profile:", error);
    }
  }
});
