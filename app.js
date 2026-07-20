// ============================================================================
// app.js — منطق کامل UI، آفلاین و بدون بک‌اند.
// هرجا باید به سرور/شبکه‌ی تبلیغاتی واقعی وصل بشه، با TODO مشخص شده.
// ============================================================================

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ---------------------------------------------------------------------------
// Sound (سینتز شده با WebAudio، بدون فایل صوتی خارجی)
// ---------------------------------------------------------------------------
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function playTone(freq, duration, type = "sine", gainVal = 0.08, delay = 0) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainVal, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch (e) { /* audio not available, ignore */ }
}
const sound = {
  click: () => playTone(520, 0.05, "square", 0.04),
  coin: () => { playTone(880, 0.08, "sine", 0.07); playTone(1320, 0.1, "sine", 0.06, 0.05); },
  win: () => { [660, 880, 1100, 1320].forEach((f, i) => playTone(f, 0.15, "sine", 0.06, i * 0.08)); },
  lose: () => { playTone(300, 0.25, "sawtooth", 0.05); playTone(220, 0.3, "sawtooth", 0.04, 0.1); },
  tick: () => playTone(300 + Math.random() * 100, 0.03, "square", 0.02),
  bump: () => playTone(700, 0.06, "triangle", 0.05),
  error: () => playTone(180, 0.15, "sawtooth", 0.05),
};

// ---------------------------------------------------------------------------
// Haptic feedback
// ---------------------------------------------------------------------------
function haptic(style = "light") {
  try {
    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(style);
  } catch (e) { /* not in telegram, ignore */ }
}

// ---------------------------------------------------------------------------
// Toast + confetti
// ---------------------------------------------------------------------------
function showToast(msg, ms = 2600) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), ms);
}
function fireConfetti(count = 26) {
  const colors = ["#e04fd6", "#7b3ff2", "#ffcb4d", "#4fd77c"];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = 1.4 + Math.random() * 1.2 + "s";
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 2800);
  }
}

// ---------------------------------------------------------------------------
// Coin balance
// ---------------------------------------------------------------------------
function fmt(n) {
  const locale = appState.lang === "ru" ? "ru-RU" : appState.lang === "en" ? "en-US" : "fa-IR";
  return new Intl.NumberFormat(locale).format(Math.round(n));
}

function addCoins(amount, { withSound = true } = {}) {
  const from = appState.coins;
  const to = appState.coins + amount;
  appState.coins = to;
  animateCoinCounter(from, to);
  if ($("#stat-coins")) $("#stat-coins").textContent = fmt(to);
  if (withSound) sound.coin();
  haptic("medium");
  $(".balance-pill").classList.remove("pulse");
  void $(".balance-pill").offsetWidth;
  $(".balance-pill").classList.add("pulse");
  renderPacks();
  renderWheelSkinsGrid(); renderLevelWheelCard();
  queueUserSync();
}

function animateCoinCounter(from, to) {
  const el = $("#coin-balance");
  const duration = 500;
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (to - from) * eased);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------
function applyLanguage() {
  document.documentElement.lang = appState.lang === NEW_USER_LANG ? "fa" : appState.lang;
  document.documentElement.dir = (appState.lang === "en" || appState.lang === "ru") ? "ltr" : "rtl";
  $$("[data-i18n]").forEach((el) => { el.textContent = tr(el.dataset.i18n); });
  $$("[data-i18n-ph]").forEach((el) => { el.placeholder = tr(el.dataset.i18nPh); });
  renderLangOptions();
  updateStakeMaxHint();
  renderHomeLevelCard();
  renderLimitedTasks();
  renderNormalTasks();
  renderWheelSkinsGrid(); renderLevelWheelCard();
  renderGiftsGrid();
  renderPlayers();
  updateWheelModalState();
  renderProfile();
  if ($("#page-leaderboard").classList.contains("active")) renderLeaderboard();
}

function renderLangOptions() {
  const wrap = $("#lang-options");
  wrap.innerHTML = "";
  LANGUAGES.forEach((l) => {
    const btn = document.createElement("button");
    btn.className = "lang-option" + (l.code === appState.lang ? " active" : "");
    btn.innerHTML = `<span>${l.flag}</span><span>${l.label}</span>`;
    btn.addEventListener("click", () => {
      appState.lang = l.code;
      applyLanguage();
      sound.click();
      queueUserSync();
      if (forcingLanguageSelect) closeLangModal(true);
    });
    wrap.appendChild(btn);
  });
}

// وقتی force=true باشه (کاربر تازه، هنوز زبانی انتخاب نکرده)، دکمه‌ی بستن مخفی
// میشه و کلیک روی پس‌زمینه هم کاری نمی‌کنه — باید حتماً یه زبان انتخاب کنه.
let forcingLanguageSelect = false;
function openLangModal(force = false) {
  forcingLanguageSelect = force;
  $("#lang-modal-close").style.display = force ? "none" : "";
  $("#lang-modal-backdrop").classList.remove("hidden");
}
function closeLangModal(fromForcedSelect = false) {
  if (forcingLanguageSelect && !fromForcedSelect) return; // هنوز مجازه نیست ببندش
  forcingLanguageSelect = false;
  $("#lang-modal-close").style.display = "";
  $("#lang-modal-backdrop").classList.add("hidden");
}

// دکمه‌ی تنظیمات (پروفایل) — الان فقط زبان داره؛ TODO (کاربر): اینجا محل
// خوبیه برای اضافه‌کردن هر تنظیمات آینده‌ی پروفایل (اعلان‌ها، حریم خصوصی و...)
$("#settings-open-btn").addEventListener("click", () => {
  openLangModal(false);
  sound.click();
  haptic("light");
});
$("#lang-modal-close").addEventListener("click", () => closeLangModal());
$("#lang-modal-backdrop").addEventListener("click", (e) => {
  if (e.target.id === "lang-modal-backdrop") closeLangModal();
});


// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
function goToPage(name) {
  $$(".page").forEach((p) => p.classList.remove("active"));
  $(`#page-${name}`).classList.add("active");
  $$(".tabbar-btn").forEach((b) => b.classList.toggle("active", b.dataset.page === name));
  $("#floating-buttons").style.display = name === "home" ? "flex" : "none";
  if (name === "leaderboard") renderLeaderboard();
  if (name === "profile") loadUserReferrals().then(() => { renderReferralList(); $("#stat-referrals").textContent = fmt(cachedReferrals.length); });
  sound.click();
  haptic("light");
}
$$(".tabbar-btn").forEach((btn) => btn.addEventListener("click", () => goToPage(btn.dataset.page)));

// ---------------------------------------------------------------------------
// Wheel rotation helpers (مشترک بین چرخ رایگان و اتاق سکه)
// نکته‌ی مهم: مثلث نشانگر بالای دایره است (زاویه‌ی صفحه = ۲۷۰ درجه در مختصات
// canvas که ۰ درجه سمت راست/ساعت ۳ است و در جهت عقربه‌ها زیاد می‌شود). این افست
// باید حتماً در محاسبه لحاظ بشه، وگرنه گردونه یک‌جای دیگه می‌ایسته ولی برنده‌ی
// جای دیگه‌ای اعلام می‌شه (باگی که قبلاً بود).
// چرخش همیشه به سمت چپ (پادساعتگرد) و پیوسته‌ست — یعنی rotation فقط منفی‌تر
// می‌شه، هیچ‌وقت نمی‌پره به یه مقدار مثبت/صفر جدید.
// ---------------------------------------------------------------------------
const POINTER_SCREEN_ANGLE_DEG = 270;

function computeCCWFinalRotation(prevRotationDeg, targetCenterDeg, extraFullSpins) {
  const neededMod = ((POINTER_SCREEN_ANGLE_DEG - targetCenterDeg) % 360 + 360) % 360;
  const base = prevRotationDeg - extraFullSpins * 360;
  const remainder = ((base % 360) + 360) % 360;
  const shift = remainder - neededMod;
  return base - shift; // rotation ≡ neededMod (mod 360) و کاملاً کمتر از prevRotationDeg (پادساعتگرد پیوسته)
}

// انیمیشن دستی (نه CSS transition) تا بشه سرعتش رو دقیق کنترل کرد:
// حدود ۷۲٪ اول مدت با سرعت نسبتاً ثابت (حس واقعی چرخیدن)، بعد کند شدن تدریجی تا توقف کامل.
function animateWheelRotation(canvasEl, fromDeg, toDeg, durationMs, onTick, onDone) {
  canvasEl.style.transition = "none";
  const start = performance.now();
  const delta = toDeg - fromDeg;
  const splitFrac = 0.72; // این نسبت از زمان، با سرعت نسبتاً ثابت می‌چرخه (برای ۷ ثانیه ≈ ۵ ثانیه)
  const splitPortion = 0.7; // این نسبت از کل چرخش، توی همون بخش اول طی می‌شه

  function ease(t) {
    if (t <= splitFrac) {
      const localT = t / splitFrac;
      return splitPortion * Math.pow(localT, 0.9); // شروع نرم، بعد سرعت تقریبا ثابت
    }
    const localT = (t - splitFrac) / (1 - splitFrac);
    const eased = 1 - Math.pow(1 - localT, 3); // کند شدن تدریجی و طبیعی تا توقف
    return splitPortion + (1 - splitPortion) * eased;
  }

  function step(now) {
    const t = Math.min((now - start) / durationMs, 1);
    const e = ease(t);
    canvasEl.style.transform = `rotate(${fromDeg + delta * e}deg)`;
    if (onTick) onTick(t);
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      canvasEl.style.transform = `rotate(${toDeg}deg)`;
      if (onDone) onDone();
    }
  }
  requestAnimationFrame(step);
}

