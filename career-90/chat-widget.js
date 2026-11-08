(() => {
  if (document.getElementById('career-ai-widget')) return;

  const style = document.createElement('style');
  style.textContent = `
    #career-ai-widget{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;position:fixed;right:22px;bottom:22px;z-index:99999;color:#1b2739}
    #career-ai-widget *{box-sizing:border-box}
    #career-ai-launcher{border:0;border-radius:999px;background:#15263d;color:#fff;padding:14px 19px;font-size:15px;font-weight:650;box-shadow:0 8px 26px #14223835;cursor:pointer}
    #career-ai-panel{display:none;position:absolute;right:0;bottom:64px;width:min(360px,calc(100vw - 32px));height: min(500px,calc(100vh - 110px));background:white;border:1px solid #e3e8ef;border-radius:16px;box-shadow:0 12px 40px #14223830;overflow:hidden;flex-direction:column}
    #career-ai-panel.open{display:flex}
    .career-ai-head{background:#15263d;color:white;padding:16px 18px;font-weight:700;display:flex;justify-content:space-between;align-items:center}
    .career-ai-close{border:0;background:transparent;color:white;font-size:23px;cursor:pointer}
    #career-ai-messages{padding:15px;overflow:auto;flex:1;background:#f7f8fa}
    .career-ai-msg{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.55;font-size:14px;padding:10px 12px;border-radius:12px;margin:0 0 10px;max-width:90%}
    .career-ai-msg.bot{background:white;border:1px solid #e8ebef}
    .career-ai-msg.user{background:#e8eef8;margin-left:auto}
    .career-ai-note{font-size:11px;color:#728094;padding:0 14px 8px;background:#f7f8fa}
    .career-ai-form{display:flex;gap:8px;padding:12px;border-top:1px solid #edf0f3}
    #career-ai-input{min-width:0;flex:1;border:1px solid #d8dee8;border-radius:9px;padding:10px;font:inherit}
    #career-ai-send{border:0;border-radius:9px;background:#15263d;color:#fff;padding:0 14px;cursor:pointer}
    #career-ai-send:disabled{opacity:.55;cursor:wait}
    @media(max-width:480px){#career-ai-widget{right:14px;bottom:14px}#career-ai-panel{right:-4px}}
  `;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'career-ai-widget';
  root.innerHTML = `
    <section id="career-ai-panel" aria-label="职业规划助手">
      <header class="career-ai-head"><span>90天职业规划助手</span><button class="career-ai-close" type="button" aria-label="关闭">×</button></header>
      <div id="career-ai-messages" aria-live="polite"></div>
      <div class="career-ai-note">请勿输入密码、身份证号等敏感信息。</div>
      <form class="career-ai-form"><input id="career-ai-input" maxlength="2000" placeholder="例如：我今天该先做什么？" autocomplete="off" aria-label="输入问题"><button id="career-ai-send" type="submit">发送</button></form>
    </section>
    <button id="career-ai-launcher" type="button" aria-expanded="false">✦ 职业规划助手</button>
  `;
  document.body.appendChild(root);

  const panel = root.querySelector('#career-ai-panel');
  const launcher = root.querySelector('#career-ai-launcher');
  const messages = root.querySelector('#career-ai-messages');
  const input = root.querySelector('#career-ai-input');
  const send = root.querySelector('#career-ai-send');

  const addMessage = (text, role) => {
    const item = document.createElement('div');
    item.className = `career-ai-msg ${role}`;
    item.textContent = text;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
    return item;
  };
  addMessage('你好！我可以陪你梳理目标、拆解每周行动。请告诉我你目前最想解决的职业问题。', 'bot');

  launcher.addEventListener('click', () => {
    const open = panel.classList.toggle('open');
    launcher.setAttribute('aria-expanded', String(open));
    if (open) input.focus();
  });
  root.querySelector('.career-ai-close').addEventListener('click', () => {
    panel.classList.remove('open');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus();
  });

  root.querySelector('.career-ai-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || send.disabled) return;
    addMessage(message, 'user');
    input.value = '';
    send.disabled = true;
    const pending = addMessage('正在思考…', 'bot');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `服务暂不可用（${response.status}）`);
      if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('暂时没有收到有效回复，请稍后再试。');
      pending.textContent = data.reply;
    } catch (error) {
      pending.textContent = `暂时无法连接 AI 服务：${error.message}。聊天界面已就绪，但需要部署安全的 /api/chat 后端才能启用 GPT。`;
    } finally {
      send.disabled = false;
      input.focus();
    }
  });
})();
