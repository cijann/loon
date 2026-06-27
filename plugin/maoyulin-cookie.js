/************************************
 * 猫羽雫 Cookie 抓取脚本
 * 适配: Loon (http-response)
 *
 * 从服务器响应头的 Set-Cookie 中抓取 session
 * 由插件「是否开启抓Cookie」开关控制启用
 * ⚠️ 必须调用 $done({}) 放行响应，否则网站打不开
 ************************************/

const STORE_KEY = "maoyulin_session";

let session = "";

// 从响应头的 Set-Cookie 里捞 session
// $response.headers 是对象，Set-Cookie 可能是字符串或数组
if ($response && $response.headers) {
  let setCookie = $response.headers["set-cookie"] || $response.headers["Set-Cookie"] || "";
  // 多个 Set-Cookie 时可能是数组
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const cookie of cookies) {
    if (!cookie) continue;
    const match = cookie.match(/session=([^;]+)/);
    if (match) {
      session = match[1];
      break;
    }
  }
}

// 备用：响应体里也可能返回 session（部分 NewAPI 实现）
if (!session && $response.body) {
  try {
    const body = JSON.parse($response.body);
    if (body && body.data && body.data.session) {
      session = body.data.session;
    }
  } catch (e) {}
}

if (session) {
  const prev = typeof $persistentStore !== "undefined" ? $persistentStore.read(STORE_KEY) : "";
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

// ⚠️ 必须放行响应，否则网站打不开
$done({});