// ---------------------------------------------------------------------------
// Weighted random helper (شفاف و منصفانه — بدون دستکاری پنهانی)
// ---------------------------------------------------------------------------
function weightedRandomIndex(weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    if (r < weights[i]) return i;
    r -= weights[i];
  }
  return weights.length - 1;
}

// ---------------------------------------------------------------------------
// FLOATING FREE WHEEL (چرخ شانس شناور قدیمی — هر ۱۲ ساعت با تبلیغ)
// ---------------------------------------------------------------------------
const wheelCanvas = $("#wheel-canvas");
const wheelCtx = wheelCanvas.getContext("2d");
let wheelRotation = 0;

function drawFreeWheel() {
  const cx = wheelCanvas.width / 2, cy = wheelCanvas.height / 2, r = wheelCanvas.width / 2 - 4;
  const n = WHEEL_SEGMENTS.length;
  const sliceAngle = (Math.PI * 2) / n;
  wheelCtx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);
  WHEEL_SEGMENTS.forEach((seg, i) => {
    const start = i * sliceAngle, end = start + sliceAngle;
    wheelCtx.beginPath();
    wheelCtx.moveTo(cx, cy);
    wheelCtx.arc(cx, cy, r, start, end);
    wheelCtx.closePath();
    wheelCtx.fillStyle = seg.color;
    wheelCtx.globalAlpha = i % 2 === 0 ? 1 : 0.82;
    wheelCtx.fill();
    wheelCtx.globalAlpha = 1;
    wheelCtx.strokeStyle = "rgba(11,7,19,0.6)";
    wheelCtx.lineWidth = 2;
    wheelCtx.stroke();
    wheelCtx.save();
    wheelCtx.translate(cx, cy);
    wheelCtx.rotate(start + sliceAngle / 2);
    wheelCtx.textAlign = "right";
    wheelCtx.fillStyle = "#fff";
    wheelCtx.font = "bold 13px sans-serif";
    wheelCtx.shadowColor = "rgba(0,0,0,0.5)";
    wheelCtx.shadowBlur = 4;
    wheelCtx.fillText(seg.label, r - 14, 5);
    wheelCtx.restore();
  });
  wheelCtx.beginPath();
  wheelCtx.arc(cx, cy, 18, 0, Math.PI * 2);
  wheelCtx.fillStyle = "#0b0713";
  wheelCtx.fill();
  wheelCtx.strokeStyle = "#ffcb4d";
  wheelCtx.lineWidth = 2;
  wheelCtx.stroke();
}
drawFreeWheel();

let spinning = false;
const FREE_WHEEL_SPIN_MS = 4300;
function spinFreeWheel() {
  if (spinning) return;
  spinning = true;
  sound.click();
  haptic("light");

  const winnerIndex = weightedRandomIndex(WHEEL_SEGMENTS.map((s) => s.weight));
  const n = WHEEL_SEGMENTS.length;
  const sliceAngleDeg = 360 / n;
  const targetCenterDeg = winnerIndex * sliceAngleDeg + sliceAngleDeg / 2;
  const finalRotation = computeCCWFinalRotation(wheelRotation, targetCenterDeg, 6);

  $("#spin-btn").disabled = true;
  $("#spin-btn-text").textContent = tr("spinning");

  let lastTickAt = 0;
  animateWheelRotation(
    wheelCanvas, wheelRotation, finalRotation, FREE_WHEEL_SPIN_MS,
    (t) => {
      const now = performance.now();
      if (now - lastTickAt > 110) { sound.tick(); lastTickAt = now; }
    },
    () => {
      wheelRotation = finalRotation;
      const prize = WHEEL_SEGMENTS[winnerIndex];
      addCoins(prize.coins);
      sound.win();
      fireConfetti();
      haptic("heavy");
      showToast(`🎉 +${fmt(prize.coins)}`);
      spinning = false;

      // ---- ثبت اسپین چرخ شانس روزانه (یک‌بار در روز، بر پایه‌ی تاریخ UTC) ----
      const nowUTCDate = getTodayUTCDateStr();
      appState.lastFreeWheelSpinDateUTC = nowUTCDate;
      appState.freeWheelSpinCount += 1;
      appState.freeWheelHistory.push({
        dateUTC: nowUTCDate,
        timestamp: Date.now(),
        prizeCoins: prize.coins,
      });
      logWheelSpin(prize.coins, nowUTCDate);
      queueUserSync();
      console.log("🎡 چرخ شانس روزانه زده شد | تاریخ UTC:", nowUTCDate, "| جایزه:", prize.coins);

      updateWheelModalState();
    }
  );
}

// یک‌بار در روزِ UTC — از همون ستون last_free_wheel_spin_date که از قبل توی
// دیتابیس بود استفاده می‌کنه، بدون نیاز به هیچ ستون جدیدی.
function hasSpunFreeWheelToday() {
  return appState.lastFreeWheelSpinDateUTC === getTodayUTCDateStr();
}

function updateWheelModalState() {
  const btn = $("#spin-btn");
  const sub = $("#wheel-sub");
  if (hasSpunFreeWheelToday()) {
    btn.disabled = true;
    $("#spin-btn-text").textContent = tr("nextSpinIn");
    sub.textContent = "";
  } else {
    btn.disabled = false;
    $("#spin-btn-text").textContent = tr("spinWithAd");
  }
}
// هر دقیقه کافیه چک بشه (چون واحدِ کول‌داون الان روزه، نه ثانیه)
setInterval(() => { if (!$("#wheel-modal-backdrop").classList.contains("hidden")) updateWheelModalState(); }, 60000);

$("#spin-btn").addEventListener("click", () => {
  if (hasSpunFreeWheelToday()) return;
  // TODO (کاربر): این‌جا باید یه rewarded ad واقعی نشون داده بشه؛
  // فقط بعد از تکمیل واقعی تبلیغ spinFreeWheel() صدا زده بشه. الان مستقیم می‌چرخه (دمو).
  showToast("در حال نمایش تبلیغ... (دمو)");
  $("#spin-btn").disabled = true;
  setTimeout(spinFreeWheel, 900);
});

$("#wheel-float-btn").addEventListener("click", () => {
  $("#wheel-modal-backdrop").classList.remove("hidden");
  updateWheelModalState();
  sound.click();
  haptic("light");
});
$("#wheel-modal-close").addEventListener("click", () => $("#wheel-modal-backdrop").classList.add("hidden"));

// ---------------------------------------------------------------------------
// Coin packs (inside the wheel modal)
// ---------------------------------------------------------------------------
// متن «حداکثر سهم» زیر گردونه‌ی خانه رو با سقف فعلی (بر اساس سطح افکت باران‌سکه) هماهنگ می‌کنه
function updateStakeMaxHint() {
  const el = $("#stake-max-hint");
  if (!el) return;
  el.textContent = `${tr("stakeMaxLabel")} ${fmt(getCurrentPotMaxStake())} ${tr("coinsLabel")}`;
}

// کارت نازک لول بالای تب خانه — فقط عدد لول فعلی + نوار پیشرفت توی همون لول،
// بدون هیچ نمایش سقف/حداکثری. باید بعد از هر اتفاقی که XP می‌ده صدا زده بشه.
function renderHomeLevelCard() {
  const numEl = $("#home-level-num");
  const barEl = $("#home-level-bar-fill");
  if (!numEl || !barEl) return;
  const { level, xpInLevel, xpNeeded } = computeLevelFromXp(getTotalXp());
  numEl.textContent = level;
  const pct = xpNeeded > 0 ? Math.min(100, (xpInLevel / xpNeeded) * 100) : 100;
  barEl.style.width = pct + "%";
}

function renderPacks() {
  updateStakeMaxHint();
  const grid = $("#packs-grid");
  if (!grid) return;
  grid.innerHTML = "";
  COIN_PACKS.forEach((pack) => {
    const card = document.createElement("div");
    let unlocked = false, lockText = "";
    if (pack.unlockType === "time") {
      const unlockAt = appState.joinTimestamp + pack.unlockDays * 24 * 60 * 60 * 1000;
      const remaining = unlockAt - Date.now();
      unlocked = remaining <= 0;
      lockText = unlocked ? "✅" : `${pack.unlockDays}d`;
    } else if (pack.unlockType === "first_purchase") {
      unlocked = appState.hasFirstPurchase === true;
      lockText = unlocked ? "✅" : "🔒";
    }
    card.className = "pack-card" + (unlocked ? " unlocked" : "");
    card.innerHTML = `<div class="pack-coins">${fmt(pack.coins)}</div><div class="pack-lock">${lockText}</div>`;
    grid.appendChild(card);
  });
}

// ---------------------------------------------------------------------------
// POT GAME (اتاق سکه) — بازی گروهی منصفانه با بازیکن‌های ساختگی
// ---------------------------------------------------------------------------
const potCanvas = $("#pot-canvas");
const potCtx = potCanvas.getContext("2d");
let potRotation = 0;

let potState = {
  roomNumber: 0,
  players: [], // { id, name, stake, color, isYou }
  countdown: POT_COUNTDOWN_SEC,
  locked: false,
  spinning: false,
  timers: [], // setTimeout/interval ids to clear on reset
};

function randomRoomNumber() { return Math.floor(100 + Math.random() * 900); }

