// =============================================================================
// SUPABASE — لایه‌ی اتصال به بک‌اند
// =============================================================================
// URL و anon/publishable key واقعی پروژه وصل شده. اگه یه روز پروژه‌ی Supabase عوض
// شد یا کلید چرخید، فقط همین دو مقدار زیر رو آپدیت کن، بقیه‌ی کد دست‌نخورده می‌مونه.
// -----------------------------------------------------------------------------
const SUPABASE_URL = "https://dppezqmhagqbpcemftyx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JxH_z3TTI3udozdnwtK2vw_vfP_9RsK";

const isSupabaseConfigured =
  SUPABASE_URL.startsWith("https://") && !SUPABASE_ANON_KEY.startsWith("YOUR_");

let supabaseClient = null;
if (isSupabaseConfigured && window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.log("⚠️ Supabase هنوز وصل نیست (URL/anon key پیش‌فرضه) — اپ با appState محلی کار می‌کنه.");
}

// -----------------------------------------------------------------------------
// خوندن یا ساختن ردیف کاربر توی جدول users، و پر کردن appState از روی همون ردیف.
// باید همون اول boot() صدا زده بشه، قبل از renderهای اولیه.
// -----------------------------------------------------------------------------
async function loadOrCreateUser() {
  if (!supabaseClient) return false;
  try {
    const { data: existing, error: selectErr } = await supabaseClient
      .from("users")
      .select("*")
      .eq("telegram_id", userInfo.id)
      .maybeSingle();

    if (selectErr) throw selectErr;

    if (existing) {
      applyUserRowToAppState(existing);
      console.log("✅ کاربر از Supabase لود شد | telegram_id:", userInfo.id);
      return true;
    }

    // کاربر تازه — یه ردیف جدید با مقادیر پیش‌فرض بساز (lang خالی می‌مونه عمداً)
    const newRow = {
      telegram_id: userInfo.id,
      first_name: userInfo.first_name || "",
      last_name: userInfo.last_name || null,
      username: userInfo.username || null,
      photo_url: userInfo.photo_url || null,
      is_premium: !!userInfo.is_premium,
      coins: 0,
      level: 1,
      ads_watched: 0,
      games_played: 0,
      games_won: 0,
      lang: null, // NULL = کاربر تازه => فرانت پنجره‌ی انتخاب زبون رو اجباری نشون میده
      daily_streak: 0,
      referral_balance: 0,
      wheel_effects: { snow: 0, earthquake: 0, coinRain: 0, adBoost: 0 },
      wheel_level_step: 0,
      free_wheel_spin_count: 0,
      last_daily_claim_date: null,
    };
    const { data: created, error: insertErr } = await supabaseClient
      .from("users")
      .insert(newRow)
      .select()
      .single();

    if (insertErr) throw insertErr;
    applyUserRowToAppState(created);
    console.log("🆕 کاربر تازه توی Supabase ساخته شد | telegram_id:", userInfo.id);
    return true;
  } catch (err) {
    console.log("⚠️ خطا در loadOrCreateUser:", err.message || err);
    return false;
  }
}

// اگه یه ردیف قدیمی/خراب wheel_effects رو به شکل عدد ساده ذخیره کرده باشه (نه {tier:N})،
// این تابع درستش می‌کنه تا هیچ‌جای کد به NaN نخوره.
function normalizeWheelEffects(raw) {
  const ids = ["snow", "earthquake", "coinRain", "adBoost"];
  const fallback = { snow: { tier: 0 }, earthquake: { tier: 0 }, coinRain: { tier: 0 }, adBoost: { tier: 0 } };
  if (!raw || typeof raw !== "object") return fallback;
  const out = {};
  ids.forEach((id) => {
    const v = raw[id];
    const tier = typeof v === "object" && v !== null ? Number(v.tier) : Number(v);
    out[id] = { tier: Number.isFinite(tier) ? tier : 0 };
  });
  return out;
}

