// ============================================================================
// config.js — همه‌ی داده‌های ساختگی (mock) این‌جا هستن.
// این نسخه کاملاً آفلاینه: هیچ فچ/سوپابیس/edge functionای صدا زده نمی‌شه.
// هرجا نیاز به اتصال واقعی هست، دقیقاً با کامنت TODO مشخص شده.
// ============================================================================

// ----------------------------------------------------------------------------
// TODO (کاربر): این‌جا رو با اطلاعات واقعی از Telegram WebApp پر کن. معمولاً:
//   const tg = window.Telegram.WebApp;
//   tg.ready(); tg.expand();
//   let userInfo = tg.initDataUnsafe.user;
// فیلدهایی که تلگرام واقعاً می‌ده: id, first_name, last_name, username,
// language_code, is_premium, photo_url
// ----------------------------------------------------------------------------
let userInfo = {
  id: 123456789,
  first_name: "علی",
  username: "ali_dev",
  is_premium: false,
  photo_url: null,
};

// ----------------------------------------------------------------------------
// TODO (کاربر): appState باید از دیتابیس/سرور خودت لود بشه (کوین، لول، رفرال و ...).
// الان همه‌ش ساختگیه و فقط توی حافظه‌ی مرورگر می‌مونه (رفرش = ریست).
// ----------------------------------------------------------------------------
let appState = {
  coins: 245000,
  level: 12,
  rank: "Silver",
  dailyStreak: 4,
  dailyClaimedToday: false,
  joinTimestamp: Date.now() - 1000 * 60 * 40, // فرض: ۴۰ دقیقه پیش وارد شده (برای تست پنجره‌ی ۳ساعته رفرال)
  lastFreeWheelTime: 0, // آخرین بار که چرخ شانس شناور رو با تبلیغ چرخونده (۰ = هنوز هیچ‌وقت)
  // ---- فیلدهای جدید برای «ثبت» اسپین‌های چرخ شانس روزانه ----
  // TODO (کاربر): این سه فیلد باید از جدول سوپابیس (مثلاً wheel_spins) لود بشن،
  // نه این‌که فقط توی appState محلی بمونن.
  lastFreeWheelSpinDateUTC: null, // تاریخ UTC آخرین اسپین به فرمت "YYYY-MM-DD"
  freeWheelSpinCount: 0, // تعداد کل اسپین‌هایی که تا الان ثبت شده
  freeWheelHistory: [], // آرایه‌ی رکوردهای هر اسپین: {dateUTC, timestamp, prizeCoins}
  lang: "fa",
  gamesPlayed: 7, // چند دست از «اتاق سکه» شرکت کرده (برای فرمول لیدربرد) — TODO (کاربر): از دیتابیس بشمار
  // تزئینات پروفایل خریداری‌شده (خالی/پیش‌فرض = چیزی خریداری نشده)
  profileFrame: null, // مقدار = id از CUSTOMIZATION_ITEMS دسته frame
  profileFont: null,  // مقدار = id از CUSTOMIZATION_ITEMS دسته font
  profileShadow: null, // مقدار = id از CUSTOMIZATION_ITEMS دسته shadow

  // ---- پیشرفت اسکین‌های افکتی اتاق سکه (برف/زمین‌لرزه/باران‌سکه) ----
  // TODO (کاربر): این آبجکت باید از سوپابیس لود/سیو بشه (جدول wheel_effect_progress).
  // tier صفر = هنوز خریداری نشده. همین که tier >= 1 بشه، افکت خودکار فعاله (equip دستی نداره).
  wheelEffects: {
    snow: { tier: 0 },
    earthquake: { tier: 0 },
    coinRain: { tier: 0 },
    adBoost: { tier: 0 },
  },

  // ---- مسیر رنگی گردونه بر اساس Level (روز تا شب تا کهکشان) ----
  // TODO (کاربر): این عدد باید از سوپابیس لود/سیو بشه (جدول wheel_level_progress).
  // step از ۰ تا ۸۰ پیش می‌ره؛ نمی‌تونه از appState.level واقعی جلو بزنه (سقفش getLevelWheelMaxPurchasableStep).
  wheelLevelSkin: { step: 0 },
};

// ----------------------------------------------------------------------------
// TODO (کاربر): این کدها/ID های شبکه‌های تبلیغاتی رو با مقادیر واقعی از هر
// پنل عوض کن (blockId, zoneId, و ...). الان فقط برای نمایش UI استفاده می‌شن.
// ----------------------------------------------------------------------------
const AD_NETWORKS = [
  { id: "adsgram", name: "Adsgram", reward: 15, cooldownSec: 12 },
  { id: "onclicka", name: "OnClicka", reward: 12, cooldownSec: 12 },
  { id: "tads", name: "Tads.me", reward: 10, cooldownSec: 12 },
  { id: "richads", name: "RichAds", reward: 10, cooldownSec: 12 },
];