function pickFakePlayers() {
  const count = POT_MIN_PLAYERS + Math.floor(Math.random() * (POT_MAX_PLAYERS - POT_MIN_PLAYERS + 1));
  const pool = [...FAKE_PLAYER_NAMES].sort(() => Math.random() - 0.5).slice(0, count);
  const baseStakes = [10, 10, 20, 30, 40, 50, 60];
  const scale = getPotMaxStakeScaleRatio(); // هرچی سقف کاربر (باران‌سکه) بالاتر بره، سهم بازیکنای فیک هم متناسب بیشتر می‌شه
  const startingStakes = baseStakes.map((s) => Math.round(s * scale));
  const colors = getActivePotColors();
  return pool.map((name, i) => ({
    id: "fake_" + i,
    name,
    stake: startingStakes[i % startingStakes.length],
    color: colors[i % colors.length],
    isYou: false,
  }));
}

function clearPotTimers() {
  potState.timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
  potState.timers = [];
}

function startNewRound() {
  clearPotTimers();
  potState.roomNumber = randomRoomNumber();
  potState.players = pickFakePlayers();
  potState.countdown = POT_COUNTDOWN_SEC;
  potState.locked = false;
  potState.spinning = false;
  potState.youConfirmed = false;
  potRotation = potRotation % 360; // keep visual continuity, no jump

  $("#room-badge").textContent = `${tr("room")} #${potState.roomNumber}`;
  $("#pot-status-text").removeAttribute("data-i18n");
  $("#pot-status-text").textContent = tr("collectingStakes");
  $("#stake-row").style.display = "flex";
  $("#stake-input").disabled = false;
  $("#stake-input").value = 20;
  $("#stake-confirm-btn").disabled = false;
  $("#stake-confirm-btn").classList.remove("increment-mode");
  $("#stake-confirm-btn").textContent = tr("confirm");

  renderPlayers();
  updatePotTotal();
  drawPotWheel();
  updateTimerBar();

  // شمارش معکوس ۱۰ ثانیه
  const countdownTimer = setInterval(() => {
    potState.countdown--;
    updateTimerBar();
    if (potState.countdown <= 0) {
      clearInterval(countdownTimer);
      lockRoundAndSpin();
    }
  }, 1000);
  potState.timers.push(countdownTimer);

  // ۲ تا ۴ بار، یکی از بازیکن‌های ساختگی سهمشو (فقط افزایشی) توی این ۱۰ ثانیه بالا می‌بره
  const bumpCount = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < bumpCount; i++) {
    const delay = 800 + Math.random() * (POT_COUNTDOWN_SEC * 1000 - 1500);
    const t = setTimeout(() => {
      if (potState.locked || potState.players.length === 0) return;
      const fakePlayers = potState.players.filter((p) => !p.isYou);
      if (fakePlayers.length === 0) return;
      const target = fakePlayers[Math.floor(Math.random() * fakePlayers.length)];
      const bump = [230, 330, 440,1000,980][Math.floor(Math.random() * 4)];
      target.stake += bump;
      sound.bump();
      renderPlayers(target.id);
      updatePotTotal();
      drawPotWheel();
    }, delay);
    potState.timers.push(t);
  }
}

function updateTimerBar() {
  const pct = Math.max(0, (potState.countdown / POT_COUNTDOWN_SEC) * 100);
  $("#pot-timer-fill").style.width = pct + "%";
}

function updatePotTotal() {
  const total = potState.players.reduce((s, p) => s + p.stake, 0);
  $("#pot-total").textContent = fmt(total);
  return total;
}

function renderPlayers(bumpedId = null) {
  const list = $("#players-list");
  list.innerHTML = "";
  potState.players.forEach((p) => {
    const row = document.createElement("div");
    row.className = "player-row" + (p.isYou ? " is-you" : "");
    const displayName = p.isYou ? (userInfo.first_name || "You") : p.name;
    row.innerHTML = `
      <div class="player-left">
        <span class="player-dot" style="background:${p.color}"></span>
        <span>${displayName}</span>
      </div>
      <span class="player-stake${p.id === bumpedId ? " bumped" : ""}">${fmt(p.stake)}</span>
    `;
    list.appendChild(row);
  });
}

// دایره‌ی متناسب با سهم هرکس — بدون هیچ دستکاری، فقط رسم بصری بر اساس داده‌ی واقعی
function drawPotWheel() {
  const cx = potCanvas.width / 2, cy = potCanvas.height / 2, r = potCanvas.width / 2 - 4;
  const total = potState.players.reduce((s, p) => s + p.stake, 0) || 1;
  potCtx.clearRect(0, 0, potCanvas.width, potCanvas.height);
  let angle = 0;
  potState.players.forEach((p) => {
    const slice = (p.stake / total) * Math.PI * 2;
    potCtx.beginPath();
    potCtx.moveTo(cx, cy);
    potCtx.arc(cx, cy, r, angle, angle + slice);
    potCtx.closePath();
    potCtx.fillStyle = p.color;
    potCtx.fill();
    potCtx.strokeStyle = p.isYou ? "#ffcb4d" : "rgba(11,7,19,0.6)";
    potCtx.lineWidth = p.isYou ? 4 : 2;
    potCtx.stroke();

    // برچسب اسم روی هر برش (برای برش خودِ کاربر، "You" با فونت پررنگ‌تر)
    const mid = angle + slice / 2;
    potCtx.save();
    potCtx.translate(cx, cy);
    potCtx.rotate(mid);
    potCtx.textAlign = "right";
    potCtx.fillStyle = "#fff";
    potCtx.shadowColor = "rgba(0,0,0,0.6)";
    potCtx.shadowBlur = 4;
    potCtx.font = p.isYou ? "bold 13px sans-serif" : "bold 10.5px sans-serif";
    const label = p.isYou ? "YOU" : (p.name.length > 8 ? p.name.slice(0, 7) + "…" : p.name);
    potCtx.fillText(label, r - 10, 4);
    potCtx.restore();

    angle += slice;
  });
  potCtx.beginPath();
  potCtx.arc(cx, cy, 16, 0, Math.PI * 2);
  potCtx.fillStyle = "#0b0713";
  potCtx.fill();
  potCtx.strokeStyle = "#ffcb4d";
  potCtx.lineWidth = 2;
  potCtx.stroke();
}

$("#stake-confirm-btn").addEventListener("click", () => {
  if (potState.locked) return;

  if (!potState.youConfirmed) {
    // ---- حالت اول: تایید سهم اولیه ----
    const val = Math.floor(Number($("#stake-input").value));
    if (!val || val < POT_MIN_STAKE) {
      sound.error();
      showToast(`${tr("yourStake")} >= ${POT_MIN_STAKE}`);
      return;
    }
    if (val > getCurrentPotMaxStake()) {
      sound.error();
      showToast(`${tr("maxStakeReached")} (${fmt(getCurrentPotMaxStake())})`);
      return;
    }
    if (val > appState.coins) {
      sound.error();
      showToast(tr("notEnoughCoinsForGame"));
      goToPage("tasks");
      return;
    }
    appState.coins -= val;
    $("#coin-balance").textContent = fmt(appState.coins);
    if ($("#stat-coins")) $("#stat-coins").textContent = fmt(appState.coins);

    potState.players.push({
      id: "you",
      name: userInfo.first_name || "You",
      stake: val,
      color: "#ffcb4d",
      isYou: true,
    });
    potState.youConfirmed = true;
    appState.gamesPlayed++;
    refreshLevelFromXp();
    renderHomeLevelCard();
    renderLevelWheelCard();
    $("#stake-input").disabled = true;
    $("#stake-confirm-btn").textContent = `+${POT_STAKE_INCREMENT}`;
    $("#stake-confirm-btn").classList.add("increment-mode");
    sound.click();
    haptic("medium");
    renderPlayers("you");
    updatePotTotal();
    drawPotWheel();
    return;
  }

  // ---- حالت دوم: تا قبل از شروع دور (پایان ۱۰ ثانیه)، هی می‌تونه اضافه کنه ----
  const you = potState.players.find((p) => p.isYou);
  if (!you) return;
  if (you.stake + POT_STAKE_INCREMENT > getCurrentPotMaxStake()) {
    sound.error();
    showToast(`${tr("maxStakeReached")} (${fmt(getCurrentPotMaxStake())})`);
    return;
  }
  if (POT_STAKE_INCREMENT > appState.coins) {
    sound.error();
    showToast(tr("notEnoughCoinsForGame"));
    goToPage("tasks");
    return;
  }
  appState.coins -= POT_STAKE_INCREMENT;
  you.stake += POT_STAKE_INCREMENT;
  $("#coin-balance").textContent = fmt(appState.coins);
  $("#stake-input").value = you.stake;
  if (you.stake >= getCurrentPotMaxStake()) $("#stake-confirm-btn").disabled = true;
  sound.coin();
  haptic("light");
  renderPlayers("you");
  updatePotTotal();
  drawPotWheel();
});

function lockRoundAndSpin() {
  potState.locked = true;
  $("#stake-input").disabled = true;
  $("#stake-confirm-btn").disabled = true;
  $("#pot-status-text").textContent = tr("roundLocked");
  updateTimerBar();

  if (potState.players.length < 2) {
    // fallback (نباید پیش بیاد چون همیشه بازیکن ساختگی داریم) — دور رو دوباره شروع کن
    const t = setTimeout(startNewRound, 1500);
    potState.timers.push(t);
    return;
  }

  spinPotWheel();
}

