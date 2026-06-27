/************************************
 * 猫羽雫 Cookie 抓取脚本
 * 适配: Loon (http-request)
 *
 * ⚠️ 必须调用 $done() 放行请求，否则网站打不开
 * 由插件「是否开启抓Cookie」开关控制启用
 ************************************/

const STORE_KEY = "maoyulin_session";

// 从请求头里捞 session cookie
const rawCookie = ($request.headers && ($request.headers.Cookie || $request.headers.cookie)) || "";
const match = rawCookie.match(/(?:^|;\s*)session=([^;]+)/);

if (match) {
  const session = match[1];
  const prev = typeof $persistentStore !== "undefined" ? $persistentStore.read(STORE_KEY) : "";

  // 值没变就跳过，避免重复通知
  if (session !== prev) {
    if (typeof $persistentStore !== "undefined") {
      $persistentStore.write(session, STORE_KEY);
    }
    const preview = session.length > 24 ? session.substring(0, 24) + "..." : session;
    console.log(`[猫羽雫抓Cookie] ✅ 已存储 session=${preview}`);

    if (typeof $notification !== "undefined") {
      $notification.post("猫羽雫 🍪 已抓取", "签到脚本可用", `session=${preview}`);
    }
  }
}

// ⚠️ 必须调用 $done() 放行请求，否则网站打不开
$done();
