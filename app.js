(() => {
  const tabs = {
    archive: document.getElementById('page-archive'),
    submit: document.getElementById('page-submit'),
    subs: document.getElementById('page-subs')
  };

  const claimList = document.getElementById('claimList');
  const subsList = document.getElementById('subsList');
  const subsEmpty = document.getElementById('subsEmpty');
  const filterCategory = document.getElementById('filterCategory');
  const archiveSearch = document.getElementById('archiveSearch');
  const detailModal = document.getElementById('detailModal');
  const detailBody = document.getElementById('detailBody');
  const closeDetail = document.getElementById('closeDetail');
  const openSubmit = document.getElementById('openSubmit');

  const { claims, loadSubs, saveSubs, loadHistory, saveHistory } = window.MockDB;

  let state = { query: '', category: '', subs: loadSubs(), history: loadHistory() };
  // Prefill user's API key if not set yet (stored locally only)
  (function ensureApiKeyPreset(){
    const preset = 'acc2ab06-023a-476c-af16-8fc813663274';
    if (!localStorage.getItem('ark_api_key')) {
      localStorage.setItem('ark_api_key', preset);
    }
    if (!localStorage.getItem('ark_model_id')) {
      localStorage.setItem('ark_model_id', 'doubao-seed-1-6-250615');
    }
  })();

  const verdictMap = {
    true: { label: '真实', c: '#16a34a' },
    partial: { label: '部分真实', c: '#f59e0b' },
    false: { label: '虚假', c: '#dc2626' },
    unknown: { label: '无法证伪', c: '#6b7280' }
  };

  function setActiveTab(key) {
    Object.entries(tabs).forEach(([k, el]) => { if (el) el.classList.toggle('hidden', k !== key); });
    document.querySelectorAll('.tab-btn').forEach(btn => {
      const active = btn.getAttribute('data-tab') === key;
      btn.classList.toggle('text-gold', active);
      btn.classList.toggle('text-slate-300', !active);
    });
    if (key === 'subs') renderSubs();
  }

  function formatBadge(verdict) {
    const v = verdictMap[verdict] || verdictMap.unknown;
    return `<span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style="background:${v.c}20;color:${v.c}"><i class=\"fa-solid fa-shield\"></i>${v.label}</span>`;
  }

  function isFollowed(id) { return state.subs.includes(id); }
  function toggleFollow(id) {
    state.subs = isFollowed(id) ? state.subs.filter(x => x !== id) : [...state.subs, id];
    saveSubs(state.subs);
    renderClaims();
    renderSubs();
  }

  function filterClaims() {
    const q = state.query.trim().toLowerCase();
    return claims.filter(c => (!q || c.title.toLowerCase().includes(q)) && (!state.category || c.category === state.category));
  }

  function renderClaims() {
    const list = filterClaims();
    if (!list.length) { claimList.innerHTML = `<div class="text-sm text-slate-300">未找到相关观点。</div>`; return; }
    claimList.innerHTML = list.map(c => {
      const followed = isFollowed(c.id);
      return `
      <article class="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-3 shadow-card">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="text-sm text-slate-300">#${c.category}</div>
            <h3 class="mt-0.5 font-medium leading-snug text-slate-100">${c.title}</h3>
          </div>
          <div class="text-right shrink-0">
            ${formatBadge(c.verdict)}
            <div class="text-xs text-slate-400 mt-1">可信度 ${c.confidence}</div>
          </div>
        </div>
        <div class="mt-2 text-sm text-slate-200/80 line-clamp-2">${c.evidence?.[0]?.excerpt || '—'}</div>
        <div class="mt-3 flex items-center justify-between">
          <button data-id="${c.id}" class="btn-detail text-gold text-sm">详情 <i class="fa-solid fa-chevron-right text-xs"></i></button>
          <div class="flex items-center gap-2">
            <button data-id="${c.id}" class="btn-follow text-sm ${followed ? 'text-gold' : 'text-slate-300'}"><i class="fa-${followed ? 'solid' : 'regular'} fa-bell"></i> ${followed ? '已订阅' : '订阅'}</button>
            <button class="text-slate-300 text-sm" onclick="navigator.share && navigator.share({title:'TruthGuard', text:'${c.title}', url: location.href}).catch(()=>{})"><i class="fa-solid fa-share-nodes"></i> 分享</button>
          </div>
        </div>
      </article>`;
    }).join('');
    claimList.querySelectorAll('.btn-detail').forEach(b => b.addEventListener('click', openDetail));
    claimList.querySelectorAll('.btn-follow').forEach(b => b.addEventListener('click', e => toggleFollow(e.currentTarget.getAttribute('data-id'))));
  }

  function renderSubs() {
    // Merge subscriptions and history; prioritize history view per需求
    const subClaims = claims.filter(c => isFollowed(c.id));
    const history = state.history.slice().reverse();
    const hasHistory = history.length > 0;
    subsEmpty.classList.toggle('hidden', hasHistory || subClaims.length > 0);
    // Build history cards
    const historyHtml = history.map(h => `
      <article class="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-3 shadow-card">
        <div class="text-xs text-slate-400">${h.time}</div>
        <h3 class="mt-1 font-medium leading-snug text-slate-100">${h.title}</h3>
        <div class="mt-1 flex items-center gap-2">${formatBadge(h.verdict)}<span class="text-xs text-slate-400">可信度 ${h.confidence}</span></div>
      </article>
    `).join('');

    const subsHtml = subClaims.map(c => `
      <article class="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-3 shadow-card">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-medium leading-snug text-slate-100">${c.title}</h3>
          ${formatBadge(c.verdict)}
        </div>
        <div class="mt-2 text-xs text-slate-400">最近更新：${c.updatedAt}</div>
        <div class="mt-3 flex items-center justify-end gap-2">
          <button data-id="${c.id}" class="btn-unfollow text-sm text-slate-300"><i class="fa-regular fa-bell-slash"></i> 取消订阅</button>
        </div>
      </article>
    `).join('');

    subsList.innerHTML = (hasHistory ? `<div class=\"mb-2 text-slate-300 text-sm\">历史记录</div>${historyHtml}` : '') + (subClaims.length ? `<div class=\"mt-4 mb-2 text-slate-300 text-sm\">我的订阅</div>${subsHtml}` : (hasHistory ? '' : ''));
    subsList.querySelectorAll('.btn-unfollow').forEach(b => b.addEventListener('click', e => toggleFollow(e.currentTarget.getAttribute('data-id'))));
  }

  function openDetail(e) {
    const id = e.currentTarget.getAttribute('data-id');
    const c = claims.find(x => x.id === id);
    if (!c) return;
    detailBody.innerHTML = `
      <div class="text-sm text-slate-500">#${c.category}</div>
      <h3 class="text-lg font-semibold">${c.title}</h3>
      <div class="mt-1 flex items-center gap-2">${formatBadge(c.verdict)}<span class="text-xs text-slate-500">可信度 ${c.confidence}</span></div>
      <div class="mt-2 text-sm text-slate-700">证据摘要：</div>
      <ul class="list-disc pl-5 text-sm text-slate-700">${(c.evidence||[]).map(ev => `<li>${ev.excerpt} <span class=\"text-xs text-slate-500\">（来源：${ev.source}）</span></li>`).join('')}</ul>
      <div class="mt-3 text-xs text-slate-500">更新时间：${c.updatedAt}</div>`;
    try { detailModal.showModal(); } catch { detailModal.setAttribute('open', ''); }
  }

  function closeDialogSafely(dialog) { try { dialog.close(); } catch {} if (dialog.hasAttribute('open')) dialog.removeAttribute('open'); }
  closeDetail.addEventListener('click', () => closeDialogSafely(detailModal));
  detailModal.addEventListener('click', (e) => { if (e.target === detailModal) closeDialogSafely(detailModal); });
  detailModal.addEventListener('cancel', (e) => { e.preventDefault(); closeDialogSafely(detailModal); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && detailModal.hasAttribute('open')) closeDialogSafely(detailModal); });

  // Search & filter
  filterCategory && filterCategory.addEventListener('change', () => { state.category = filterCategory.value; renderClaims(); });
  archiveSearch && archiveSearch.addEventListener('input', () => { state.query = archiveSearch.value; renderClaims(); });

  // Bottom nav
  document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => setActiveTab(btn.getAttribute('data-tab'))));
  openSubmit && openSubmit.addEventListener('click', () => setActiveTab('submit'));
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  clearHistoryBtn && clearHistoryBtn.addEventListener('click', () => {
    if (!confirm('确定要清空本地核查记录吗？')) return;
    state.history = [];
    saveHistory(state.history);
    renderSubs();
  });

  // Submit flow
  const submitForm = document.getElementById('submitForm');
  const submitResult = document.getElementById('submitResult');
  const inputImage = document.getElementById('inputImage');
  const inputVideoTitle = document.getElementById('inputVideoTitle');
  const analysisPanel = document.getElementById('analysisPanel');
  submitForm && submitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = document.getElementById('inputText').value.trim();
    const category = '其他';
    if (!text) return alert('目前仅支持文本内容核查');

    // Show analysis panel spinner
    analysisPanel && analysisPanel.classList.remove('hidden');
    submitResult.classList.add('hidden');

    const apiKey = (localStorage.getItem('ark_api_key') || '').trim();
    const modelId = (localStorage.getItem('ark_model_id') || 'doubao-seed-1-6-250615').trim();

    // 流式输出函数
    function streamText(element, text, delay = 30) {
      return new Promise((resolve) => {
        let i = 0;
        const interval = setInterval(() => {
          if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
          } else {
            clearInterval(interval);
            resolve();
          }
        }, delay);
      });
    }

    async function finish(score, verdict, explanationText, structuredData = null, conclusionText = text) {
      const id = `c_${Date.now()}`;
      const record = { id, title: text, verdict, confidence: score, time: new Date().toLocaleString(), explanation: explanationText || '' };
      state.history.push(record);
      saveHistory(state.history);
      analysisPanel && analysisPanel.classList.add('hidden');
      submitResult.classList.remove('hidden');
      
      // Format evidence as simple list if structured data is available
      let evidenceHtml = '';
      if (structuredData && structuredData.evidence && structuredData.evidence.length > 0) {
        evidenceHtml = '<div class="mt-3"><div class="text-sm font-bold text-slate-700 mb-2">证据：</div>';
        structuredData.evidence.forEach((item, index) => {
          evidenceHtml += `
            <div class="mb-2">
              <span class="text-sm text-slate-700">• </span>
              <span class="text-sm font-medium text-blue-600">${item.source}:</span>
              <span class="text-sm text-slate-700">${item.excerpt}</span>
            </div>
          `;
        });
        evidenceHtml += '</div>';
      }
      
      // 根据结果类型设置渐变背景
      let gradientColors;
      if (verdict === 'true') {
        gradientColors = 'from-white to-green-50';
      } else if (verdict === 'false') {
        gradientColors = 'from-white to-red-50';
      } else if (verdict === 'partial') {
        gradientColors = 'from-white to-amber-50';
      } else {
        gradientColors = 'from-white to-slate-50';
      }
      
      // 创建基础HTML结构
      submitResult.innerHTML = `
        <div class="flex items-start gap-3 bg-gradient-to-b ${gradientColors} rounded-xl p-4">
          <div class="grow">
            <div class="text-sm text-slate-500">结论</div>
            <div id="conclusionText" class="font-medium" style="color: ${verdict === 'true' ? '#16a34a' : verdict === 'false' ? '#dc2626' : '#1e293b'}"></div>
            <div class="mt-1 flex items-center gap-2">${formatBadge(verdict)}<span class="text-xs text-slate-500">可信度 ${score}</span></div>
            <div id="evidenceContainer"></div>
            <div id="explanationContainer"></div>
          </div>
          <button class="text-gold text-sm" onclick="document.querySelector('[data-tab=subs]').click()">查看我的真话单</button>
        </div>
        <p class="mt-2 text-xs text-slate-500">提示：此结论可能与事实不符（用作demo展示）</p>`;

      // 流式输出结论
      const conclusionElement = document.getElementById('conclusionText');
      await streamText(conclusionElement, conclusionText, 30);

      // 流式输出证据
      if (structuredData && structuredData.evidence && structuredData.evidence.length > 0) {
        const evidenceContainer = document.getElementById('evidenceContainer');
        evidenceContainer.innerHTML = '<div class="mt-3"><div class="text-sm font-bold text-slate-700 mb-2">证据：</div></div>';
        
        for (const item of structuredData.evidence) {
          const evidenceItem = document.createElement('div');
          evidenceItem.className = 'mb-2';
          // 提取并验证URL
          let displayUrl = null;
          if (item.url) {
            // 尝试从excerpt中提取URL（如果url字段无效）
            const urlMatch = (item.excerpt || '').match(/https?:\/\/[^\s]+/);
            displayUrl = item.url || (urlMatch ? urlMatch[0] : null);
          }
          
          // 基本URL验证
          const isValidUrl = displayUrl && 
                           (displayUrl.startsWith('http://') || displayUrl.startsWith('https://')) &&
                           displayUrl.includes('.') &&
                           displayUrl.length > 10;
          
          evidenceItem.innerHTML = `
            <span class="text-sm text-slate-700">• </span>
            ${isValidUrl ? 
              `<a href="${displayUrl}" target="_blank" class="text-sm font-medium text-blue-600 hover:underline">${item.source}:</a>` : 
              `<span class="text-sm font-medium text-blue-600">${item.source}:</span>`}
            <span class="text-sm text-slate-700">${item.excerpt}</span>

          `;
          evidenceContainer.appendChild(evidenceItem);
          await new Promise(resolve => setTimeout(resolve, 200)); // 证据条目之间的延迟
        }
      }

      // 流式输出说明
      if (explanationText) {
        const explanationContainer = document.getElementById('explanationContainer');
        explanationContainer.innerHTML = '<div class="mt-3"><div class="text-sm font-bold text-slate-700 mb-1">说明：</div><div id="explanationText" class="text-sm text-slate-700"></div></div>';
        await streamText(document.getElementById('explanationText'), explanationText, 20);
      }
      
      renderSubs();
    }

    if (!apiKey) {
      // Mock fallback
      setTimeout(() => {
        const score = Math.floor(40 + Math.random() * 50);
        const verdict = score > 80 ? 'true' : score > 60 ? 'partial' : score > 50 ? 'unknown' : 'false';
        finish(score, verdict);
      }, 1200);
      return;
    }

    // Direct API call to Volcano Ark
    const apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    
    // System prompt to ensure structured JSON response
    const systemPrompt = `仅输出 JSON，且字段固定如下，不要输出多余文本、前后缀或代码块围栏：
{
  "conclusion": "string",
  "verdict": "true|partial|false|unknown",
  "confidence": 0-100,
  "evidence": [
    {"source": "string", "url": "string", "excerpt": "string"}
  ],
  "reasoning": "string"
}

规范要求：
- conclusion：将用户的问题改写为肯定句结论
- verdict 取值说明：
  - true：结论为真；
  - partial：部分为真或条件成立；
  - false：结论为假；
  - unknown：无法证伪/证实或证据不足。
- confidence：给 0–100 的整数，代表对判断的确信程度
- evidence：列出 1–5 条可核查来源，优先权威机构/主流媒体/学术来源
- reasoning：用 30–120 字中文，概括关键判断链条，不重复 evidence 摘要`;

    // Real API call with timeout & abort
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased timeout to 30s
    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        model: modelId, 
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ] 
      }),
      signal: controller.signal
    })
    .then(res => res.json())
    .then(data => {
      clearTimeout(timeoutId);
      console.log('API Response:', data); // Debug log
      
      // Handle different API response formats
      let content = '';
      
      // Try OpenAI format first
      if (data?.choices?.[0]?.message?.content) {
        content = data.choices[0].message.content;
      }
      // Try direct content field
      else if (data?.content) {
        content = data.content;
      }
      // Try raw text field
      else if (data?.raw) {
        content = data.raw;
      }
      // Try message field
      else if (data?.message) {
        content = data.message;
      }
      // Fallback to string representation
      else if (typeof data === 'string') {
        content = data;
      }
      // Last resort: JSON stringify
      else {
        content = JSON.stringify(data, null, 2);
      }
      
      // Parse structured response if it's JSON
      let verdict = 'unknown';
      let confidence = 60 + Math.floor(Math.random() * 30);
      let structuredData = null;
      let evidence = [];
      let reasoning = '';
      let conclusion = text; // Default to original text
      
      // 简化URL验证逻辑
      const normalizeEvidence = (evidence) => {
        return evidence.map(item => ({
          source: item.source || '未知来源',
          url: item.url && 
               (item.url.startsWith('http://') || item.url.startsWith('https://')) &&
               item.url.includes('.') && // 基本域名验证
               item.url.length > 10 ? // 基本长度验证
               item.url : null,
          excerpt: item.excerpt || '无详细摘要'
        }));
      };
      
      console.log('Raw content:', content); // Debug log
      
      try {
        // Try to parse as JSON (in case it's a structured response)
        structuredData = JSON.parse(content);
        console.log('Parsed JSON:', structuredData); // Debug log
        if (structuredData.verdict) {
          verdict = structuredData.verdict;
          confidence = structuredData.confidence || confidence;
          evidence = normalizeEvidence(structuredData.evidence || []);
          reasoning = structuredData.reasoning || '';
          conclusion = structuredData.conclusion || text; // Use conclusion from model
          
          // Adjust confidence based on verdict for better user understanding
          if (verdict === 'false' && confidence > 70) {
            // If verdict is false but confidence is high, it means we're confident it's false
            // Keep the high confidence as it represents our confidence in the assessment
            console.log('High confidence in false verdict - this is correct');
          } else if (verdict === 'true' && confidence < 50) {
            // If verdict is true but confidence is low, adjust for clarity
            confidence = Math.max(confidence, 60);
          }
        }
      } catch (e) {
        console.log('Not JSON, trying text analysis:', e); // Debug log
        // Not JSON, use text analysis
        const textLower = content.toLowerCase();
        if (/真实|正确|属实|可信/.test(content)) verdict = 'true';
        else if (/虚假|错误|不实|谣言|夸大/.test(content)) verdict = 'false';
        else if (/部分|有一定|可能/.test(content)) verdict = 'partial';
        else if (/未知|不确定|无法判断/.test(content)) verdict = 'unknown';
      }
      
      // Format the explanation with structured data
      let explanationText = '';
      if (structuredData && structuredData.verdict) {
        explanationText = reasoning;
        // Remove evidence sources from reasoning if they exist
        if (explanationText.includes('证据来源:')) {
          explanationText = explanationText.split('证据来源:')[0].trim();
        }
        if (explanationText.includes('证据来源：')) {
          explanationText = explanationText.split('证据来源：')[0].trim();
        }
      } else {
        explanationText = content;
      }
      
      console.log('Final verdict:', verdict, 'confidence:', confidence); // Debug log
      finish(confidence, verdict, explanationText, structuredData, conclusion);
    })
    .catch(err => {
      clearTimeout(timeoutId);
      console.warn('调用方舟失败，回退本地mock', err);
      const score = Math.floor(40 + Math.random() * 50);
      const verdict = score > 80 ? 'true' : score > 60 ? 'partial' : score > 50 ? 'unknown' : 'false';
      finish(score, verdict);
    });
  });

  // 示例案例点击处理
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('example-case')) {
      const text = e.target.getAttribute('data-text');
      document.getElementById('inputText').value = text;
      
      // 隐藏所有示例案例和标题
      document.querySelectorAll('.example-case').forEach(btn => {
        btn.style.display = 'none';
      });
      // 隐藏"试试这些热门问题"标题
      const exampleSection = e.target.closest('.flex.flex-col.gap-3.mt-3');
      if (exampleSection) {
        const title = exampleSection.querySelector('p.text-sm.font-semibold.text-gold');
        if (title) {
          title.style.display = 'none';
        }
      }
      
      // 自动提交表单
      setTimeout(() => {
        document.getElementById('submitForm').dispatchEvent(new Event('submit', { bubbles: true }));
      }, 100);
    }
  });

  // Init
  renderClaims();
  renderSubs();
})();