function spinPotWheel() {
  potState.spinning = true;
  sound.click();
  haptic("light");
  $("#pot-status-text").textContent = tr("spinning");

  const total = potState.players.reduce((s, p) => s + p.stake, 0);
  // برنده همین‌جا و فقط یک‌بار با رندوم وزن‌دار واقعی مشخص می‌شه؛ انیمیشن فقط
  // همین نتیجه‌ی از‌قبل‌مشخص‌شده رو دراماتیک نشون می‌ده، چیزی دستکاری نمی‌کنه.
  const winnerIndex = weightedRandomIndex(potState.players.map((p) => p.stake));
  const winner = potState.players[winnerIndex];

  let cumulative = 0;
  for (let i = 0; i < winnerIndex; i++) cumulative += potState.players[i].stake;
  const winnerSliceStartDeg = (cumulative / total) * 360;
  const winnerSliceSizeDeg = (winner.stake / total) * 360;
  const winnerCenterDeg = winnerSliceStartDeg + winnerSliceSizeDeg / 2;

  const finalRotation = computeCCWFinalRotation(potRotation, winnerCenterDeg, 9);

  let lastTickAt = 0;
  animateWheelRotation(
    potCanvas, potRotation, finalRotation, POT_SPIN_DURATION_MS,
    (t) => {
      const now = performance.now();
      // هرچی جلوتر می‌ریم، تیک‌ها کندتر می‌شن (چون خود گردونه هم داره کند می‌شه)
      const gap = 90 + t * 260;
      if (now - lastTickAt > gap) { sound.tick(); lastTickAt = now; }
    },
    () => {
      potRotation = finalRotation;
      if (winner.isYou) {
        const rain = applyCoinRainIfLucky(total);
        addCoins(rain.amount);
        appState.gamesWon = (appState.gamesWon || 0) + 1;
        refreshLevelFromXp();
        renderHomeLevelCard();
        renderLevelWheelCard();
        sound.win();
        playOwnedWinEffects();
        haptic("heavy");
        if (rain.hit) {
          showToast(`🌧️ ${tr("coinRainWin")} ×${rain.multiplier}! +${fmt(rain.amount)}`);
        } else {
          showToast(tr("youWon"));
        }
        $("#pot-status-text").textContent = tr("youWon");
      } else {
        sound.lose();
        haptic("medium");
        const msg = `${winner.name} ${tr("someoneWon")}`;
        showToast(msg);
        $("#pot-status-text").textContent = potState.players.some((p) => p.isYou) ? tr("youLost") : msg;
      }
      const nextRoundTimer = setTimeout(startNewRound, 3200);
      potState.timers.push(nextRoundTimer);
    }
  );
}

// ---------------------------------------------------------------------------
// Daily reward strip + claim / x2 / more
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// چرخه‌ی ۷روزه‌ی پاداش روزانه
// appState.dailyStreak = تعداد کل روزهایی که پشت‌سرهم (بدون وقفه) کلیم شده.
// روز داخل چرخه (۱ تا ۷) از روی همین محاسبه می‌شه، پس بعد از روز ۷ خودکار
// برمی‌گرده به روز ۱ (چون ۷ % ۷ + ۱ = ۱).
// ---------------------------------------------------------------------------
function getTodayUTCDateStr() {
  return new Date().toISOString().slice(0, 10);
}
function getYesterdayUTCDateStr() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
// روزِ داخل چرخه‌ی ۷تایی که «امروز» بهش مربوطه (چه هنوز کلیم نشده باشه چه شده)
function getTodayCycleDay() {
  return (appState.dailyStreak % 7) + 1;
}
function getTodayDailyReward() {
  return DAILY_REWARDS[getTodayCycleDay() - 1];
}

// باید همون اول boot صدا زده بشه (بعد از لود appState از دیتابیس): اگه از
// آخرین کلیم بیشتر از یک روز گذشته باشه، استریک می‌شکنه (dailyStreak=0، یعنی
// چرخه از روز ۱ دوباره شروع می‌شه). اگه امروز از قبل کلیم شده، دکمه‌ی claim
// غیرفعال می‌مونه؛ وگرنه فعاله.
function refreshDailyStreakFromDate() {
  const today = getTodayUTCDateStr();
  const yesterday = getYesterdayUTCDateStr();
  const last = appState.lastDailyClaimDate;
  if (last === today) {
    appState.dailyClaimedToday = true;
  } else {
    appState.dailyClaimedToday = false;
    if (last && last !== yesterday) {
      appState.dailyStreak = 0; // وقفه افتاده — چرخه از روز ۱ دوباره شروع می‌شه
    }
  }
}

function renderDaily() {
  const strip = $("#daily-strip");
  strip.innerHTML = "";
  const todayCycleDay = getTodayCycleDay();
  DAILY_REWARDS.forEach((reward, i) => {
    const dayNum = i + 1;
    const isToday = dayNum === todayCycleDay;
    const isDone = dayNum < todayCycleDay || (isToday && appState.dailyClaimedToday);
    const label = reward.type === "coins" ? fmt(reward.amount) : reward.type === "coinRainUpgrade" ? "🌧️" : "🎡";
    const el = document.createElement("div");
    el.className = "daily-day" + (isToday ? " today" : "") + (isDone ? " done" : "");
    el.innerHTML = `<div class="d-num">${dayNum}</div><div class="d-coin">${label}</div>`;
    strip.appendChild(el);
  });
  $("#daily-streak").textContent = `${appState.dailyStreak} 🔥`;
  renderDailyActions();
}

function renderDailyActions() {
  const actions = $("#daily-actions");
  const reward = getTodayDailyReward();
  if (!appState.dailyClaimedToday) {
    if (reward.type === "coins") {
      actions.innerHTML = `
        <button class="daily-btn claim" id="claim-btn">${tr("claim")} ${fmt(reward.amount)}</button>
        <button class="daily-btn x2" id="claim-x2-btn">x2 (${fmt(reward.amount * 2)})</button>
      `;
      $("#claim-btn").addEventListener("click", () => claimDaily(false));
      $("#claim-x2-btn").addEventListener("click", () => {
        // TODO (کاربر): این‌جا باید یه rewarded ad واقعی نشون داده بشه.
        showToast("در حال نمایش تبلیغ... (دمو)");
        setTimeout(() => claimDaily(true), 900);
      });
    } else {
      // روزهای ویژه (۱ و ۴) — بدون دکمه‌ی x2
      const icon = reward.type === "coinRainUpgrade" ? "🌧️" : "🎡";
      actions.innerHTML = `<button class="daily-btn claim" id="claim-btn">${tr("claim")} ${icon}</button>`;
      $("#claim-btn").addEventListener("click", () => claimDaily(false));
    }
  } else {
    actions.innerHTML = `<button class="daily-btn more" id="more-btn">${tr("more")}</button>`;
    $("#more-btn").addEventListener("click", openDailyModal);
  }
}

function claimDaily(doubled) {
  const reward = getTodayDailyReward();
  appState.dailyClaimedToday = true;
  appState.lastDailyClaimDate = getTodayUTCDateStr();
  appState.dailyStreak += 1;

  if (reward.type === "coins") {
    const finalAmount = doubled ? reward.amount * 2 : reward.amount;
    addCoins(finalAmount);
    showToast(doubled ? `+${fmt(finalAmount)} 🎉` : `+${fmt(finalAmount)}`);
  } else if (reward.type === "coinRainUpgrade") {
    if (appState.wheelEffects.coinRain.tier >= 4) {
      addCoins(DAILY_DAY1_FALLBACK_COINS);
      showToast(`+${fmt(DAILY_DAY1_FALLBACK_COINS)} (Coin Rain 🌧️ از قبل به سقف رسیده)`);
    } else {
      appState.wheelEffects.coinRain.tier += 1;
      showToast(`🌧️ Coin Rain +۱ پله ارتقاء`);
      renderWheelSkinsGrid();
      showDailyBonusPointer("coinRain");
    }
  } else if (reward.type === "wheelColorUpgrade") {
    const maxStep = LEVEL_WHEEL_TOTAL_STEPS;
    if (appState.wheelLevelSkin.step >= maxStep) {
      addCoins(DAILY_DAY4_FALLBACK_COINS);
      showToast(`+${fmt(DAILY_DAY4_FALLBACK_COINS)} (مسیر رنگ گردونه از قبل به سقف رسیده)`);
    } else {
      const grant = Math.min(reward.steps, maxStep - appState.wheelLevelSkin.step);
      appState.wheelLevelSkin.step += grant;
      showToast(`🎡 مسیر رنگ گردونه +${grant} پله ارتقاء`);
      renderLevelWheelCard();
      showDailyBonusPointer("levelWheel");
    }
  }

  renderDaily();
  queueUserSync();
}

// بعد از روزهای ویژه (کوین‌ریین/مسیر رنگ)، یه ردیف کوچیک کلیک‌پذیر زیر دکمه‌ی
// claim نشون می‌ده: «برای اطلاعات بیشتر کلیک کنید» → به فروشگاه می‌بره و دور
// کارت مربوطه یه شادوی زرد چشمک‌زن می‌ندازه که بعد از چند کلیک محو می‌شه.
function showDailyBonusPointer(target) {
  const actions = $("#daily-actions");
  const pointer = document.createElement("div");
  pointer.className = "daily-bonus-pointer";
  const icon = target === "coinRain" ? "🌧️" : "🎡";
  pointer.innerHTML = `<span>${icon}</span><span class="daily-bonus-pointer-text">برای اطلاعات بیشتر کلیک کنید</span>`;
  pointer.addEventListener("click", () => {
    goToPage("shop");
    if (target === "coinRain") {
      $$("#shop-tabs .task-tab").forEach((t) => t.classList.remove("active"));
      $('#shop-tabs .task-tab[data-cat="wheel_skins"]').classList.add("active");
      $$("#page-shop .task-panel").forEach((p) => p.classList.remove("active"));
      $("#shop-panel-wheel_skins").classList.add("active");
      glowHighlightElement(() => $(`.wheel-skin-card[data-skin-id="coinRain"]`));
    } else {
      glowHighlightElement(() => $(".level-wheel-card"));
    }
  });
  actions.appendChild(pointer);
}