// جوایز چرخ شانس شناور (قدیمی) — هر ۱۲ ساعت فقط یک‌بار، با دیدن تبلیغ
const WHEEL_SEGMENTS = [
  { label: "10", coins: 10, weight: 30, color: "#7b3ff2" },
  { label: "25", coins: 25, weight: 25, color: "#e04fd6" },
  { label: "50", coins: 50, weight: 18, color: "#7b3ff2" },
  { label: "100", coins: 100, weight: 12, color: "#e04fd6" },
  { label: "5", coins: 5, weight: 8, color: "#7b3ff2" },
  { label: "500", coins: 500, weight: 2, color: "#ffcb4d" },
  { label: "20", coins: 20, weight: 15, color: "#e04fd6" },
  { label: "1000", coins: 1000, weight: 1, color: "#ffcb4d" },
];

// بسته‌های سکه‌ی قفل‌شده (داخل مودال چرخ شناور نشون داده می‌شه)
const COIN_PACKS = [
  { coins: 1000, unlockType: "time", unlockDays: 20 },
  { coins: 5000, unlockType: "time", unlockDays: 30 },
  { coins: 2500, unlockType: "first_purchase" },
];

// پاداش‌های هفتگی پاداش روزانه
const DAILY_REWARDS = [30, 40, 50, 80, 100, 130, 200];

// تسک‌های محدود (limited) — name به‌صورت چندزبانه
const LIMITED_TASKS = [
  { id: "l1", name: { fa: "توی کانال ما جوین شو", en: "Join our channel", ru: "Подпишись на канал" }, reward: 40, done: false },
  { id: "l2", name: { fa: "پروفایلتو کامل کن", en: "Complete your profile", ru: "Заполни профиль" }, reward: 25, done: true },
  { id: "l3", name: { fa: "اولین خرید از فروشگاه", en: "First shop purchase", ru: "Первая покупка в магазине" }, reward: 60, done: false },
];

// تسک‌های معمولی (normal)
const NORMAL_TASKS = [
  { id: "n1", name: { fa: "۳ دوست دعوت کن", en: "Invite 3 friends", ru: "Пригласи 3 друзей" }, reward: 150, progress: 1, total: 3 },
  { id: "n2", name: { fa: "۵ تبلیغ امروز ببین", en: "Watch 5 ads today", ru: "Посмотри 5 реклам сегодня" }, reward: 50, progress: 2, total: 5 },
  { id: "n3", name: { fa: "۷ روز پشت‌سرهم وارد شو", en: "Log in 7 days in a row", ru: "Заходи 7 дней подряд" }, reward: 300, progress: 4, total: 7 },
];

// ----------------------------------------------------------------------------
// اسکین‌های «افکتی» اتاق سکه — جایگزین کامل «شارژ بازی» و «کارت هدیه».
// این‌ها دیگه رنگ گردونه رو عوض نمی‌کنن (رنگ رو مسیر سطح/XV پایین‌تر کنترل می‌کنه)،
// فقط یه افکت موقع برد اضافه می‌کنن. هر اسکین ۴ سطح داره (بدون نسل/تکرار بی‌نهایت،
// چون کوین‌سینک بی‌نهایت الان مسئولیت مسیر سطحه).
// هر اسکین همین که خریداری بشه فعاله (نیازی به equip دستی نیست) و همه‌ی
// اسکین‌های خریداری‌شده هم‌زمان با هم کار می‌کنن.
// ----------------------------------------------------------------------------
const EFFECT_SKINS = [
  { id: "snow", name: { fa: "برفی", en: "Snow", ru: "Снег" }, icon: "❄️", desc: { fa: "موقع برد، به‌جای کاغذ رنگی، برف از بالای صفحه می‌باره", en: "On win, snow falls from the top instead of confetti", ru: "При победе сверху падает снег вместо конфетти" }, previewColor: "#BFEFFF", basePrice: 4000 },
  { id: "earthquake", name: { fa: "زمین‌لرزه", en: "Earthquake", ru: "Землетрясение" }, icon: "🌍", desc: { fa: "موقع برد، گوشی ۲-۳ بار لرزش کوتاه می‌کنه", en: "On win, the phone vibrates 2-3 short times", ru: "При победе телефон коротко вибрирует 2-3 раза" }, previewColor: "#6b4a2e", basePrice: 4000 },
  { id: "coinRain", name: { fa: "باران سکه", en: "Coin Rain", ru: "Денежный дождь" }, icon: "🌧️", desc: { fa: "~۱۰٪ شانس هر دور برای ضربدر شدن جایزه‌ی برد + سقف سهم اتاق سکه بالاتر می‌ره", en: "~10% chance each round to multiply your win + raises the pot-game max stake", ru: "~10% шанс умножить выигрыш + повышает макс. ставку" }, previewColor: "#FFD166", basePrice: 9000, requiresReferralsForTier4: 3 },
  { id: "adBoost", name: { fa: "افزایش سهم تبلیغات", en: "Ad Boost", ru: "Буст рекламы" }, icon: "📺", desc: { fa: "هر تبلیغی که می‌بینی سکه‌ی بیشتری می‌ده", en: "Every ad you watch pays more coins", ru: "Каждая реклама даёт больше монет" }, previewColor: "#8CFF6B", basePrice: 6000 },
];