// تبدیل یه ردیف واقعی جدول users به appState محلی (اسم ستون‌ها snake_case هستن، appState camelCase)
function applyUserRowToAppState(row) {
  appState.coins = row.coins ?? appState.coins;
  appState.level = row.level ?? appState.level;
  appState.adsWatched = row.ads_watched ?? appState.adsWatched;
  appState.gamesPlayed = row.games_played ?? appState.gamesPlayed;
  appState.gamesWon = row.games_won ?? appState.gamesWon;
  appState.lang = row.lang || NEW_USER_LANG; // ستون خالی => کاربر تازه
  appState.dailyStreak = row.daily_streak ?? appState.dailyStreak;
  appState.referralBalance = row.referral_balance ?? appState.referralBalance;
  appState.wheelEffects = normalizeWheelEffects(row.wheel_effects);
  appState.wheelLevelSkin = { step: row.wheel_level_step ?? appState.wheelLevelSkin.step };
  appState.freeWheelSpinCount = row.free_wheel_spin_count ?? appState.freeWheelSpinCount;
  appState.lastFreeWheelSpinDateUTC = row.last_free_wheel_spin_date || appState.lastFreeWheelSpinDateUTC;
  appState.lastDailyClaimDate = row.last_daily_claim_date || null;
}

// -----------------------------------------------------------------------------
// همگام‌سازی appState → ردیف کاربر توی Supabase.
// به‌جای این‌که سر هر تغییر کوچیک فوری بفرسته (که درخواست زیاد می‌سازه)، ۸۰۰ میلی‌ثانیه
// صبر می‌کنه؛ اگه توی همون بازه چندتا تغییر پشت‌سرهم بیاد، فقط یه‌بار واقعاً می‌فرسته.
// -----------------------------------------------------------------------------
let userSyncTimer = null;
let userSyncInFlight = null;
function queueUserSync() {
  if (!supabaseClient) return;
  clearTimeout(userSyncTimer);
  userSyncTimer = setTimeout(syncUserStateNow, 800);
}

// همینِ الان می‌فرسته (بدون صبر ۸۰۰ میلی‌ثانیه‌ای). این همون تیکه‌ای بود که کم
// بود: تا الان اگه کاربر همون لحظه‌ی باختن (یا هر تغییر سکه‌ای) مینی‌اپ رو
// می‌بست، تایمر debounce هیچ‌وقت اجرا نمی‌شد و آخرین تغییر اصلاً سیو نمی‌شد —
// برای همین بعد از باز کردن دوباره، سکه به مقدار قبل از باخت برمی‌گشت.
function flushUserSyncNow() {
  if (!supabaseClient) return;
  clearTimeout(userSyncTimer);
  userSyncInFlight = syncUserStateNow();
}

// وقتی مینی‌اپ می‌ره پس‌زمینه/بسته می‌شه، تلگرام معمولاً صفحه رو فوراً hidden
// می‌کنه ولی جاوااسکریپت چند لحظه‌ای هنوز زنده‌ست — دقیقاً همون لحظه‌ست که باید
// sync رو فوری بفرستیم، نه صبر کنیم.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) flushUserSyncNow();
});
window.addEventListener("pagehide", flushUserSyncNow);
window.addEventListener("beforeunload", flushUserSyncNow);
if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.onEvent) {
  window.Telegram.WebApp.onEvent("viewportChanged", (e) => {
    if (e && e.isStateStable === false) return;
    if (document.hidden) flushUserSyncNow();
  });
}

async function syncUserStateNow() {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient
      .from("users")
      .update({
        coins: appState.coins,
        level: appState.level,
        ads_watched: appState.adsWatched,
        games_played: appState.gamesPlayed,
        games_won: appState.gamesWon,
        lang: appState.lang === NEW_USER_LANG ? null : appState.lang,
        daily_streak: appState.dailyStreak,
        referral_balance: appState.referralBalance,
        wheel_effects: appState.wheelEffects,
        wheel_level_step: appState.wheelLevelSkin.step,
        free_wheel_spin_count: appState.freeWheelSpinCount,
        last_free_wheel_spin_date: appState.lastFreeWheelSpinDateUTC,
        last_daily_claim_date: appState.lastDailyClaimDate,
        updated_at: new Date().toISOString(),
      })
      .eq("telegram_id", userInfo.id);
    if (error) throw error;
  } catch (err) {
    console.log("⚠️ خطا در syncUserStateNow:", err.message || err);
  }
}