// دور یه المنت یه شادوی زرد پالسی می‌ندازه؛ بعد از `clicksToFade` بار کلیک روی
// صفحه (نه همون کلیکی که ناوبری رو راه انداخت)، یواش محو می‌شه.
function glowHighlightElement(getEl, clicksToFade = 4) {
  const el = getEl();
  if (!el) return;
  el.classList.add("glow-pulse-yellow");
  let remaining = clicksToFade;
  function onDocClick() {
    remaining -= 1;
    if (remaining <= 0) {
      document.removeEventListener("click", onDocClick);
      el.classList.add("glow-fade-out");
      setTimeout(() => el.classList.remove("glow-pulse-yellow", "glow-fade-out"), 900);
    }
  }
  setTimeout(() => document.addEventListener("click", onDocClick), 0);
}

function openDailyModal() {
  const grid = $("#daily-modal-grid");
  grid.innerHTML = "";
  const todayCycleDay = getTodayCycleDay();
  DAILY_REWARDS.forEach((reward, i) => {
    const dayNum = i + 1;
    const passed = dayNum < todayCycleDay || (dayNum === todayCycleDay && appState.dailyClaimedToday);
    const label = reward.type === "coins" ? fmt(reward.amount) : reward.type === "coinRainUpgrade" ? "🌧️" : "🎡";
    const cell = document.createElement("div");
    cell.className = "pack-card" + (passed ? " unlocked" : "");
    cell.innerHTML = `<div class="pack-coins">${label}</div><div class="pack-lock">${dayNum}</div>`;
    grid.appendChild(cell);
  });
  $("#daily-modal-backdrop").classList.remove("hidden");
}
$("#daily-modal-close").addEventListener("click", () => $("#daily-modal-backdrop").classList.add("hidden"));

// ---------------------------------------------------------------------------
// Task tabs
// ---------------------------------------------------------------------------
$$("#task-tabs .task-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    $$("#task-tabs .task-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    $$(".task-panel").forEach((p) => p.classList.remove("active"));
    $(`#task-panel-${tab.dataset.tab}`).classList.add("active");
    sound.click();
  });
});

// نگه‌داشتن تابع نمایش تبلیغ واقعی OnClicka بعد از init شدن SDK
let onclickaShowAd = null;
function initOnclickaSdk() {
  if (!window.initCdTma) {
    // اسکریپت هنوز لود نشده، یکم بعد دوباره امتحان کن
    setTimeout(initOnclickaSdk, 500);
    return;
  }
  window.initCdTma({ id: ONCLICKA_CONFIG.spotId })
    .then((show) => { onclickaShowAd = show; })
    .catch((err) => console.log("OnClicka init failed:", err));
}

// نگه‌داشتن AdController واقعی Adsgram بعد از init شدن SDK
let adsgramController = null;
function initAdsgramSdk() {
  if (!window.Adsgram) {
    setTimeout(initAdsgramSdk, 500);
    return;
  }
  adsgramController = window.Adsgram.init({ blockId: ADSGRAM_CONFIG.blockId });
}

function renderAdTasks() {
  const list = $("#ad-tasks-list");
  list.innerHTML = "";
  AD_NETWORKS.forEach((net) => {
    const card = document.createElement("div");
    card.className = "task-card";
    card.id = `ad-task-${net.id}`;
    card.innerHTML = `
      <div class="task-left">
        <div class="task-icon">${net.name.slice(0, 2)}</div>
        <div><div class="task-name">${net.name}</div><div class="task-sub">+${getAdRewardDisplay(net.reward)}</div></div>
      </div>
      <button class="task-btn" data-net="${net.id}">${tr("watchAd")}</button>
    `;
    list.appendChild(card);
  });
  list.querySelectorAll(".task-btn").forEach((btn) => btn.addEventListener("click", () => watchAdTask(btn.dataset.net)));
}

function watchAdTask(networkId) {
  const net = AD_NETWORKS.find((n) => n.id === networkId);
  const card = $(`#ad-task-${networkId}`);
  const btn = card.querySelector(".task-btn");
  btn.disabled = true;
  btn.textContent = "...";
  sound.click();

  function onAdSuccess() {
    const reward = getAdRewardWithBoost(net.reward);
    addCoins(reward);
    appState.adsWatched = (appState.adsWatched || 0) + 1;
    refreshLevelFromXp();
    renderHomeLevelCard();
    renderLevelWheelCard();
    showToast(`+${reward} — ${net.name}`);
    logAdTransaction(net.id, null, reward);
    queueUserSync();
    card.classList.add("fading");
    setTimeout(() => {
      card.classList.remove("fading");
      btn.disabled = true;
      btn.classList.add("cooldown");
      let remaining = net.cooldownSec;
      btn.textContent = `${remaining}s`;
      const cd = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(cd);
          btn.disabled = false;
          btn.classList.remove("cooldown");
          btn.textContent = tr("watchAd");
        } else {
          btn.textContent = `${remaining}s`;
        }
      }, 1000);
    }, 380);
  }

  function onAdFailure(err) {
    console.log("Ad failed/skipped:", err);
    btn.disabled = false;
    btn.textContent = tr("watchAd");
  }

  if (networkId === "onclicka") {
    // شبکه‌ی واقعی — تبلیغ واقعی نشون داده میشه، فقط با تأیید واقعی Promise سکه میدیم
    if (!onclickaShowAd) {
      showToast("⏳ در حال آماده‌سازی تبلیغ، یک لحظه صبر کن...");
      btn.disabled = false;
      btn.textContent = tr("watchAd");
      initOnclickaSdk();
      return;
    }
    onclickaShowAd().then(onAdSuccess).catch(onAdFailure);
    return;
  }

  if (networkId === "adsgram") {
    if (!adsgramController) {
      showToast("⏳ در حال آماده‌سازی تبلیغ، یک لحظه صبر کن...");
      btn.disabled = false;
      btn.textContent = tr("watchAd");
      initAdsgramSdk();
      return;
    }
    adsgramController.show().then(onAdSuccess).catch(onAdFailure);
    return;
  }

  // بقیه‌ی شبکه‌ها فعلاً همه‌شون به SDK واقعی وصل شدن؛ این خط دیگه به هیچ شبکه‌ای نمی‌رسه.
  setTimeout(onAdSuccess, 1100);
}

// ---------------------------------------------------------------------------
// TADS.me — به‌جای این‌که کاربر دکمه رو بزنه و بعد ببینه تبلیغی نیست، هر ۳۰ ثانیه
// خودمون بی‌سروصدا پس‌زمینه چک می‌کنیم؛ فقط وقتی واقعاً تبلیغی موجود باشه، کارتش
// ظاهر میشه. هیچ توست/پیام «تبلیغی نیست» به کاربر نشون داده نمیشه.
// ---------------------------------------------------------------------------
let tadsAdController = null;

function setTadsTaskVisible(visible) {
  const card = $("#tads-task-card");
  if (!card) return;
  card.classList.toggle("hidden-task", !visible);
  if (!visible) {
    // برای دفعه‌ی بعد که تبلیغ پیدا شد، دکمه/کانتینر به حالت اول برگرده
    const slot = card.querySelector(".tads-ad-slot");
    const btn = $("#tads-task-btn");
    if (slot) slot.style.display = "none";
    if (btn) { btn.style.display = ""; btn.disabled = false; btn.textContent = tr("watchAd"); }
  }
}

function checkTadsAvailability() {
  if (!window.tads || !window.tads.init) return; // اسکریپت هنوز لود نشده، دور بعدی امتحان میشه
  const adController = window.tads.init({
    widgetId: TADS_CONFIG.widgetId,
    type: "static",
    debug: false,
    onClickReward: () => {
      const reward = getAdRewardWithBoost(TADS_CONFIG.reward);
      addCoins(reward);
      appState.adsWatched = (appState.adsWatched || 0) + 1;
      refreshLevelFromXp();
      renderHomeLevelCard();
      renderLevelWheelCard();
      showToast(`+${reward} — Tads.me`);
      logAdTransaction("tads", null, reward);
      // فقط همین تسک («تبلیغ ویژه» / Special offer) روی پیشرفت رفرال تاثیر داره
      incrementReferralTaskProgress();
      queueUserSync();
      setTadsTaskVisible(false);
    },
    onAdsNotFound: () => setTadsTaskVisible(false),
  });
  tadsAdController = adController;
  adController.loadAd().then(() => {
    $("#tads-task-reward").textContent = `+${getAdRewardDisplay(TADS_CONFIG.reward)}`;
    setTadsTaskVisible(true);
  }).catch(() => setTadsTaskVisible(false));
}

$("#tads-task-btn").addEventListener("click", () => {
  if (!tadsAdController) return;
  sound.click();
  tadsAdController.showAd();
  const card = $("#tads-task-card");
  card.querySelector(".tads-ad-slot").style.display = "block";
  $("#tads-task-btn").style.display = "none";
});

// ---------------------------------------------------------------------------
// CPX Research — تسک‌های واقعی (سوروی/آفر)، زیر همون لیست تسک‌های تبلیغاتی.
// اگه فعلاً هیچ آفری برای کاربر موجود نباشه، این بخش کاملاً خالی می‌مونه.
// TODO (کاربر): اعتبارسنجی/واریز قطعی سکه از طریق Postback سمت سرور (وقتی Supabase
// راه افتاد) انجام میشه — الان با باز کردن لینک فقط کاربر رو به سوروی می‌فرسته و
// عدد سکه‌ی نشون داده‌شده صرفاً یه تخمینه، نه واریز خودکار.
// ---------------------------------------------------------------------------
function setTasksNavDotVisible(visible) {
  const dot = $("#tasks-nav-dot");
  if (dot) dot.classList.toggle("show", visible);
}

