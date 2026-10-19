(() => {
  const form = document.getElementById('assistantForm');
  if (!form) return;
  const input = document.getElementById('assistantQuestion');
  const messages = document.getElementById('chatMessages');
  const status = document.getElementById('chatStatus');
  const count = document.getElementById('characterCount');
  const sendButton = document.getElementById('sendQuestionButton');
  const clearButton = document.getElementById('clearChatButton');
  const history = [];
  let welcome = messages.innerHTML;

  function safeText(text) { return String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function formatAnswer(text) {
    // Escape HTML first; then support simple readable paragraphs and bullets.
    const escaped = safeText(text.trim());
    return escaped.split(/\n{2,}/).map(block => {
      const lines = block.split('\n');
      if (lines.every(line => /^\s*[-*]\s+/.test(line))) return '<ul>' + lines.map(line => '<li>' + line.replace(/^\s*[-*]\s+/, '') + '</li>').join('') + '</ul>';
      return '<p>' + lines.join('<br>') + '</p>';
    }).join('');
  }
  function appendMessage(role, text, sources = []) {
    const article = document.createElement('article');
    article.className = `chat-message ${role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`;
    const avatar = document.createElement('div'); avatar.className = 'message-avatar'; avatar.textContent = role === 'user' ? 'YOU' : 'AI'; avatar.setAttribute('aria-hidden','true');
    const body = document.createElement('div'); body.className = 'message-body';
    const label = document.createElement('div'); label.className = 'message-label'; label.textContent = role === 'user' ? 'You' : 'Learning Assistant';
    const content = document.createElement('div'); content.className = 'message-content'; content.innerHTML = formatAnswer(text);
    body.append(label, content);
    if (sources.length && role !== 'user') {
      const sourceWrap = document.createElement('div'); sourceWrap.className = 'message-sources';
      const sourceTitle = document.createElement('strong'); sourceTitle.textContent = 'Knowledge files matched'; sourceWrap.append(sourceTitle);
      const list = document.createElement('ul'); sources.forEach(source => { const li = document.createElement('li'); li.textContent = source; list.append(li); }); sourceWrap.append(list); body.append(sourceWrap);
    }
    article.append(avatar, body); messages.append(article); messages.scrollTop = messages.scrollHeight;
  }
  function showTyping() {
    const el = document.createElement('div'); el.className = 'assistant-typing'; el.id = 'assistantTyping'; el.innerHTML = '<span></span><span></span><span></span><small>Checking the learning library…</small>'; messages.append(el); messages.scrollTop = messages.scrollHeight;
  }
  function removeTyping() { const el = document.getElementById('assistantTyping'); if (el) el.remove(); }
  input.addEventListener('input', () => { count.textContent = `${input.value.length} / 1800`; });
  input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); } });
  document.querySelectorAll('[data-question]').forEach(button => button.addEventListener('click', () => { input.value = button.dataset.question || ''; count.textContent = `${input.value.length} / 1800`; input.focus(); }));
  clearButton.addEventListener('click', () => { history.length = 0; messages.innerHTML = welcome; status.textContent = 'Conversation cleared'; input.focus(); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const question = input.value.trim(); if (!question) return;
    if (question.length > 1800) { status.textContent = 'Please shorten your question.'; return; }
    appendMessage('user', question);
    input.value = ''; count.textContent = '0 / 1800'; status.textContent = 'Thinking…'; sendButton.disabled = true; input.disabled = true; showTyping();
    try {
      const response = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ question, history }) });
      const data = await response.json().catch(() => ({})); removeTyping();
      if (!response.ok) throw new Error(data.error || 'The assistant could not answer right now.');
      appendMessage('assistant', data.answer, data.sources || []);
      history.push({ role:'user', text:question }, { role:'model', text:data.answer });
      while (history.length > 8) history.shift();
      status.textContent = data.knowledgeMatches ? `Found ${data.knowledgeMatches} relevant passage${data.knowledgeMatches === 1 ? '' : 's'}` : 'Answered without a direct library match';
    } catch (error) {
      removeTyping(); appendMessage('assistant', `I couldn't answer that right now. ${error.message}\n\nIf this is the first deployment, check that GEMINI_API_KEY is configured in Vercel and redeploy the site.`);
      status.textContent = 'Connection needs attention';
    } finally { sendButton.disabled = false; input.disabled = false; input.focus(); }
  });
})();