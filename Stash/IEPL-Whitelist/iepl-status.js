// Status only. No network requests and no browser trigger.
(function () {
  var state;
  try { state = JSON.parse($persistentStore.read('mkcloud.iepl.7586.v1.status') || '{}'); }
  catch (_) { state = {}; }
  $done({title: 'IEPL 白名单状态', icon: 'network',
    content: state.message ? state.message + '\n' + new Date(state.time).toLocaleString() : '等待自动检测；手动添加请运行本地脚本'});
})();