function renderCpxTasks(surveys) {
  const list = $("#cpx-tasks-list");
  list.innerHTML = "";
  if (!surveys || !surveys.length) {
    setTasksNavDotVisible(false);
    return; // چیزی نیست => هیچی نشون نده
  }
  setTasksNavDotVisible(true);
  const s = surveys[0]; // فقط یه تسک در هر لحظه نشون بده
  const coins = getCpxTaskReward();
  const card = document.createElement("div");
  card.className = "task-card";
  card.id = "cpx-task-card";
  card.innerHTML = `
    <div class="task-left">
      <div class="task-icon cpx-task-icon-wrap">CPX<span class="cpx-task-dot"></span></div>
      <div>
        <div class="task-name">${tr("cpxSurveyName")}</div>
        <div class="task-sub"><span class="cpx-reward-badge">✨ +${coins}</span> · ${s.loi} ${tr("cpxMinutes")}</div>
      </div>
    </div>
    <button class="task-btn" data-href="${s.href || s.href_new || ""}">${tr("cpxDoTask")}</button>
  `;
  const btn = card.querySelector(".task-btn");
  btn.addEventListener("click", () => {
    const url = btn.dataset.href;
    if (!url || btn.disabled) return;
    sound.click();
    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg && tg.openLink) tg.openLink(url);
    else window.open(url, "_blank");

    btn.disabled = true;
    btn.textContent = "...";
    setTimeout(() => {
      addCoins(coins);
      appState.adsWatched = (appState.adsWatched || 0) + 1;
      refreshLevelFromXp();
      renderHomeLevelCard();
      renderLevelWheelCard();
      showToast(`+${coins} — CPX`);
      logAdTransaction("cpx", s.id, coins);
      queueUserSync();
      card.classList.add("fading");
      setTasksNavDotVisible(false);
      setTimeout(() => {
        card.classList.remove("fading");
        btn.disabled = true;
        btn.classList.add("cooldown");
        let remaining = CPX_CONFIG.cooldownSec;
        btn.textContent = `${remaining}s`;
        const cd = setInterval(() => {
          remaining--;
          if (remaining <= 0) {
            clearInterval(cd);
            btn.disabled = false;
            btn.classList.remove("cooldown");
            btn.textContent = tr("cpxDoTask");
          } else {
            btn.textContent = `${remaining}s`;
          }
        }, 1000);
      }, 380);
    }, 900);
  });
  list.appendChild(card);
}

let cachedUserIp = null;
async function getUserIpCached() {
  if (cachedUserIp) return cachedUserIp;
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const d = await r.json();
    cachedUserIp = d.ip || null;
  } catch (err) {
    console.log("IP lookup failed:", err);
  }
  return cachedUserIp;
}

async function fetchAndRenderCpxTasks() {
  try {
    const ip = await getUserIpCached();
    const res = await fetch(buildCpxSurveysUrl(ip));
    const data = await res.json();
    if (data && data.status === "success") {
      renderCpxTasks(data.surveys || []);
    } else {
      renderCpxTasks([]);
    }
  } catch (err) {
    // شبکه/CORS در دسترس نبود — بخش رو خالی نگه دار، بقیه‌ی اپ کار خودشو بکنه
    console.log("CPX fetch failed:", err);
    renderCpxTasks([]);
  }
}

function renderLimitedTasks() {
  const list = $("#limited-tasks-list");
  list.innerHTML = "";
  LIMITED_TASKS.forEach((task) => {
    const card = document.createElement("div");
    card.className = "task-card";
    card.innerHTML = `
      <div class="task-left">
        <div class="task-icon">★</div>
        <div><div class="task-name">${trField(task.name)}</div><div class="task-sub">+${task.reward}</div></div>
      </div>
      <button class="task-btn" ${task.done ? "disabled" : ""}>${task.done ? "✓" : tr("getIt")}</button>
    `;
    if (!task.done) {
      card.querySelector("button").addEventListener("click", () => {
        task.done = true;
        addCoins(task.reward);
        showToast(`+${task.reward}`);
        renderLimitedTasks();
      });
    }
    list.appendChild(card);
  });
}

function renderNormalTasks() {
  const list = $("#normal-tasks-list");
  list.innerHTML = "";
  NORMAL_TASKS.forEach((task) => {
    const complete = task.progress >= task.total;
    const card = document.createElement("div");
    card.className = "task-card";
    card.innerHTML = `
      <div class="task-left">
        <div class="task-icon">${task.progress}/${task.total}</div>
        <div><div class="task-name">${trField(task.name)}</div><div class="task-sub">+${task.reward}</div></div>
      </div>
      <button class="task-btn" ${complete ? "" : "disabled"}>${complete ? tr("claim") : "…"}</button>
    `;
    if (complete) {
      card.querySelector("button").addEventListener("click", () => {
        addCoins(task.reward);
        showToast(`+${task.reward}`);
        NORMAL_TASKS.splice(NORMAL_TASKS.indexOf(task), 1);
        renderNormalTasks();
      });
    }
    list.appendChild(card);
  });
}

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------
function renderWheelSkinsGrid() {
  const grid = $("#wheel-skins-grid");
  if (!grid) return;
  grid.innerHTML = "";
  const claimableReferrals = appState.referralBalance || 0;

  EFFECT_SKINS.forEach((skin) => {
    const progress = appState.wheelEffects[skin.id];
    const owned = progress.tier > 0;
    const maxed = progress.tier >= 4;
    const tierNames = EFFECT_SKIN_TIER_NAMES[appState.lang] || EFFECT_SKIN_TIER_NAMES.fa;
    const price = maxed ? null : getEffectSkinNextPrice(skin.id);
    const nextTier = progress.tier + 1;
    const needsReferrals = skin.requiresReferralsForTier4 && nextTier === 4 && claimableReferrals < skin.requiresReferralsForTier4;
    const canAffordCoins = !maxed && appState.coins >= price;
    const affordable = canAffordCoins && !needsReferrals;

    let btnLabel;
    if (maxed) btnLabel = tr("maxedTierLabel");
    else if (needsReferrals) btnLabel = `🔒 ${tr("needsReferralsPrefix")} ${skin.requiresReferralsForTier4} ${tr("needsReferralsSuffix")}`;
    // سکه کافی نیست: به‌جای «سکه کافی نیست»، خودِ قیمت لازم رو (خاکستری) نشون بده
    else if (!canAffordCoins) btnLabel = `<span class="price-greyed">${fmt(price)}</span>`;
    else btnLabel = `${owned ? "⬆ " + tr("upgradeBtn") : tr("getIt")} · ${fmt(price)}`;

    const card = document.createElement("div");
    card.className = "item-card wheel-skin-card";
    card.dataset.skinId = skin.id;
    card.innerHTML = `
      <div class="wheel-skin-preview" style="background:radial-gradient(circle, ${skin.previewColor} 0%, #00000000 75%); box-shadow:0 0 16px 2px ${skin.previewColor}55;"></div>
      <div class="item-name">${skin.icon} ${trField(skin.name)}</div>
      <div class="wheel-skin-desc">${trField(skin.desc)}</div>
      <div class="wheel-skin-status">
        ${owned ? `<span class="wheel-skin-badge">${tr("tierLabel")} ${progress.tier}/4 · ${tierNames[progress.tier - 1]}${maxed ? " · " + tr("effectActive") : ""}</span>` : `<span class="wheel-skin-badge not-owned">${tr("notOwnedYet")}</span>`}
      </div>
      <button class="item-btn upgrade-btn${affordable ? "" : " btn-need-more"}" ${maxed ? "disabled" : ""}>${btnLabel}</button>
    `;
    if (!maxed) {
      card.querySelector(".upgrade-btn").addEventListener("click", () => {
        if (needsReferrals) {
          const missing = skin.requiresReferralsForTier4 - claimableReferrals;
          showToast(`🔒 ${tr("needsReferralsPrefix")} ${missing} ${tr("needsReferralsSuffix")}`);
          setTimeout(() => { window.location.href = REFERRAL_SHORTFALL_REDIRECT_URL; }, 900);
          return;
        }
        if (!canAffordCoins) {
          showToast(tr("notEnoughCoinsForUpgrade"));
          goToPage("home");
          return;
        }
        buyOrUpgradeEffectSkin(skin.id);
      });
    }
    grid.appendChild(card);
  });
}

