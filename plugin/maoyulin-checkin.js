/************************************
 * 猫羽雫API 自动签到脚本
 * 站点: maoyulin.xyz (NewAPI)
 * 适配: Loon
 *
 * argument 传参格式（由插件 Argument 配置）:
 *   直接传 session 字符串，例如：ab12cd34...
 *   JS 内兼容两种格式：纯字符串 或 JSON {"session":"xxx"}
 *
 * session 来源优先级：
 *   1. argument 手动填写
 *   2. 抓Cookie 脚本自动存储的持久化数据
 ************************************/

const SITE = "maoyulin.xyz";
const BASE_URL = `https://${SITE}`;
const STORE_KEY = "maoyulin_session";

// ========== 读取配置 ==========
// argument 可能是纯 session 字符串，也可能是 JSON
let SESSION = "";
let USER_ID = "";

try {
  if (typeof $argument !== "undefined" && $argument) {
    const arg = $argument.trim();
    // 尝试解析 JSON
    if (arg.startsWith("{")) {
      const config = JSON.parse(arg);
      SESSION = config.session || "";
      USER_ID = config.user_id || "";
    } else {
      // 纯字符串，当作 session
      SESSION = arg;
    }
  }
} catch (e) {
  console.log(`[猫羽雫签到] 参数解析失败: ${e}`);
}

// argument 为空或留空时，尝试从持久化存储读取
if (!SESSION || SESSION === "null" || SESSION === "undefined") {
  SESSION = (typeof $persistentStore !== "undefined" ? $persistentStore.read(STORE_KEY) : "") || "";
}

// ========== HTTP 请求 ==========
function $get(url, headers) {
  return new Promise((resolve) => {
    if (typeof $httpClient === "undefined") return resolve(null);
    $httpClient.get({ url, headers, timeout: 15 }, (err, resp, body) => {
      if (err) { console.log(`GET ${url} err: ${err}`); return resolve(null); }
      try { resolve(JSON.parse(body)); } catch (e) { resolve(null); }
    });
  });
}

function $post(url, headers, body) {
  return new Promise((resolve) => {
    if (typeof $httpClient === "undefined") return resolve(null);
    $httpClient.post({ url, headers, body: body || "", timeout: 15 }, (err, resp, data) => {
      if (err) { console.log(`POST ${url} err: ${err}`); return resolve(null); }
      try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
    });
  });
}

function notify(title, subtitle, body) {
  if (typeof $notification !== "undefined") {
    $notification.post(title, subtitle, body);
  }
}

function fmt(v) {
  if (v == null) return "0";
  const n = Number(v);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ========== 主流程 ==========
(async () => {
  if (!SESSION) {
    console.log("[猫羽雫签到] ❌ 无 session");
    console.log("[猫羽雫签到] 请: ①在插件「手动填写Session」输入框填入session 或 ②开启抓Cookie后访问 maoyulin.xyz");
    notify("猫羽雫签到", "❌ 缺少凭证", "请手动填写 Session 或开启抓Cookie");
    $done();
    return;
  }

  const headers = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    "Cookie": `session=${SESSION}`,
  };
  if (USER_ID) headers["new-api-user"] = String(USER_ID);

  // 1. 验证登录
  const userInfo = await $get(`${BASE_URL}/api/user/self`, headers);
  if (!userInfo || !userInfo.data || userInfo.success === false) {
    console.log("[猫羽雫签到] ❌ Session 已过期");
    notify("猫羽雫签到", "❌ 登录过期", "Session 已失效，请重新填写或抓取");
    $done();
    return;
  }
  const username = userInfo.data.username || userInfo.data.email || "未知用户";

  // 2. 签到
  const result = await $post(`${BASE_URL}/api/user/checkin`, headers);
  if (!result) {
    notify("猫羽雫签到", "❌ 请求失败", "签到接口无响应");
    $done();
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  if (result.success) {
    const data = result.data || {};
    const quota = fmt(data.quota_awarded);
    console.log(`[猫羽雫签到] ✅ 签到成功 | ${today} | +${quota}`);
    notify("猫羽雫签到 ✅", username, `签到成功 | +${quota}`);
  } else {
    const msg = result.message || "未知错误";
    console.log(`[猫羽雫签到] ${msg}`);
    notify("猫羽雫签到 ⚠️", username, msg);
  }

  // 3. 本月统计
  const ym = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const history = await $get(`${BASE_URL}/api/user/checkin?month=${ym}`, headers);
  if (history && history.data) {
    const cnt = history.data.checkin_count || 0;
    const total = fmt(history.data.total_quota);
    console.log(`[猫羽雫签到] 📊 本月已签 ${cnt} 天 | 累计 ${total}`);
  }

  $done();
})();