const EFFECT_SKIN_TIER_NAMES = {
  fa: ["پایه", "درخشان", "ذره‌ای", "افسانه‌ای"],
  en: ["Base", "Glowing", "Particle", "Legendary"],
  ru: ["Базовый", "Светящийся", "Частицы", "Легендарный"],
};
const EFFECT_SKIN_TIER_MULTIPLIER = 3; // هر سطح، ۳ برابر سطح قبل قیمت داره
// ضرایب باران سکه به‌ازای هر سطح (سطح ۱=ایندکس ۰)
const COIN_RAIN_MULTIPLIERS = [1.5, 2, 2.5, 3];
const COIN_RAIN_TRIGGER_CHANCE = 0.1; // ~۱۰٪ هر دور

// سقف سهم اتاق سکه به‌ازای سطح باران‌سکه: ایندکس ۰ = هنوز نخریده (سقف پایه)، ۱ تا ۴ = سطح فعلی
// TODO (کاربر): عدد دقیق رو خودت میزان کن؛ فعلاً پایه ۲۰۰۰ و هر سطح +۱۵۰۰ تا سقف ۸۰۰۰ توی سطح ۴
const COIN_RAIN_MAX_STAKE_BY_TIER = [2000, 3500, 5000, 6500, 8000];

// ضریب افزایش سکه‌ی هر تبلیغ به‌ازای سطح افزایش‌سهم‌تبلیغات (ایندکس ۰ = هنوز نخریده)
// سطح ۱: ~۱.۷x (مثلاً ۱۵ → حدود ۲۰-۳۰)، سطح ۴: ~۱۵x (مثلاً ۱۵ → حدود ۲۰۰-۲۵۰)
const AD_BOOST_MULTIPLIERS = [1, 1.7, 4, 8, 15];

// قیمت خرید/ارتقای سطح بعدی یه اسکین افکتی (بدون نسل، سقف سطح ۴)
function getEffectSkinNextPrice(skinId) {
  const skin = EFFECT_SKINS.find((s) => s.id === skinId);
  const progress = appState.wheelEffects[skinId];
  const nextTier = progress.tier + 1;
  return Math.round(skin.basePrice * Math.pow(EFFECT_SKIN_TIER_MULTIPLIER, nextTier - 1));
}

// سقف فعلی سهم اتاق سکه، بر اساس سطح باران‌سکه
function getCurrentPotMaxStake() {
  const tier = appState.wheelEffects.coinRain.tier;
  return COIN_RAIN_MAX_STAKE_BY_TIER[tier];
}

// نسبت افزایش سقف نسبت به حالت پایه — برای اسکیل‌کردن سهم بازیکن‌های فیک هم استفاده می‌شه
function getPotMaxStakeScaleRatio() {
  return getCurrentPotMaxStake() / COIN_RAIN_MAX_STAKE_BY_TIER[0];
}

// مقدار سکه‌ای که به‌ازای دیدن یه تبلیغ گرفته می‌شه، با احتساب افکت افزایش‌سهم‌تبلیغات
function getAdRewardWithBoost(baseReward) {
  const tier = appState.wheelEffects.adBoost.tier;
  const mult = AD_BOOST_MULTIPLIERS[tier];
  const jitter = 0.85 + Math.random() * 0.3; // کمی نوسان تا حس «بین X تا Y» بده
  return Math.max(1, Math.round(baseReward * mult * jitter));
}

// مقدار نمایشی (بدون نوسان تصادفی) که کنار هر تسک تبلیغاتی توی لیست نشون داده می‌شه؛
// با ارتقای افکت «افزایش سهم تبلیغات» این عدد هم خودکار بالاتر می‌ره.
function getAdRewardDisplay(baseReward) {
  const tier = appState.wheelEffects.adBoost.tier;
  return Math.max(1, Math.round(baseReward * AD_BOOST_MULTIPLIERS[tier]));
}