// ---------------------------------------------------------------------------
// Telegram Gifts (شاپ → تب «گیفت‌های تلگرام»)
// دکمه‌ی هر گیفت خودش به‌جای نوار پیشرفت، وضعیت فعلی رو نشون می‌ده:
// «۲/۲۰ رفرال + ۸/۱۰ لول» تا وقتی هر دو شرط پر بشه، بعد قابل‌کلیک می‌شه.
// ---------------------------------------------------------------------------
function renderGiftsGrid() {
  const grid = $("#gifts-grid");
  if (!grid) return;
  grid.innerHTML = "";

  TELEGRAM_GIFTS.forEach((gift) => {
    const status = appState.giftStatus[gift.id] || "none";
    const curLevel = appState.level;
    const curRef = appState.referralBalance || 0;
    const eligible = curLevel >= gift.requiredLevel && curRef >= gift.requiredReferrals;

    let btnLabel, disabled, extraClass = "";
    if (status === "pending") {
      btnLabel = `⏳ ${tr("pendingPayment")}`;
      disabled = true;
    } else if (status === "delivered") {
      btnLabel = `${tr("giftDelivered")}`;
      disabled = true;
    } else {
      // فرمت ثابت: {موجودی}/{لازم} رفرال + {لول فعلی}/{لول لازم} لول — همیشه همینو نشون می‌ده،
      // چه هنوز کامل نشده باشه چه کامل شده (که اون‌موقع قابل‌کلیکه).
      btnLabel = `${fmt(Math.min(curRef, gift.requiredReferrals))}/${fmt(gift.requiredReferrals)} ${tr("referralsLabel")} + ${fmt(Math.min(curLevel, gift.requiredLevel))}/${fmt(gift.requiredLevel)} ${tr("levelCardLabel")}`;
      disabled = !eligible;
      extraClass = eligible ? "" : " btn-need-more";
    }

    const card = document.createElement("div");
    card.className = "item-card gift-card";
    card.innerHTML = `
      <div class="gift-icon">${gift.icon}</div>
      <div class="item-name">${trField(gift.name)}</div>
      <div class="gift-req">🔒 ${fmt(gift.requiredReferrals)} ${tr("referralsLabel")} + ${tr("levelCardLabel")} ${fmt(gift.requiredLevel)}</div>
      <button class="item-btn${extraClass}" ${disabled ? "disabled" : ""}>${btnLabel}</button>
    `;
    if (status === "none" && eligible) {
      card.querySelector("button").addEventListener("click", () => {
        appState.referralBalance -= gift.requiredReferrals;
        appState.giftStatus[gift.id] = "pending";
        createGiftOrder(gift.id);
        queueUserSync();
        showToast(`🎁 ${trField(gift.name)} — ${tr("pendingPayment")}`);
        haptic("medium");
        sound.coin();
        renderGiftsGrid();
      });
    }
    grid.appendChild(card);
  });
}

// سوئیچ تب فروشگاه: افکت‌های گردونه ⇄ گیفت‌های تلگرام
$$("#shop-tabs .task-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    $$("#shop-tabs .task-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    $$("#page-shop .task-panel").forEach((p) => p.classList.remove("active"));
    $(`#shop-panel-${tab.dataset.cat}`).classList.add("active");
    if (tab.dataset.cat === "gifts") renderGiftsGrid();
    sound.click();
  });
});

function buyOrUpgradeEffectSkin(skinId) {
  const price = getEffectSkinNextPrice(skinId);
  if (appState.coins < price) { showToast(tr("notEnoughCoinsForUpgrade")); return; }
  appState.coins -= price;
  appState.hasFirstPurchase = true;
  appState.wheelEffects[skinId].tier += 1;
  queueUserSync();

  $("#coin-balance").textContent = fmt(appState.coins);
  if ($("#stat-coins")) $("#stat-coins").textContent = fmt(appState.coins);
  sound.coin();
  haptic("medium");
  showToast(`✅ ${tr("effectActive")}`);
  renderWheelSkinsGrid(); renderLevelWheelCard();
  renderPacks();
  renderAdTasks();
}

// ---------------------------------------------------------------------------
// مسیر رنگ گردونه بر اساس Level (روز → شب → کهکشان)
// ---------------------------------------------------------------------------
function getActivePotColors() {
  return getLevelWheelColors(appState.wheelLevelSkin.step);
}

function renderLevelWheelCard() {
  const step = appState.wheelLevelSkin.step;
  const level = Math.min(LEVEL_WHEEL_MAX_LEVEL, Math.floor(step / LEVEL_WHEEL_SUB_PER_LEVEL) + 1);
  const sub = step >= LEVEL_WHEEL_TOTAL_STEPS ? LEVEL_WHEEL_SUB_PER_LEVEL - 1 : step % LEVEL_WHEEL_SUB_PER_LEVEL;
  const colors = getLevelWheelColors(step);
  const levelFloat = 1 + (step / LEVEL_WHEEL_TOTAL_STEPS) * (LEVEL_WHEEL_MAX_LEVEL - 1);
  const isMaxed = level >= LEVEL_WHEEL_MAX_LEVEL && sub === LEVEL_WHEEL_SUB_PER_LEVEL - 1;

  // ---- گردونه‌ی مینی داخل کارت فروشگاه ----
  const wheelEl = $("#lw-wheel");
  wheelEl.style.background = `conic-gradient(${colors[0]} 0deg 120deg, ${colors[1]} 120deg 240deg, ${colors[2]} 240deg 360deg)`;
  wheelEl.style.boxShadow = `0 0 22px 3px ${colors[0]}55`;

  updateHaloAndStars($("#lw-halo"), $("#lw-stars"), levelFloat, isMaxed, 62, 70);
  updateHaloAndStars($("#home-lw-halo"), $("#home-lw-stars"), levelFloat, isMaxed, 108, 120);

  $("#lw-progress-text").textContent = `${tr("levelStepLabel")} ${step} ${tr("levelStepOf")} ${LEVEL_WHEEL_TOTAL_STEPS} — ${tr("tierLabel")}/Lv ${level}`;
  $("#lw-bar-fill").style.width = `${(step / LEVEL_WHEEL_TOTAL_STEPS) * 100}%`;

  const btn = $("#lw-upgrade-btn");
  if (step >= LEVEL_WHEEL_TOTAL_STEPS) {
    btn.textContent = tr("levelMaxed");
    btn.disabled = true;
  } else {
    const maxPurchasable = getLevelWheelMaxPurchasableStep();
    if (step >= maxPurchasable) {
      const neededLevel = Math.floor(step / LEVEL_WHEEL_SUB_PER_LEVEL) + 1;
      btn.textContent = `🔒 ${tr("levelLockedPrefix")} ${neededLevel} ${tr("levelLockedSuffix")}`;
      btn.disabled = true;
    } else {
      const price = getLevelWheelNextPrice(step);
      const affordable = appState.coins >= price;
      btn.innerHTML = affordable ? `⬆ ${tr("upgradeBtn")} · ${fmt(price)}` : `<span class="price-greyed">${fmt(price)}</span>`;
      btn.disabled = false;
      btn.classList.toggle("btn-need-more", !affordable);
    }
  }
}

// لایه‌ی هاله + ستاره‌ی دور یه گردونه رو آپدیت می‌کنه (برای کارت فروشگاه و هم گردونه‌ی اصلی صفحه‌ی خانه استفاده می‌شه)
function updateHaloAndStars(haloEl, starsLayer, levelFloat, isMaxed, radius, center) {
  if (!haloEl || !starsLayer) return;

  const haloT = Math.max(0, Math.min(1, (levelFloat - 2) / 18));
  const haloColor = lerpHex("#ffffff", "#9b5cff", Math.min(1, levelFloat / 20));
  haloEl.style.opacity = (haloT * 0.8).toFixed(2);
  haloEl.style.background = `radial-gradient(circle, ${haloColor}88 0%, transparent 70%)`;

  const STAR_COUNT = 16;
  if (!starsLayer.dataset.built) {
    for (let i = 0; i < STAR_COUNT; i++) {
      const angle = (i / STAR_COUNT) * Math.PI * 2;
      const r = radius + (i % 3) * 3;
      const x = center + Math.cos(angle) * r;
      const y = center + Math.sin(angle) * r;
      const el = document.createElement("div");
      el.className = "lw-star";
      el.style.left = x + "px";
      el.style.top = y + "px";
      starsLayer.appendChild(el);
    }
    starsLayer.dataset.built = "1";
  }
  const starProgress = Math.max(0, Math.min(1, (levelFloat - 10) / 10));
  const visibleStars = Math.round(starProgress * STAR_COUNT);
  [...starsLayer.children].forEach((el, i) => el.classList.toggle("on", i < visibleStars));
  // همین که یه‌بار به حداکثر (سطح ۲۰ پله ۴) رسید، چرخش برای همیشه فعال می‌مونه
  if (isMaxed) starsLayer.classList.add("spin");
}

function buyLevelWheelUpgrade() {
  const step = appState.wheelLevelSkin.step;
  if (step >= LEVEL_WHEEL_TOTAL_STEPS) return;
  if (step >= getLevelWheelMaxPurchasableStep()) return;
  const price = getLevelWheelNextPrice(step);
  if (appState.coins < price) {
    showToast(tr("notEnoughCoinsForUpgrade"));
    goToPage("home");
    return;
  }
  // پیشرفت پله‌ی رنگ گردونه
  appState.coins -= price;
  appState.wheelLevelSkin.step += 1;
  queueUserSync();
  $("#coin-balance").textContent = fmt(appState.coins);
  if ($("#stat-coins")) $("#stat-coins").textContent = fmt(appState.coins);
  sound.coin();
  haptic("light");
  renderLevelWheelCard();
  renderPacks();
}
$("#lw-upgrade-btn").addEventListener("click", buyLevelWheelUpgrade);

// ---------------------------------------------------------------------------
// افکت‌های برد اتاق سکه: برف، لرزش، باران سکه
// ---------------------------------------------------------------------------
function fireSnow(count = 30) {
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    piece.className = "snow-piece";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.setProperty("--drift", (Math.random() * 60 - 30) + "px");
    piece.style.animationDuration = 2.2 + Math.random() * 1.8 + "s";
    piece.style.opacity = 0.5 + Math.random() * 0.4;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 4200);
  }
}

function triggerEarthquakeVibration() {
  // TODO (کاربر): ویبره‌ی واقعی گوشی روی خیلی از وب‌ویوهای تلگرام محدوده؛
  // اینجا هم از Vibration API مرورگر و هم چندبار haptic تلگرام استفاده می‌کنیم.
  try { if (navigator.vibrate) navigator.vibrate([80, 60, 80, 60, 80]); } catch (e) {}
  haptic("heavy");
  setTimeout(() => haptic("heavy"), 180);
  setTimeout(() => haptic("heavy"), 380);
}