// -----------------------------------------------------------------------------
// gift_orders — وقتی کاربر یه گیفت تلگرامی سفارش می‌ده
// -----------------------------------------------------------------------------
async function createGiftOrder(giftId) {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient
      .from("gift_orders")
      .insert({ user_id: userInfo.id, gift_id: giftId, status: "pending" });
    if (error) throw error;
  } catch (err) {
    console.log("⚠️ خطا در createGiftOrder:", err.message || err);
  }
}

// -----------------------------------------------------------------------------
// ad_transactions — لاگ هر تبلیغ/سوروی دیده‌شده (برای ضدتقلب و تطبیق با Postback بعدی)
// -----------------------------------------------------------------------------
async function logAdTransaction(network, externalId, coinsAwarded) {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient.from("ad_transactions").insert({
      user_id: userInfo.id,
      network,
      external_id: externalId ? String(externalId) : null,
      coins_awarded: coinsAwarded,
      status: "pending", // TODO (کاربر): وقتی Postback واقعی وصل شد، این رکورد باید به "confirmed" آپدیت بشه
    });
    if (error) throw error;
  } catch (err) {
    console.log("⚠️ خطا در logAdTransaction:", err.message || err);
  }
}

// -----------------------------------------------------------------------------
// wheel_spins — تاریخچه‌ی اسپین‌های چرخ‌شانس روزانه
// -----------------------------------------------------------------------------
async function logWheelSpin(prizeCoins, spinDateUTC) {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient.from("wheel_spins").insert({
      user_id: userInfo.id,
      spin_date_utc: spinDateUTC,
      prize_coins: prizeCoins,
    });
    if (error) throw error;
  } catch (err) {
    console.log("⚠️ خطا در logWheelSpin:", err.message || err);
  }
}

// -----------------------------------------------------------------------------
// referrals — وقتی کاربر تازه از لینک ref_<id> وارد شده (start_param واقعی تلگرام)
// -----------------------------------------------------------------------------
// لینک دعوت الان به فرم REFERRAL_BOT_LINK_BASE + <telegram_id دعوت‌کننده> ساخته می‌شه
// (مثلاً ...?startapp=123456789)، پس تلگرام مقدار start_param رو دقیقاً همون
// آیدی خام می‌فرسته — دیگه پیشوند "ref_" نداره.
//
// نکته‌ی امنیتی: چون قرار شد هیچ RPC/تابعی به دیتابیس اضافه نشه، این تابع
// مستقیماً از سمت کلاینتِ کاربرِ رفرال‌شده، ردیف کاربرِ دعوت‌کننده رو هم آپدیت
// می‌کنه (coins). یعنی با anon key فعلی، تئوری امکان دستکاری از سمت کلاینت
// وجود داره. اگه بعداً خواستی امن‌ترش کنی، راه‌حلش انتقال این منطق به یه
// Supabase Edge Function یا RPC هست — ولی فعلاً طبق خواسته‌ت دست‌نخورده موند.
async function registerReferralIfNeeded() {
  if (!supabaseClient) return;
  try {
    const tg = window.Telegram && window.Telegram.WebApp;
    const startParam = tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param;
    if (!startParam) return;
    const referrerId = Number(startParam);
    if (!referrerId || !Number.isFinite(referrerId) || referrerId === userInfo.id) return; // خودارجاعی مجاز نیست

    // اگه از قبل رفرالی برای این کاربر ثبت شده، دوباره ثبت نکن (idempotent)
    const { data: existing } = await supabaseClient
      .from("referrals")
      .select("id")
      .eq("referred_id", userInfo.id)
      .maybeSingle();
    if (existing) return;

    // مطمئن شو رفرر واقعاً یه کاربر معتبره
    const { data: referrerRow } = await supabaseClient
      .from("users")
      .select("telegram_id, coins")
      .eq("telegram_id", referrerId)
      .maybeSingle();
    if (!referrerRow) return;

    const { error: insertErr } = await supabaseClient
      .from("referrals")
      .insert({ referrer_id: referrerId, referred_id: userInfo.id, tasks_completed: 0, status: "pending" });
    if (insertErr) throw insertErr;

    // پاداش ورود فوری: به خودمون (رفرال‌شده) + به دعوت‌کننده
    await supabaseClient
      .from("users")
      .update({ coins: referrerRow.coins + REFERRAL_JOIN_BONUS_REFERRER })
      .eq("telegram_id", referrerId);
    appState.coins += REFERRAL_JOIN_BONUS_REFERRED;
    queueUserSync();

    console.log("🔗 رفرال ثبت شد | referrer:", referrerId, "| referred:", userInfo.id);
  } catch (err) {
    console.log("⚠️ خطا در registerReferralIfNeeded:", err.message || err);
  }
}