// آدرس مقصد وقتی کاربر برای ارتقایی که نیاز به رفرال بیشتر داره کلیک می‌کنه ولی رفرال کافی نداره.
// TODO (کاربر): این آدرس رو با لینک واقعی خودت (مثلاً صفحه‌ی دعوت دوستان) جایگزین کن.
const REFERRAL_SHORTFALL_REDIRECT_URL = "x";

// ----------------------------------------------------------------------------
// مسیر رنگی گردونه بر اساس Level — کوین‌سینک اصلی و بی‌نهایت‌حس.
// appState.level واقعی (که با بازی‌کردن بالا می‌ره) سقف این‌که تا کجا می‌تونی
// امروز آپگرید بخری رو تعیین می‌کنه؛ یعنی نمی‌تونی جلوتر از سطح واقعیت رنگ بخری.
// ----------------------------------------------------------------------------
const LEVEL_WHEEL_SUB_PER_LEVEL = 4;
const LEVEL_WHEEL_MAX_LEVEL = 20;
const LEVEL_WHEEL_TOTAL_STEPS = LEVEL_WHEEL_SUB_PER_LEVEL * LEVEL_WHEEL_MAX_LEVEL; // 80

const LEVEL_WHEEL_ANCHORS = [
  { level: 1, colors: ["#FFD9A0", "#FF9A5C", "#FFB020"] }, // صبح گرم
  { level: 5, colors: ["#BFEFFF", "#4FA8D8", "#2C6E9E"] }, // آبی یخی
  { level: 10, colors: ["#FF9AD5", "#E04FD6", "#7B3FF2"] }, // غروب صورتی
  { level: 15, colors: ["#7B3FF2", "#4B2380", "#241246"] }, // بنفش عمیق
  { level: 20, colors: ["#3a3a6a", "#151530", "#000022"] }, // کهکشانی شب
];