// اگه اسکین باران‌سکه مالکیتشه، شانسی (~۱۰٪) چک می‌کنه و مبلغ ضربدر می‌شه
function applyCoinRainIfLucky(baseAmount) {
  const progress = appState.wheelEffects.coinRain;
  if (progress.tier < 1) return { amount: baseAmount, hit: false };
  if (Math.random() > COIN_RAIN_TRIGGER_CHANCE) return { amount: baseAmount, hit: false };
  const multiplier = COIN_RAIN_MULTIPLIERS[progress.tier - 1];
  return { amount: Math.round(baseAmount * multiplier), hit: true, multiplier };
}

// همه‌ی افکت‌های خریداری‌شده رو هم‌زمان و بدون تداخل با هم اجرا می‌کنه
function playOwnedWinEffects() {
  if (appState.wheelEffects.snow.tier > 0) fireSnow(30);
  else fireConfetti(40);
  if (appState.wheelEffects.earthquake.tier > 0) triggerEarthquakeVibration();
}

// ---------------------------------------------------------------------------
// Profile + referral
// ---------------------------------------------------------------------------
function renderProfile() {
  $("#profile-name").textContent = userInfo.first_name || "-";
  $("#avatar-letter").textContent = (userInfo.first_name || "?").charAt(0);
  $("#profile-rank").textContent = `${appState.rank} · Level ${appState.level}`;
  $("#stat-coins") && ($("#stat-coins").textContent = fmt(appState.coins));
  $("#stat-referrals").textContent = fmt(cachedReferrals.length);
  $("#stat-streak").textContent = appState.dailyStreak;
  $("#referral-link-text").textContent = `${REFERRAL_BOT_LINK_BASE}${userInfo.id}`;
  renderReferralList();
  renderMyAvatar();
}

// عکس پروفایل واقعی تلگرام (اگه موجود بود)، وگرنه همون حرف اول اسم
function renderMyAvatar() {
  const ring = $("#avatar-ring");
  const letterEl = $("#avatar-letter");
  // TODO (کاربر): userInfo.photo_url معمولاً توی initDataUnsafe نیست و باید از
  // getUserProfilePhotos سمت بک‌اند بگیری و اینجا ست کنی.
  if (userInfo.photo_url) {
    ring.style.backgroundImage = `url(${userInfo.photo_url})`;
    ring.style.backgroundSize = "cover";
    ring.style.backgroundPosition = "center";
    letterEl.style.display = "none";
  } else {
    letterEl.style.display = "block";
  }
}

function renderReferralList() {
  const list = $("#referral-list");
  if (!list) return;
  list.innerHTML = "";
  cachedReferrals.forEach((ref) => {
    const name = (ref.referred && (ref.referred.first_name || ref.referred.username)) || "—";
    const isActive = ref.status === "completed";
    const row = document.createElement("div");
    row.className = "referral-row";
    row.innerHTML = `
      <div>
        <div>${name}</div>
        <div class="referral-progress">${ref.tasks_completed || 0}/${REFERRAL_TASKS_REQUIRED}</div>
      </div>
      <span class="referral-status ${ref.status}">${isActive ? "✅" : "…"}</span>
    `;
    list.appendChild(row);
  });
}

$("#copy-referral-btn").addEventListener("click", () => {
  const text = $("#referral-link-text").textContent;
  navigator.clipboard?.writeText(text).catch(() => {});
  showToast(tr("copied"));
  sound.click();
  haptic("light");
});

// ---------------------------------------------------------------------------
// Leaderboard — امتیاز = رفرال × وزن‌رفرال + تعداد دست‌بازی × وزن‌بازی
// TODO (کاربر): وقتی جایزه‌ی واقعی وصل کردی، امتیازها رو سمت سرور محاسبه کن
// نه سمت کلاینت، تا قابل دستکاری نباشه؛ و پایان دوره (ریست هفتگی و اهدای
// جایزه به ۱۰ نفر برتر) هم باید سمت سرور انجام بشه.
// ---------------------------------------------------------------------------
function leaderboardScore(referrals, gamesPlayed) {
  return referrals * LEADERBOARD_REFERRAL_WEIGHT + gamesPlayed * LEADERBOARD_GAME_WEIGHT;
}

function renderLeaderboardPrizeCard() {
  const wrap = $("#lb-prize-items");
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="lb-prize-chip">
      <span class="lb-prize-icon">🪙</span>
      <span>${fmt(LEADERBOARD_TOP_PRIZE.coins)} ${tr("prizeCoinsLabel")}</span>
    </div>
    <div class="lb-prize-chip">
      <span class="lb-prize-icon lb-fire-swatch" style="background:${LEADERBOARD_TOP_PRIZE.fontColor.preview}"></span>
      <span>${tr("prizeFontLabel")}</span>
    </div>
  `;
}

function renderLeaderboard() {
  const entries = MOCK_USERS.map((u) => ({ name: u.name, referrals: u.referrals, gamesPlayed: u.gamesPlayed, isSelf: false }));
  entries.push({ name: userInfo.first_name || tr("yourRank"), referrals: cachedReferrals.length, gamesPlayed: appState.gamesPlayed, isSelf: true });
  entries.forEach((e) => (e.score = leaderboardScore(e.referrals, e.gamesPlayed)));
  entries.sort((a, b) => b.score - a.score);

  renderLeaderboardPrizeCard();

  // --- سکوی نفرات اول تا سوم ---
  const podiumWrap = $("#lb-podium");
  const top3 = entries.slice(0, 3);
  const podiumOrder = [top3[1], top3[0], top3[2]]; // نمایش: دوم، اول (وسط/بلندتر)، سوم
  const medal = ["🥈", "🥇", "🥉"];
  podiumWrap.innerHTML = podiumOrder.map((e, i) => {
    if (!e) return "";
    const place = i === 1 ? "1" : i === 0 ? "2" : "3";
    return `
      <div class="lb-podium-col place-${place}${e.isSelf ? " self" : ""}">
        <span class="lb-podium-medal">${medal[i]}</span>
        <div class="lb-podium-avatar">${e.name.charAt(0)}</div>
        <span class="lb-podium-name">${e.name}</span>
        <span class="lb-podium-score">${fmt(e.score)}</span>
      </div>
    `;
  }).join("");

  // --- رتبه‌های ۴ تا ۱۰ ---
  const list = $("#leaderboard-list");
  list.innerHTML = "";
  entries.slice(3, LEADERBOARD_PRIZE_TOP).forEach((e, i) => {
    const rank = i + 4;
    const row = document.createElement("div");
    row.className = "leaderboard-row" + (e.isSelf ? " self" : "");
    row.innerHTML = `
      <span class="leaderboard-rank">${rank}</span>
      <span class="leaderboard-avatar-sm">${e.name.charAt(0)}</span>
      <span class="leaderboard-name">${e.name}${e.isSelf ? " · " + tr("yourRank") : ""}</span>
      <span class="leaderboard-score">${fmt(e.score)}</span>
    `;
    list.appendChild(row);
  });

  // --- ردیف چسبیده‌ی خودت، اگه بیرون از ۱۰ نفر اول باشی ---
  const selfRank = entries.findIndex((e) => e.isSelf) + 1;
  const selfEntry = entries.find((e) => e.isSelf);
  const yourRowWrap = $("#lb-your-row");
  yourRowWrap.innerHTML = selfRank > LEADERBOARD_PRIZE_TOP
    ? `
      <div class="leaderboard-row self pinned">
        <span class="leaderboard-rank">#${selfRank}</span>
        <span class="leaderboard-avatar-sm">${(userInfo.first_name || "?").charAt(0)}</span>
        <span class="leaderboard-name">${tr("yourRank")}</span>
        <span class="leaderboard-score">${fmt(selfEntry.score)}</span>
      </div>
    `
    : "";
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function boot() {
  // ---- لاگ ورود کاربر به اپ ----
  console.log("🚀 کاربر وارد اپ شد | id:", userInfo.id, "| زمان UTC:", new Date().toISOString());

  // اگه Supabase وصل باشه، appState از روی ردیف واقعی کاربر پر میشه؛ وگرنه (هنوز
  // URL/anon key جایگزین نشده) appState همون مقادیر محلی config.js می‌مونه — اپ می‌شکنه.
  await loadOrCreateUser();
  await registerReferralIfNeeded();
  refreshDailyStreakFromDate();
  loadUserReferrals().then(() => {
    renderReferralList();
    $("#stat-referrals") && ($("#stat-referrals").textContent = fmt(cachedReferrals.length));
    if ($("#page-leaderboard").classList.contains("active")) renderLeaderboard();
  });

  $("#coin-balance").textContent = fmt(appState.coins);
  refreshLevelFromXp();
  renderHomeLevelCard();
  renderPacks();
  renderDaily();
  renderAdTasks();
  renderLimitedTasks();
  renderNormalTasks();
  renderWheelSkinsGrid(); renderLevelWheelCard();
  renderProfile();
  applyLanguage();
  startNewRound();

  fetchAndRenderCpxTasks();
  setInterval(fetchAndRenderCpxTasks, CPX_CONFIG.refreshMs);
  initOnclickaSdk();
  initAdsgramSdk();

  checkTadsAvailability();
  setInterval(checkTadsAvailability, TADS_CONFIG.checkIntervalMs);

  // کاربر تازه (هنوز زبانی انتخاب نکرده — چه محلی، چه توی ستون lang خودِ Supabase) —
  // مجبورش کن اول زبان بازی رو انتخاب کنه
  if (appState.lang === NEW_USER_LANG) {
    openLangModal(true);
  }
}
boot();
