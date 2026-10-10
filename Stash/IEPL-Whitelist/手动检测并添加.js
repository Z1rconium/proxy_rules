// Uses Stash APIs only. All external requests explicitly select DIRECT.
(function () {
  var FORCE_MANUAL = true; // Dedicated editor script sets this to true.
  var API = "https://www.mkcloud.net/index.php?m=provincewhitelist&hosting_id=7586";
  var KEY = ''; // 首次在 Stash 本地填入 API Key；请勿提交密钥到 GitHub
  var KEY_STORE = 'mkcloud.iepl.7586.api-key';
  if (KEY) $persistentStore.write(KEY, KEY_STORE);
  KEY = KEY || $persistentStore.read(KEY_STORE) || '';
  var STORE = 'mkcloud.iepl.7586.v1';
  var MANUAL_URL = "http://www.mkcloud.net/iepl-whitelist-trigger/2ebbf7e4c17c03ee644144f1";
  var isTile = typeof $script !== 'undefined' && $script.type === 'tile';
  var isRequest = typeof $request !== 'undefined';
  var owner = String(Date.now()) + '-' + Math.random();
  function read(suffix) {
    try { return JSON.parse($persistentStore.read(STORE + suffix) || '{}'); }
    catch (_) { return {}; }
  }
  function write(suffix, value) {
    return $persistentStore.write(JSON.stringify(value), STORE + suffix);
  }
  function finish(ok, message) {
    console.log('[IEPL] ' + message);
    if (isRequest) {
      $done({response: {status: ok ? 200 : 503,
        headers: {'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store'},
        body: message + '\n'}});
    } else if (isTile) {
      $done({title: 'IEPL 白名单', content: message, icon: 'network', url: MANUAL_URL});
    } else { $done(); }
  }
  if (isTile) {
    var state = read('.status');
    finish(true, state.message ? state.message + '\n' + new Date(state.time).toLocaleString() : '等待检测；点击面板手动添加');
    return;
  }
  if (!KEY) {
    var hint = '请先在 Stash 本地填写 API Key，再手动执行一次';
    write('.status', {time: Date.now(), message: hint});
    finish(false, hint);
    return;
  }
  var lock = read('.lock');
  var lockAge = Date.now() - (lock.time || 0);
  if (lock.owner && lockAge >= 0 && lockAge < 60000) {
    finish(false, '已有检测任务运行中，请稍后重试');
    return;
  }
  // Best-effort guard across Stash script runtimes; not an atomic mutex.
  write('.lock', {owner: owner, time: Date.now()});
  function publicV4(value) {
    var s = String(value).trim();
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) return null;
    var p = s.split('.').map(Number);
    if (p.some(function (n) { return n > 255; })) return null;
    var a = p[0], b = p[1], c = p[2];
    if (a === 0 || a === 10 || a === 127 || a >= 224 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) || (a === 192 && b === 0 && (c === 0 || c === 2)) ||
        (a === 192 && b === 88 && c === 99) ||
        (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
        (a === 203 && b === 0 && c === 113)) return null;
    return p.join('.');
  }
  function safeError(error) {
    var value;
    try {
      value = typeof error === 'string' ? error : (error.message || JSON.stringify(error) || String(error));
    } catch (_) { value = String(error); }
    if (KEY) value = value.split(KEY).join('[已隐藏密钥]');
    return value.replace(/pwl_[A-Za-z0-9_-]+/g, '[已隐藏密钥]').slice(0, 300);
  }
  function http(method, url, body, label) {
    return new Promise(function (resolve, reject) {
      var headers = {'X-Stash-Selected-Proxy': 'DIRECT', 'Cache-Control': 'no-cache'};
      if (method === 'post') {
        headers['X-API-Key'] = KEY;
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
      var limit = method === 'post' ? 20 : 8;
      var started = Date.now();
      var opts = {url: url, headers: headers, timeout: limit, insecure: false,
        'auto-cookie': false, 'auto-redirect': false};
      if (body !== undefined) opts.body = body;
      $httpClient[method](opts, function (error, response, data) {
        var status = Number((response || {}).status || (response || {}).statusCode);
        // A completed HTTP error response is different from transport failure.
        if (status >= 100 && status <= 599) {
          resolve({status: status, data: data});
          return;
        }
        var elapsed = ((Date.now() - started) / 1000).toFixed(1);
        reject(new Error(label + '直连请求失败（' + elapsed + ' 秒）：' +
          (error ? safeError(error) : '未收到有效 HTTP 状态码')));
      });
    });
  }
  async function detect() {
    var sources = ['https://api.ipify.org', 'https://ipv4.icanhazip.com'];
    var failures = [];
    for (var i = 0; i < sources.length; i++) {
      try {
        var r = await http('get', sources[i] + '?t=' + Date.now(), undefined, 'IPv4 检测源 ' + (i + 1));
        var ip = publicV4(r.data);
        if (r.status === 200 && ip) return ip;
        failures.push('检测源 ' + (i + 1) + '：HTTP ' + r.status + ' 或非公网 IPv4');
      } catch (error) { failures.push(error.message); }
    }
    throw new Error('无法获取公网 IPv4；' + failures.join('；'));
  }
  async function run() {
    var ip = await detect();
    var saved = read('.success');
    var age = Date.now() - (saved.time || 0);
    var force = FORCE_MANUAL || isRequest || (typeof $argument !== 'undefined' && $argument === 'manual');
    if (!force && saved.ip === ip && age >= 0 && age < 1800000) {
      return 'IP 未变化：' + ip;
    }
    var r = await http('post', API, 'api=1&api_action=add_whitelist&ip=' + encodeURIComponent(ip), 'API 添加（www.mkcloud.net）');
    if (r.status === 401 || r.status === 403) {
      throw new Error('API 认证或访问被拒绝（HTTP ' + r.status + '）；请核对当前 API Key、hosting_id 或服务端访问限制');
    }
    var data;
    try { data = JSON.parse(r.data); }
    catch (_) { throw new Error('API 返回非 JSON（HTTP ' + r.status + '）'); }
    if (r.status !== 200 || !data || String(data.code) !== '0') {
      throw new Error('API 未确认成功（HTTP ' + r.status + '）；请在服务商后台核对');
    }
    if (!write('.success', {ip: ip, time: Date.now()})) {
      return '已加入：' + ip + '；缓存保存失败，下次会重新确认';
    }
    return '已确认加入白名单：' + ip + (data.removed_ip ? '；服务端已轮换旧条目，请在后台核对' : '');
  }
  function release() {
    if (read('.lock').owner === owner) write('.lock', {});
  }
  run().then(function (message) {
    write('.status', {time: Date.now(), message: message});
    release();
    if (FORCE_MANUAL) $notification.post('IEPL 白名单', '手动检测完成', message);
    finish(true, message);
  }).catch(function (error) {
    // Only locally generated errors are shown; never reflect an API body or key.
    var message = error.message;
    write('.status', {time: Date.now(), message: message});
    release();
    if (!isRequest) $notification.post('IEPL 白名单', '检测或添加失败', message);
    finish(false, message);
  });
})();
