/* ==========================================================
   Tiger AI Admin Panel
   ----------------------------------------------------------
   Manages NVIDIA API configuration stored in Firebase at
   settings/aiConfig. Loads when the AI tab is opened.
   ========================================================== */

(function () {
  'use strict';

  // Available NVIDIA NIM models (from build.nvidia.com)
  // Grouped by capability. Each model is OpenAI-compatible.
  const NVIDIA_MODELS = [
    // Text / Chat
    {
      id: 'meta/llama-3.3-70b-instruct',
      type: 'نصي',
      name: 'Llama 3.3 70B',
      desc: 'متوازن وسريع — مثالي للمحادثات العامة وخدمة العملاء.'
    },
    {
      id: 'meta/llama-3.1-405b-instruct',
      type: 'نصي',
      name: 'Llama 3.1 405B',
      desc: 'أقوى نموذج نصي — جودة عالية جداً للمهام المعقدة.'
    },
    {
      id: 'meta/llama-3.1-70b-instruct',
      type: 'نصي',
      name: 'Llama 3.1 70B',
      desc: 'خيار اقتصادي سريع — جودة جيدة للمحادثات اليومية.'
    },
    {
      id: 'meta/llama-3.1-8b-instruct',
      type: 'نصي',
      name: 'Llama 3.1 8B',
      desc: 'الأسرع والأرخص — للردود الفورية والأسئلة البسيطة.'
    },
    {
      id: 'mistralai/mixtral-8x22b-instruct-v0.1',
      type: 'نصي',
      name: 'Mixtral 8x22B',
      desc: 'نموذج Mixture-of-Experts — قوي وفعّال في التكلفة.'
    },
    {
      id: 'qwen/qwen2.5-coder-32b-instruct',
      type: 'نصي',
      name: 'Qwen 2.5 Coder 32B',
      desc: 'متخصص في الكود والتحليل المنطقي.'
    },
    // Vision
    {
      id: 'meta/llama-3.2-90b-vision-instruct',
      type: 'رؤية',
      name: 'Llama 3.2 90B Vision',
      desc: 'يحلل الصور بدقة عالية — للبحث بالصور ووصف المنتجات.'
    },
    {
      id: 'meta/llama-3.2-11b-vision-instruct',
      type: 'رؤية',
      name: 'Llama 3.2 11B Vision',
      desc: 'رؤية سريعة واقتصادية — لتحليل الصور بسرعة.'
    },
    {
      id: 'microsoft/phi-3.5-vision-instruct',
      type: 'رؤية',
      name: 'Phi 3.5 Vision',
      desc: 'خفيف وسريع — لتحليل الصور البسيط.'
    },
    // Reasoning
    {
      id: 'deepseek-ai/deepseek-r1',
      type: 'تفكير',
      name: 'DeepSeek R1',
      desc: 'نموذج تفكير منطقي عميق — للتحليل والاستنتاج والمقارنات.'
    },
    {
      id: 'nvidia/llama-3.1-nemotron-70b-instruct',
      type: 'تفكير',
      name: 'Nemotron 70B',
      desc: 'من NVIDIA — متخصص في التفكير المنطقي والتحليل.'
    },
    {
      id: 'nvidia/llama-3.3-nemotron-super-49b-v1',
      type: 'تفكير',
      name: 'Nemotron Super 49B',
      desc: 'الأحدث من NVIDIA — توازن بين القوة والسرعة.'
    }
  ];

  const DEFAULT_CUSTOMER_PROMPT = `أنت "تايجر AI" — المساعد الذكي الرسمي لمتجر Tiger Jeans. مهمتك مساعدة العملاء في البحث عن المنتجات، الترشيح، الإطلالات الكاملة، خدمة العملاء، واقتراح المقاسات. اذكر دائماً: الاسم، السعر، المقاسات، الألوان، ورابط المنتج. لا تذكر أبداً تكلفة المنتج أو بيانات العملاء الآخرين. ردك بالعربية المصرية الواضحة.`;

  const DEFAULT_ADMIN_PROMPT = `أنت "تايجر AI" — المساعد الإداري لمتجر Tiger Jeans. لديك صلاحية كاملة لرؤية كل البيانات (التكلفة، الأرباح، الطلبات، العملاء). قدم تحليلات مبنية على الأرقام، تقارير سريعة، اقتراحات لتحسين الأرباح، ووصف SEO للمنتجات. استخدم Markdown لتنظيم الردود.`;

  let currentConfig = null;

  // ========= Init =========
  function initAiAdmin() {
    // Hook into existing switchTab
    const origSwitch = window.switchTab;
    if (typeof origSwitch === 'function') {
      window.switchTab = function (tab) {
        origSwitch.apply(this, arguments);
        if (tab === 'ai') loadAiSettings();
      };
    }

    // If AI tab is the initial tab, load
    setTimeout(() => {
      const aiTab = document.getElementById('tab-ai');
      if (aiTab && !aiTab.classList.contains('hidden')) loadAiSettings();
    }, 500);
  }

  // ========= Load settings from Firebase =========
  // Reads from two paths:
  //   aiConfig/public  — readable by all (enabled, models, features, advanced params)
  //   aiConfig/secret  — readable by admin only (apiKey, systemPrompt, adminSystemPrompt)
  async function loadAiSettings() {
    try {
      const [pubSnap, secSnap] = await Promise.all([
        db.ref('aiConfig/public').once('value'),
        db.ref('aiConfig/secret').once('value')
      ]);
      const pub = pubSnap.val() || {};
      const sec = secSnap.val() || {};

      currentConfig = {
        enabled: pub.enabled || false,
        textModel: pub.textModel || 'meta/llama-3.1-70b-instruct',
        visionModel: pub.visionModel || 'meta/llama-3.2-90b-vision-instruct',
        reasoningModel: pub.reasoningModel || 'deepseek-ai/deepseek-r1',
        maxTokens: pub.maxTokens || 1500,
        temperature: pub.temperature || 0.6,
        features: pub.features || {
          smartSearch: true,
          imageSearch: true,
          stylist: true,
          sizeAdvisor: true,
          cartSuggest: true,
          customerService: true,
          adminAnalytics: true,
          seoGenerator: true
        },
        apiKey: sec.apiKey || '',
        systemPrompt: sec.systemPrompt || DEFAULT_CUSTOMER_PROMPT,
        adminSystemPrompt: sec.adminSystemPrompt || DEFAULT_ADMIN_PROMPT
      };

      renderAiSettings(currentConfig);
    } catch (e) {
      console.error('loadAiSettings error:', e);
      if (typeof showToast === 'function') showToast('خطأ في تحميل إعدادات AI: ' + e.message);
    }
  }

  // ========= Render =========
  function renderAiSettings(cfg) {
    // Status pill
    const statusEl = document.getElementById('aiStatusPill');
    if (statusEl) {
      if (cfg.enabled && cfg.apiKey) {
        statusEl.className = 'ai-status-pill ok';
        statusEl.innerHTML = '<i class=\'bx bx-check-circle\'></i> مُفعّل';
      } else if (cfg.enabled && !cfg.apiKey) {
        statusEl.className = 'ai-status-pill pending';
        statusEl.innerHTML = '<i class=\'bx bx-error\'></i> يحتاج مفتاح API';
      } else {
        statusEl.className = 'ai-status-pill err';
        statusEl.innerHTML = '<i class=\'bx bx-x-circle\'></i> معطّل';
      }
    }

    // Basic fields
    setVal('aiEnabled', !!cfg.enabled);
    setVal('aiApiKey', cfg.apiKey || '');
    setVal('aiTextModel', cfg.textModel || 'meta/llama-3.1-70b-instruct');
    setVal('aiVisionModel', cfg.visionModel || 'meta/llama-3.2-90b-vision-instruct');
    setVal('aiReasoningModel', cfg.reasoningModel || 'deepseek-ai/deepseek-r1');
    setVal('aiSystemPrompt', cfg.systemPrompt || DEFAULT_CUSTOMER_PROMPT);
    setVal('aiAdminSystemPrompt', cfg.adminSystemPrompt || DEFAULT_ADMIN_PROMPT);
    setVal('aiMaxTokens', cfg.maxTokens || 1500);
    setVal('aiTemperature', cfg.temperature || 0.6);

    // Render model cards (visual selection)
    renderModelCards('aiTextModels', NVIDIA_MODELS.filter(m => m.type === 'نصي'), cfg.textModel, 'aiTextModel');
    renderModelCards('aiVisionModels', NVIDIA_MODELS.filter(m => m.type === 'رؤية'), cfg.visionModel, 'aiVisionModel');
    renderModelCards('aiReasoningModels', NVIDIA_MODELS.filter(m => m.type === 'تفكير'), cfg.reasoningModel, 'aiReasoningModel');

    // Features toggles
    const features = cfg.features || {};
    setVal('aiFeatSmartSearch', features.smartSearch !== false);
    setVal('aiFeatImageSearch', features.imageSearch !== false);
    setVal('aiFeatStylist', features.stylist !== false);
    setVal('aiFeatSizeAdvisor', features.sizeAdvisor !== false);
    setVal('aiFeatCartSuggest', features.cartSuggest !== false);
    setVal('aiFeatCustomerService', features.customerService !== false);
    setVal('aiFeatAdminAnalytics', features.adminAnalytics !== false);
    setVal('aiFeatSeoGenerator', features.seoGenerator !== false);
  }

  function setVal(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!val;
    else el.value = val;
  }

  function getVal(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    if (el.type === 'checkbox') return el.checked;
    return el.value;
  }

  function renderModelCards(containerId, models, selectedId, inputId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = models.map(m => `
      <div class="ai-model-card ${m.id === selectedId ? 'selected' : ''}" data-model="${m.id}" data-input="${inputId}">
        <span class="ai-model-type">${m.type}</span>
        <h4>${m.name}</h4>
        <p>${m.desc}</p>
        <code style="font-size:.68rem;color:var(--text-dim);display:block;margin-top:.4rem;word-break:break-all">${m.id}</code>
      </div>
    `).join('');
    container.querySelectorAll('.ai-model-card').forEach(card => {
      card.addEventListener('click', () => {
        const modelId = card.dataset.model;
        const targetInputId = card.dataset.input;
        container.querySelectorAll('.ai-model-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const input = document.getElementById(targetInputId);
        if (input) input.value = modelId;
      });
    });
  }

  // ========= Save =========
  // Splits config into two Firebase paths:
  //   aiConfig/public  — readable by all clients (no secrets)
  //   aiConfig/secret  — readable by admin only (API key, system prompts)
  async function saveAiSettings() {
    const cfg = {
      enabled: getVal('aiEnabled'),
      apiKey: (getVal('aiApiKey') || '').trim(),
      textModel: getVal('aiTextModel') || 'meta/llama-3.1-70b-instruct',
      visionModel: getVal('aiVisionModel') || 'meta/llama-3.2-90b-vision-instruct',
      reasoningModel: getVal('aiReasoningModel') || 'deepseek-ai/deepseek-r1',
      systemPrompt: getVal('aiSystemPrompt') || DEFAULT_CUSTOMER_PROMPT,
      adminSystemPrompt: getVal('aiAdminSystemPrompt') || DEFAULT_ADMIN_PROMPT,
      maxTokens: parseInt(getVal('aiMaxTokens')) || 1500,
      temperature: parseFloat(getVal('aiTemperature')) || 0.6,
      features: {
        smartSearch: getVal('aiFeatSmartSearch'),
        imageSearch: getVal('aiFeatImageSearch'),
        stylist: getVal('aiFeatStylist'),
        sizeAdvisor: getVal('aiFeatSizeAdvisor'),
        cartSuggest: getVal('aiFeatCartSuggest'),
        customerService: getVal('aiFeatCustomerService'),
        adminAnalytics: getVal('aiFeatAdminAnalytics'),
        seoGenerator: getVal('aiFeatSeoGenerator')
      }
    };

    if (cfg.enabled && !cfg.apiKey) {
      if (typeof showToast === 'function') showToast('أدخل مفتاح NVIDIA API أولاً');
      return;
    }

    // Public part — no secrets, safe for all clients to read
    const publicPart = {
      enabled: cfg.enabled,
      textModel: cfg.textModel,
      visionModel: cfg.visionModel,
      reasoningModel: cfg.reasoningModel,
      maxTokens: cfg.maxTokens,
      temperature: cfg.temperature,
      features: cfg.features,
      updatedAt: Date.now()
    };

    // Secret part — admin only
    const secretPart = {
      apiKey: cfg.apiKey,
      systemPrompt: cfg.systemPrompt,
      adminSystemPrompt: cfg.adminSystemPrompt,
      updatedAt: Date.now()
    };

    try {
      // Save both in parallel
      await Promise.all([
        db.ref('aiConfig/public').set(publicPart),
        db.ref('aiConfig/secret').set(secretPart)
      ]);
      currentConfig = cfg;

      // Update TigerAI runtime if loaded
      if (window.TigerAI && window.TigerAI.reloadConfig) {
        await window.TigerAI.reloadConfig();
      }

      // Update status pill
      renderAiSettings(cfg);

      if (typeof showToast === 'function') showToast('تم حفظ إعدادات AI بنجاح ✓');
    } catch (e) {
      console.error('saveAiSettings error:', e);
      if (typeof showToast === 'function') showToast('خطأ في الحفظ: ' + e.message);
    }
  }

  // ========= Test connection =========
  async function testAiConnection() {
    const apiKey = (getVal('aiApiKey') || '').trim();
    const model = getVal('aiTextModel') || 'meta/llama-3.1-70b-instruct';
    const resultEl = document.getElementById('aiTestResult');

    if (!apiKey) {
      if (typeof showToast === 'function') showToast('أدخل مفتاح API أولاً');
      return;
    }

    resultEl.classList.remove('ok', 'err');
    resultEl.classList.add('show');
    resultEl.textContent = 'جاري الاتصال بـ NVIDIA...';

    try {
      const result = await window.TigerAI.testNvidiaConnection(apiKey, model);
      if (result.ok) {
        resultEl.classList.add('ok');
        resultEl.textContent = `✓ نجح الاتصال!\n\nالنموذج: ${model}\nالرد: ${result.content}\n\nملاحظة: المفتاح صالح ويعمل بشكل صحيح.`;
      } else {
        resultEl.classList.add('err');
        resultEl.textContent = `✗ فشل الاتصال\n\nالخطأ: ${result.error}\n\nتحقق من:\n1. صحة مفتاح API من https://build.nvidia.com/settings/integrations\n2. اتصال الإنترنت\n3. أن النموذج المختار متاح لحسابك`;
      }
    } catch (e) {
      resultEl.classList.add('err');
      resultEl.textContent = `✗ خطأ غير متوقع: ${e.message}`;
    }
  }

  // ========= Reset prompts =========
  function resetCustomerPrompt() {
    if (!confirm('استعادة البرومبت الافتراضي للعملاء؟')) return;
    setVal('aiSystemPrompt', DEFAULT_CUSTOMER_PROMPT);
    if (typeof showToast === 'function') showToast('تم الاستعادة');
  }

  function resetAdminPrompt() {
    if (!confirm('استعادة البرومبت الافتراضي للأدمن؟')) return;
    setVal('aiAdminSystemPrompt', DEFAULT_ADMIN_PROMPT);
    if (typeof showToast === 'function') showToast('تم الاستعادة');
  }

  // ========= Public API =========
  window.TigerAIAdmin = {
    init: initAiAdmin,
    load: loadAiSettings,
    save: saveAiSettings,
    test: testAiConnection,
    resetCustomerPrompt,
    resetAdminPrompt
  };

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAiAdmin);
  } else {
    initAiAdmin();
  }
})();
