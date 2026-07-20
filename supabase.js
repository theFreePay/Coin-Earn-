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
      wheel_effects: { snow: { tier: 0 }, earthquake: { tier: 0 }, coinRain: { tier: 0 }, adBoost: { tier: 0 } },
      wheel_level_step: 0,
      free_wheel_spin_count: 0,
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
}

// -----------------------------------------------------------------------------
// همگام‌سازی appState → ردیف کاربر توی Supabase.
// به‌جای این‌که سر هر تغییر کوچیک فوری بفرسته (که درخواست زیاد می‌سازه)، ۸۰۰ میلی‌ثانیه
// صبر می‌کنه؛ اگه توی همون بازه چندتا تغییر پشت‌سرهم بیاد، فقط یه‌بار واقعاً می‌فرسته.
// -----------------------------------------------------------------------------
let userSyncTimer = null;
function queueUserSync() {
  if (!supabaseClient) return;
  clearTimeout(userSyncTimer);
  userSyncTimer = setTimeout(syncUserStateNow, 800);
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
async function registerReferralIfNeeded() {
  if (!supabaseClient) return;
  try {
    const tg = window.Telegram && window.Telegram.WebApp;
    const startParam = tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param;
    if (!startParam || !startParam.startsWith("ref_")) return;
    const referrerId = Number(startParam.replace("ref_", ""));
    if (!referrerId || referrerId === userInfo.id) return; // خودارجاعی مجاز نیست

    // اگه از قبل رفرالی برای این کاربر ثبت شده، دوباره ثبت نکن (referred_id یکتاست)
    const { data: existing } = await supabaseClient
      .from("referrals")
      .select("id")
      .eq("referred_id", userInfo.id)
      .maybeSingle();
    if (existing) return;

    const { error } = await supabaseClient
      .from("referrals")
      .insert({ referrer_id: referrerId, referred_id: userInfo.id, tasks_completed: 0, status: "pending" });
    if (error) throw error;
    console.log("🔗 رفرال ثبت شد | referrer:", referrerId, "| referred:", userInfo.id);
  } catch (err) {
    console.log("⚠️ خطا در registerReferralIfNeeded:", err.message || err);
  }
}

// وقتی همین کاربر (که خودش رفرال شده) یه تسک (تبلیغ/سوروی) رو کامل می‌کنه،
// پیشرفتش رو توی ردیف referrals خودش (به‌عنوان referred_id) +۱ می‌کنه.
// وقتی به required_tasks (پیش‌فرض ۵) رسید، status میشه "completed".
async function incrementReferralTaskProgress() {
  if (!supabaseClient) return;
  try {
    const { data: row } = await supabaseClient
      .from("referrals")
      .select("id, tasks_completed, status")
      .eq("referred_id", userInfo.id)
      .maybeSingle();
    if (!row || row.status === "completed") return;

    const newCount = (row.tasks_completed || 0) + 1;
    const isDone = newCount >= 5;
    const { error } = await supabaseClient
      .from("referrals")
      .update({
        tasks_completed: newCount,
        status: isDone ? "completed" : "pending",
        completed_at: isDone ? new Date().toISOString() : null,
      })
      .eq("id", row.id);
    if (error) throw error;

    if (isDone) {
      // TODO (کاربر): این‌جا جای خوبیه که به appState.referralBalance صاحب لینک (+۱) هم
      // اضافه کنی — چون این کد سمت کاربرِ رفرال‌شده اجرا میشه، نه صاحب لینک، بهترین راه
      // یه Edge Function یا RPC توی Supabase هست که این افزایش رو امن انجام بده.
      console.log("🎉 رفرال کامل شد | referred_id:", userInfo.id);
    }
  } catch (err) {
    console.log("⚠️ خطا در incrementReferralTaskProgress:", err.message || err);
  }
}