// لیست دوستایی که خودِ این کاربر دعوت کرده (برای نمایش توی پروفایل)
let cachedReferrals = [];
async function loadUserReferrals() {
  if (!supabaseClient) { cachedReferrals = []; return cachedReferrals; }
  try {
    const { data, error } = await supabaseClient
      .from("referrals")
      .select("id, tasks_completed, status, referred:users!referrals_referred_id_fkey(first_name, username)")
      .eq("referrer_id", userInfo.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    cachedReferrals = data || [];
  } catch (err) {
    console.log("⚠️ خطا در loadUserReferrals:", err.message || err);
    cachedReferrals = [];
  }
  return cachedReferrals;
}

// فقط از تکمیل تسک «تبلیغ ویژه» (Tads.me / Special offer) صدا زده می‌شه — طبق
// تصمیم کاربر، رفرال فقط با همین نوع تسک اکتیو می‌شه، نه با تبلیغ/سوروی معمولی.
// پیشرفتش رو توی ردیف referrals خودش (به‌عنوان referred_id) +۱ می‌کنه؛ وقتی به
// REFERRAL_TASKS_REQUIRED (۵) رسید، status میشه "completed" و
// users.referral_balance صاحب لینک (referrer) +۱ می‌شه. (بدون RPC — مستقیم از
// کلاینت؛ همون نکته‌ی امنیتی بالا اینجا هم صادقه.)
async function incrementReferralTaskProgress() {
  if (!supabaseClient) return;
  try {
    const { data: row } = await supabaseClient
      .from("referrals")
      .select("id, referrer_id, tasks_completed, status")
      .eq("referred_id", userInfo.id)
      .maybeSingle();
    if (!row || row.status === "completed") return;

    const newCount = (row.tasks_completed || 0) + 1;
    const isDone = newCount >= REFERRAL_TASKS_REQUIRED;

    const { error: updErr } = await supabaseClient
      .from("referrals")
      .update({
        tasks_completed: newCount,
        status: isDone ? "completed" : "pending",
        completed_at: isDone ? new Date().toISOString() : null,
      })
      .eq("id", row.id);
    if (updErr) throw updErr;

    if (isDone) {
      const { data: referrerRow } = await supabaseClient
        .from("users")
        .select("referral_balance")
        .eq("telegram_id", row.referrer_id)
        .maybeSingle();
      if (referrerRow) {
        await supabaseClient
          .from("users")
          .update({ referral_balance: (referrerRow.referral_balance || 0) + 1 })
          .eq("telegram_id", row.referrer_id);
      }
      console.log("🎉 رفرال اکتیو شد | referred_id:", userInfo.id);
    }
  } catch (err) {
    console.log("⚠️ خطا در incrementReferralTaskProgress:", err.message || err);
  }
}