function hexToRgbArr(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
function rgbArrToHex([r, g, b]) {
  return "#" + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
}
function lerpHex(a, b, t) {
  const ca = hexToRgbArr(a), cb = hexToRgbArr(b);
  return rgbArrToHex(ca.map((v, i) => v + (cb[i] - v) * t));
}

// رنگای گردونه بر اساس step فعلی (0..80) — بین پالت‌های لنگر نرم تغییر می‌کنه
function getLevelWheelColors(step) {
  const levelFloat = 1 + (step / LEVEL_WHEEL_TOTAL_STEPS) * (LEVEL_WHEEL_MAX_LEVEL - 1);
  let lo = LEVEL_WHEEL_ANCHORS[0], hi = LEVEL_WHEEL_ANCHORS[LEVEL_WHEEL_ANCHORS.length - 1];
  for (let i = 0; i < LEVEL_WHEEL_ANCHORS.length - 1; i++) {
    if (levelFloat >= LEVEL_WHEEL_ANCHORS[i].level && levelFloat <= LEVEL_WHEEL_ANCHORS[i + 1].level) {
      lo = LEVEL_WHEEL_ANCHORS[i]; hi = LEVEL_WHEEL_ANCHORS[i + 1]; break;
    }
  }
  const span = hi.level - lo.level || 1;
  const t = Math.max(0, Math.min(1, (levelFloat - lo.level) / span));
  return lo.colors.map((c, i) => lerpHex(c, hi.colors[i], t));
}

// حداکثر step ای که همین الان (با level واقعی کاربر) اجازه‌ی خریدش رو داره
function getLevelWheelMaxPurchasableStep() {
  return Math.min(LEVEL_WHEEL_TOTAL_STEPS, appState.level * LEVEL_WHEEL_SUB_PER_LEVEL);
}

// قیمت سکه‌ای پله‌ی بعدی مسیر سطح (تصاعدی و کند، چون ۸۰ پله داره)
function getLevelWheelNextPrice(step) {
  return Math.round(150 * Math.pow(1.09, step));
}

// آیتم‌های فروشگاه — دیگه شارژ بازی/کارت‌هدیه نداره (تصمیم کاربر: فروشگاه کاملاً درون‌اپی شد)
const SHOP_ITEMS = [
];

// دوستان دعوت‌شده (رفرال)
let REFERRALS = [
  { name: "محمد", tasksDone: 5, requiredTasks: 5, status: "claimable", reward: 50 },
  { name: "زهرا", tasksDone: 2, requiredTasks: 5, status: "pending", reward: 50 },
  { name: "حسین", tasksDone: 0, requiredTasks: 5, status: "pending", reward: 50 },
];

const REFERRAL_BASE_REWARD = 50;
const REFERRAL_BOOST_WINDOW_MS = 3 * 60 * 60 * 1000; // ۳ ساعت
const REFERRAL_BOOST_MULTIPLIER = 3;
const REFERRAL_BOOST_REWARD = REFERRAL_BASE_REWARD * REFERRAL_BOOST_MULTIPLIER; // 150

const FREE_WHEEL_COOLDOWN_MS = 12 * 60 * 60 * 1000; // ۱۲ ساعت

// ----------------------------------------------------------------------------
// بازی «اتاق سکه» (pot game) — منصفانه: برنده با یه رندوم واقعی و وزن‌دار
// دقیقاً متناسب با سهم واقعی هرکس از مجموع سکه‌ها انتخاب می‌شه. هیچ دستکاری
// پنهانی روی نتیجه وجود نداره.
// TODO (کاربر): وقتی کاربر واقعی کافی داشتی، به‌جای این اسم‌های ساختگی از
// matchmaking واقعی (کاربرای واقعی آنلاین) استفاده کن.
// ----------------------------------------------------------------------------
const FAKE_PLAYER_NAMES = [
  "Amir_92", "Sara.M", "MaxPower", "NinaK", "Rustam", "Elena_x", "Dark_Wolf",
  "Yasin7", "Katya", "Bahar_S", "Ivan.Petrov", "Leyla", "GoldenFox", "Pouya",
];
const POT_MIN_PLAYERS = 4;
const POT_MAX_PLAYERS = 6;
const POT_COUNTDOWN_SEC = 10;
const POT_SPIN_DURATION_MS = 7000;
const POT_MIN_STAKE = 10;
const POT_MAX_STAKE = 2000; // حداکثر سهمی که کاربر می‌تونه توی یه دور بذاره
const POT_STAKE_INCREMENT = 10; // مقدار هر بار افزایش با دکمه‌ی +۱۰ بعد از تایید اول
const POT_PLAYER_COLORS = ["#e04fd6", "#7b3ff2", "#ffcb4d", "#4fd77c", "#4dc3ff", "#ff8a4d", "#ff5c7a"];

// جایزه‌ی هفتگی ۱۰ نفر برتر لیدربرد — TODO (کاربر): سمت سرور، در پایان هر
// دوره (مثلاً هفتگی) این جایزه رو فقط برای ۱۰ نفر اول همون لحظه اعمال کن،
// نه سمت کلاینت (که قابل دستکاریه).
const LEADERBOARD_TOP_PRIZE = {
  coins: 10000,
  fontColor: {
    id: "font_fire",
    name: { fa: "فونت آتشین پروفایل", en: "Fiery Profile Font", ru: "Огненный шрифт" },
    preview: "linear-gradient(90deg, #ff5c2b, #ffcb4d, #ff2b6b)",
  },
};

// ----------------------------------------------------------------------------
// آیتم‌های تزئین پروفایل (فروشگاه) — فقط ظاهریه، هیچ ارزش مالی/قابل‌فروشی نداره.
// ----------------------------------------------------------------------------
const CUSTOMIZATION_ITEMS = [
  { category: "customize", type: "frame", id: "frame_gold", name: { fa: "قاب طلایی", en: "Gold Frame", ru: "Золотая рамка" }, cost: 800, preview: "linear-gradient(135deg,#ffcb4d,#ff8a4d)" },
  { category: "customize", type: "frame", id: "frame_neon", name: { fa: "قاب نئونی صورتی", en: "Neon Pink Frame", ru: "Неоновая рамка" }, cost: 800, preview: "linear-gradient(135deg,#e04fd6,#7b3ff2)" },
  { category: "customize", type: "frame", id: "frame_ice", name: { fa: "قاب یخی آبی", en: "Ice Blue Frame", ru: "Ледяная рамка" }, cost: 800, preview: "linear-gradient(135deg,#4dc3ff,#4fd77c)" },
  { category: "customize", type: "shadow", id: "shadow_glow", name: { fa: "سایه‌ی درخشان", en: "Glow Shadow", ru: "Сияющая тень" }, cost: 500, preview: "0 0 26px rgba(224,79,214,0.7)" },
  { category: "customize", type: "shadow", id: "shadow_soft", name: { fa: "سایه‌ی نرم طلایی", en: "Soft Gold Shadow", ru: "Мягкая золотая тень" }, cost: 500, preview: "0 0 26px rgba(255,203,77,0.6)" },
  { category: "customize", type: "font", id: "font_bold", name: { fa: "فونت ضخیم ویژه", en: "Bold Display Font", ru: "Жирный шрифт" }, cost: 350, preview: "900" },
];

// ----------------------------------------------------------------------------
// کاربرای ساختگی برای لیدربرد (دمو) — TODO (کاربر): با کاربرای واقعی از
// دیتابیس جایگزین کن.
// ----------------------------------------------------------------------------
const MOCK_USERS = [
  { id: "u1", name: "Amir_92", username: "amir92", referrals: 18, gamesPlayed: 40 },
  { id: "u2", name: "Sara.M", username: "sara_m", referrals: 25, gamesPlayed: 22 },
  { id: "u3", name: "MaxPower", username: "maxpower", referrals: 6, gamesPlayed: 61 },
  { id: "u4", name: "NinaK", username: "ninak", referrals: 12, gamesPlayed: 15 },
  { id: "u5", name: "Rustam", username: "rustam_tj", referrals: 30, gamesPlayed: 8 },
  { id: "u6", name: "Elena_x", username: "elenax", referrals: 3, gamesPlayed: 55 },
  { id: "u7", name: "Bahar_S", username: "bahar_s", referrals: 9, gamesPlayed: 33 },
  { id: "u8", name: "Pouya", username: "pouya_dev", referrals: 15, gamesPlayed: 19 },
];

// وزن فرمول لیدربرد: امتیاز = رفرال × وزن‌رفرال + بازی × وزن‌بازی
// TODO (کاربر): اگه جایزه‌ی واقعی/نقدی به لیدربرد وصل کردی، حتماً یه بررسی
// ضدتقلب روی رفرال‌ها (همون شرط ۵ تسک) قبل از شمارش امتیاز اعمال کن.
const LEADERBOARD_REFERRAL_WEIGHT = 2;
const LEADERBOARD_GAME_WEIGHT = 1;
const LEADERBOARD_PRIZE_TOP = 10;

// ----------------------------------------------------------------------------
// چندزبانگی — fa / en / ru. اسم بازیکن‌های ساختگی و رشته‌های ساده (نه آبجکت
// چندزبانه) ترجمه نمی‌شن (طبق خواسته‌ی کاربر).
// ----------------------------------------------------------------------------
const LANGUAGES = [
  { code: "fa", flag: "🇮🇷", label: "فارسی" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "ru", flag: "🇷🇺", label: "Русский" },
];

const TRANSLATIONS = {
  fa: {
    navHome: "خانه", navTasks: "تسک‌ها", navShop: "فروشگاه", navProfile: "پروفایل",
    room: "اتاق", total: "مجموع", waitingNextRound: "در انتظار شروع دور بعدی...",
    collectingStakes: "در حال جمع‌آوری سهم‌ها...",
    yourStake: "سهم شما", confirm: "تایید", stakeConfirmed: "سهمت ثبت شد ✅",
    roundLocked: "دور شروع شد، دیگه نمی‌شه سهم رو عوض کرد",
    spinning: "در حال چرخش...", youWon: "بردی! 🎉", youLost: "این دور نبردی، دور بعد شانستو امتحان کن",
    someoneWon: "برنده شد", freeWheelTitle: "چرخ شانس رایگان", spinWithAd: "چرخش با تبلیغ",
    nextSpinIn: "چرخش بعدی تا", close: "بستن", chooseLanguage: "انتخاب زبان", settingsTitle: "تنظیمات",
    boostModalTitle: "فرصت طلایی محدود! 🔥", boostModalDesc: "همین الان دوستاتو دعوت کن و به‌جای ۵۰ سکه، ۱۵۰ سکه بگیر",
    inviteNow: "همین الان دعوت کن", boostActiveText: "پاداش رفرال فعاله تا",
    dailyReward: "پاداش روزانه", tasksAds: "تبلیغات", tasksLimited: "محدود", tasksNormal: "معمولی",
    myReferralLink: "لینک دعوت من", copy: "کپی", copied: "لینک کپی شد ✅",
    referralHint: "هر دوست باید ۵ تسک انجام بده تا پاداشش قطعی بشه",
    specialPacks: "بسته‌های ویژه", coinsLabel: "سکه", claim: "دریافت", more: "جوایز بعدی رو ببین",
    watchAd: "تماشا", notEnoughCoins: "سکه کافی نیست", getIt: "دریافت", maxStakeReached: "به سقف سهم رسیدی",
    tasksAll: "همه", navLeaderboard: "لیدربرد", stakeMaxHint: "حداکثر سهم: ۲٬۰۰۰ سکه",
    topPrizeTitle: "جایزه‌ی ۱۰ نفر برتر", prizeCoinsLabel: "سکه", prizeBadgeLabel: "نشان قهرمانی",
    prizeFontLabel: "فونت آتشین پروفایل",
    tasksSpecial: "ویژه", badgesLabel: "نشان", referralsLabel: "رفرال",
    myCollection: "کلکسیون من", noBadgesYet: "هنوز نشانی نگرفتی — از بخش «ویژه» توی تسک‌ها شروع کن",
    ownedByToday: "نفر امروز صاحبشن", searchPlaceholder: "جستجوی دوستان و کاربرا...",
    noResults: "نتیجه‌ای پیدا نشد", leaderboard: "لیدربرد", leaderboardDesc: "امتیاز = (رفرال × ۲) + تعداد دست‌های بازی",
    yourRank: "رتبه‌ی تو", topPrizeNote: "نفرات برتر جایزه‌ی ویژه می‌گیرن",
    customizeTab: "تزئینات", applyBtn: "استفاده", appliedBtn: "فعاله ✅", buyBtn: "خرید",
    viewProfile: "مشاهده پروفایل", games: "دست بازی", backBtn: "بازگشت",
    wheelSkinsTab: "افکت‌های گردونه", upgradeBtn: "ارتقا", notOwnedYet: "هنوز خریداری نشده",
    tierLabel: "سطح", maxedTierLabel: "حداکثر سطح ✅", effectActive: "افکت فعاله",
    needsReferralsPrefix: "نیاز به", needsReferralsSuffix: "رفرال تکمیل‌شده",
    levelWheelTitle: "مسیر رنگ گردونه", levelWheelSub: "با بازی کردن، سطحت بالا می‌ره و اجازه می‌ده رنگ گردونه رو ارتقا بدی",
    levelStepLabel: "پله", levelStepOf: "از", levelLockedPrefix: "برای این پله باید سطحت حداقل", levelLockedSuffix: "باشه",
    levelMaxed: "رنگ گردونه به حداکثر رسید ✨", coinRainWin: "باران سکه",
    stakeMaxLabel: "حداکثر سهم:",
    notEnoughCoinsForUpgrade: "سکه کافی برای این ارتقا نداری، برو سکه جمع کن",
    notEnoughCoinsForGame: "سکه کافی برای اجرای بازی نداری",
  },
  en: {
    navHome: "Home", navTasks: "Tasks", navShop: "Shop", navProfile: "Profile",
    room: "Room", total: "Total", waitingNextRound: "Waiting for next round...",
    collectingStakes: "Collecting stakes...",
    yourStake: "Your stake", confirm: "Confirm", stakeConfirmed: "Stake locked in ✅",
    roundLocked: "Round started, stakes are locked",
    spinning: "Spinning...", youWon: "You won! 🎉", youLost: "Not this round — try again next time",
    someoneWon: "won", freeWheelTitle: "Free Lucky Wheel", spinWithAd: "Spin with ad",
    nextSpinIn: "Next spin in", close: "Close", chooseLanguage: "Choose language", settingsTitle: "Settings",
    boostModalTitle: "Limited golden window! 🔥", boostModalDesc: "Invite friends right now and get 150 coins instead of 50",
    inviteNow: "Invite now", boostActiveText: "Referral boost active until",
    dailyReward: "Daily reward", tasksAds: "Ads", tasksLimited: "Limited", tasksNormal: "Normal",
    myReferralLink: "My invite link", copy: "Copy", copied: "Link copied ✅",
    referralHint: "Friends need to finish 5 tasks before the reward unlocks",
    specialPacks: "Special packs", coinsLabel: "coins", claim: "Claim", more: "See upcoming rewards",
    watchAd: "Watch", notEnoughCoins: "Not enough coins", getIt: "Get", maxStakeReached: "Max stake reached",
    tasksAll: "All", navLeaderboard: "Leaderboard", stakeMaxHint: "Max stake: 2,000 coins",
    topPrizeTitle: "Top 10 Prize", prizeCoinsLabel: "coins", prizeBadgeLabel: "Champion badge",
    prizeFontLabel: "Fiery profile font",
    tasksSpecial: "Special", badgesLabel: "Badges", referralsLabel: "Referrals",
    myCollection: "My Collection", noBadgesYet: "No badges yet — check the Special tab in Tasks",
    ownedByToday: "own this today", searchPlaceholder: "Search friends and users...",
    noResults: "No results found", leaderboard: "Leaderboard", leaderboardDesc: "Score = (referrals × 2) + games played",
    yourRank: "Your rank", topPrizeNote: "Top players get a special prize",
    customizeTab: "Customize", applyBtn: "Apply", appliedBtn: "Active ✅", buyBtn: "Buy",
    viewProfile: "View profile", games: "games played", backBtn: "Back",
    wheelSkinsTab: "Wheel Effects", upgradeBtn: "Upgrade", notOwnedYet: "Not owned yet",
    tierLabel: "Tier", maxedTierLabel: "Max tier ✅", effectActive: "Effect active",
    needsReferralsPrefix: "Needs", needsReferralsSuffix: "completed referrals",
    levelWheelTitle: "Wheel color path", levelWheelSub: "Level up by playing to unlock color upgrades",
    levelStepLabel: "Step", levelStepOf: "of", levelLockedPrefix: "Reach level", levelLockedSuffix: "to unlock this step",
    levelMaxed: "Wheel color maxed ✨", coinRainWin: "Coin Rain",
    stakeMaxLabel: "Max stake:",
    notEnoughCoinsForUpgrade: "Not enough coins for this upgrade — go earn some",
    notEnoughCoinsForGame: "Not enough coins to play",
  },
  ru: {
    navHome: "Главная", navTasks: "Задания", navShop: "Магазин", navProfile: "Профиль",
    room: "Комната", total: "Всего", waitingNextRound: "Ожидание следующего раунда...",
    collectingStakes: "Сбор ставок...",
    yourStake: "Ваша ставка", confirm: "Подтвердить", stakeConfirmed: "Ставка принята ✅",
    roundLocked: "Раунд начался, ставки заблокированы",
    spinning: "Крутится...", youWon: "Вы выиграли! 🎉", youLost: "В этот раз не повезло — попробуйте снова",
    someoneWon: "выиграл(а)", freeWheelTitle: "Бесплатное колесо", spinWithAd: "Крутить за рекламу",
    nextSpinIn: "Следующий спин через", close: "Закрыть", chooseLanguage: "Выберите язык", settingsTitle: "Настройки",
    boostModalTitle: "Ограниченное окно! 🔥", boostModalDesc: "Пригласи друзей прямо сейчас и получи 150 монет вместо 50",
    inviteNow: "Пригласить сейчас", boostActiveText: "Бонус за рефералов активен до",
    dailyReward: "Ежедневная награда", tasksAds: "Реклама", tasksLimited: "Ограниченные", tasksNormal: "Обычные",
    myReferralLink: "Моя реферальная ссылка", copy: "Копировать", copied: "Ссылка скопирована ✅",
    referralHint: "Друг должен выполнить 5 заданий, чтобы награда открылась",
    specialPacks: "Особые наборы", coinsLabel: "монет", claim: "Забрать", more: "Смотреть будущие награды",
    watchAd: "Смотреть", notEnoughCoins: "Недостаточно монет", getIt: "Получить", maxStakeReached: "Достигнут лимит ставки",
    tasksAll: "Все", navLeaderboard: "Рейтинг", stakeMaxHint: "Макс. ставка: 2000 монет",
    topPrizeTitle: "Приз топ-10", prizeCoinsLabel: "монет", prizeBadgeLabel: "Значок чемпиона",
    prizeFontLabel: "Огненный шрифт профиля",
    tasksSpecial: "Особое", badgesLabel: "Значки", referralsLabel: "Рефералы",
    myCollection: "Моя коллекция", noBadgesYet: "Пока нет значков — загляни во вкладку «Особое»",
    ownedByToday: "владеют этим сегодня", searchPlaceholder: "Поиск друзей и пользователей...",
    noResults: "Ничего не найдено", leaderboard: "Таблица лидеров", leaderboardDesc: "Очки = (рефералы × 2) + сыгранные раунды",
    yourRank: "Твоё место", topPrizeNote: "Лучшие игроки получают особый приз",
    customizeTab: "Оформление", applyBtn: "Применить", appliedBtn: "Активно ✅", buyBtn: "Купить",
    viewProfile: "Профиль", games: "раундов сыграно", backBtn: "Назад",
    wheelSkinsTab: "Эффекты колеса", upgradeBtn: "Улучшить", notOwnedYet: "Ещё не куплено",
    tierLabel: "Уровень", maxedTierLabel: "Макс. уровень ✅", effectActive: "Эффект активен",
    needsReferralsPrefix: "Нужно", needsReferralsSuffix: "завершённых рефералов",
    levelWheelTitle: "Цветовой путь колеса", levelWheelSub: "Играй, повышай уровень и открывай новые цвета",
    levelStepLabel: "Шаг", levelStepOf: "из", levelLockedPrefix: "Нужен уровень", levelLockedSuffix: "для этого шага",
    levelMaxed: "Цвет колеса на максимуме ✨", coinRainWin: "Денежный дождь",
    stakeMaxLabel: "Макс. ставка:",
    notEnoughCoinsForUpgrade: "Недостаточно монет для улучшения — заработай ещё",
    notEnoughCoinsForGame: "Недостаточно монет, чтобы сыграть",
  },
};

function tr(key) {
  return (TRANSLATIONS[appState.lang] && TRANSLATIONS[appState.lang][key]) || TRANSLATIONS.fa[key] || key;
}
// برای رشته‌هایی که به‌صورت آبجکت چندزبانه ذخیره شدن (مثل نام آیتم‌های شاپ)
function trField(field) {
  if (typeof field === "string") return field; // رشته‌ی ساده = ترجمه نشده، طبق طراحی
  return field[appState.lang] || field.fa;
}
