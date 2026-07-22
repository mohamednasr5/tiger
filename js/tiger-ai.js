/* ==========================================================
   Tiger AI Assistant — NVIDIA API Integration
   ----------------------------------------------------------
   Self-contained widget. Loads AI config from Firebase
   (aiConfig/public + aiConfig/secret). Supports text, image
   (vision), and reasoning models. Auto-detects admin mode
   from URL. Does NOT modify any existing site functionality.
   ========================================================== */

(function () {
  'use strict';

  // ========= Config =========
  const TIGER_AI_VERSION = '1.0.0';
  // Public path: readable by all clients (just enabled flag + model names + features)
  const TIGER_AI_PUBLIC_PATH = 'aiConfig/public';
  // Secret path: readable only by authenticated admin (API key + system prompts)
  const TIGER_AI_SECRET_PATH = 'aiConfig/secret';
  const TIGER_AI_HISTORY_KEY = 'tj_ai_history';
  const TIGER_AI_OPEN_KEY = 'tj_ai_open';

  // ========= Dismiss State (sessionStorage) =========
  const TIGER_AI_DISMISSED_KEY = 'tj_ai_dismissed';
  let aiConfig = null;            // { enabled, apiKey, textModel, visionModel, reasoningModel, systemPrompt, adminSystemPrompt, features }
  let chatHistory = [];           // [{role, content}]
  let isWaiting = false;
  let attachedImage = null;       // { dataUrl, mimeType } or null
  let isAdminMode = false;
  let productsCache = null;       // cached products list (with stock)
  let productsCacheTime = 0;
  let allProductsSnapshot = null;
  let allOrdersSnapshot = null;

  // ========= Utilities =========
  function detectAdminMode() {
    return /admin\.html/i.test(location.pathname) ||
           /[?&]admin=1\b/.test(location.search);
  }

  function getDb() {
    // Use globally available Firebase db from js/config.js or inline scripts
    try { if (typeof db !== 'undefined' && db) return db; } catch (_) {}
    if (typeof window.db !== 'undefined' && window.db) return window.db;
    if (typeof firebase !== 'undefined' && firebase.database) {
      try { return firebase.database(); } catch (_) { return null; }
    }
    return null;
  }

  function fmtPrice(n) {
    return Number(n || 0).toLocaleString('ar-EG') + ' ج.م';
  }

  function isFirebaseReady() {
    if (typeof firebase === 'undefined') return false;
    try { if (typeof db !== 'undefined' && db) return true; } catch (_) {}
    if (typeof window.db !== 'undefined' && window.db) return true;
    return false;
  }

  // Dynamically load Firebase + config.js if not already present on the page.
  // This lets us add <script src="js/tiger-ai.js"> to ANY page (even pure
  // content pages like about.html) and have the assistant work.
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // Already loaded?
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === '1') return resolve();
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Failed: ' + src)));
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.async = false; // preserve order
      s.onload = () => { s.dataset.loaded = '1'; resolve(); };
      s.onerror = () => reject(new Error('Failed: ' + src));
      document.head.appendChild(s);
    });
  }

  async function ensureFirebaseLoaded() {
    // If Firebase + db global already available, skip
    if (typeof firebase !== 'undefined') {
      try {
        if (typeof db !== 'undefined' && db) return;
      } catch (_) {}
      if (typeof window.db !== 'undefined' && window.db) return;
    }
    try {
      if (typeof firebase === 'undefined') {
        await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
        await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js');
        await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js');
      }
      // Check again before loading config.js (in case Firebase was loaded but db not yet)
      try {
        if (typeof db !== 'undefined' && db) return;
      } catch (_) {}
      if (typeof window.db === 'undefined') {
        await loadScript('js/config.js');
      }
    } catch (e) {
      console.log('[TigerAI] ensureFirebaseLoaded error:', e);
    }
  }

  // Load AI config from Firebase
  // - Public part: always readable (enabled flag, model names, features, advanced params)
  // - Secret part: only readable when authenticated (API key, system prompts)
  // For customer pages: we only need the public part to know if AI is enabled.
  // For admin: we need both.
  async function loadAiConfig() {
    const db = getDb();
    if (!db) return null;
    try {
      // Always read public config
      const publicSnap = await db.ref(TIGER_AI_PUBLIC_PATH).once('value');
      const publicCfg = publicSnap.val() || null;

      if (!publicCfg) {
        aiConfig = null;
        return null;
      }

      // Try to read secret config (will only succeed if authenticated as admin)
      let secretCfg = {};
      try {
        const secretSnap = await db.ref(TIGER_AI_SECRET_PATH).once('value');
        secretCfg = secretSnap.val() || {};
      } catch (e) {
        // Customer without permission — that's fine, just no API key on client side
        secretCfg = {};
      }

      // Merge: secret fields are only available when admin
      aiConfig = {
        ...publicCfg,
        apiKey: secretCfg.apiKey || '',
        systemPrompt: secretCfg.systemPrompt || '',
        adminSystemPrompt: secretCfg.adminSystemPrompt || ''
      };
      return aiConfig;
    } catch (e) {
      console.log('[TigerAI] loadAiConfig error:', e);
      return null;
    }
  }

  // Load products with stock (cache for 60s)
  async function loadProducts(force = false) {
    const db = getDb();
    if (!db) return [];
    const now = Date.now();
    if (!force && productsCache && (now - productsCacheTime) < 60000) {
      return productsCache;
    }
    try {
      const snap = await db.ref('products').once('value');
      const val = snap.val() || {};
      allProductsSnapshot = Object.entries(val).map(([id, p]) => ({ id, ...p }));
      productsCache = allProductsSnapshot;
      productsCacheTime = now;
      return allProductsSnapshot;
    } catch (e) {
      console.log('[TigerAI] loadProducts error:', e);
      return [];
    }
  }

  // Load orders (admin only)
  async function loadOrders() {
    const db = getDb();
    if (!db) return [];
    try {
      const snap = await db.ref('orders').once('value');
      const val = snap.val() || {};
      allOrdersSnapshot = Object.entries(val).map(([id, o]) => ({ id, ...o }));
      return allOrdersSnapshot;
    } catch (e) {
      return [];
    }
  }

  // Load settings (shipping rates, promo codes, banners)
  async function loadStoreSettings() {
    const db = getDb();
    if (!db) return {};
    try {
      const snap = await db.ref('settings').once('value');
      return snap.val() || {};
    } catch (e) {
      return {};
    }
  }

  // ========= NVIDIA API =========
  // Docs: https://docs.api.nvidia.com/nim/reference
  // OpenAI-compatible endpoint at https://integrate.api.nvidia.com/v1/chat/completions

  const NVIDIA_BASE = 'https://tigerorder.studegy10.workers.dev/v1';

  /**
   * Calls NVIDIA NIM chat completions API.
   * @param {Object} params - { apiKey, model, messages, temperature, maxTokens, topP, stream }
   * @returns {Promise<{content:string, reasoning:string, raw:Object}>}
   */
  async function callNvidiaAPI(params) {
    const {
      apiKey,
      model,
      messages,
      temperature = 0.6,
      maxTokens = 1500,
      topP = 0.95,
      stream = false
    } = params;

    if (!apiKey) throw new Error('مفتاح NVIDIA API غير مُدخل. فضلاً اضبطه من لوحة التحكم.');
    if (!model) throw new Error('لم يتم اختيار نموذج. فضلاً اضبطه من لوحة التحكم.');

    const body = {
      model,
      messages,
      temperature,
      top_p: topP,
      max_tokens: maxTokens,
      stream: !!stream
    };

    const resp = await fetch(`${NVIDIA_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': stream ? 'text/event-stream' : 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      let errText = '';
      try { errText = await resp.text(); } catch (_) {}
      let msg = `NVIDIA API error ${resp.status}`;
      try {
        const j = JSON.parse(errText);
        if (j.detail || j.message || j.error) msg = j.detail || j.message || (j.error && j.error.message) || msg;
      } catch (_) {
        if (errText) msg = errText.slice(0, 200);
      }
      throw new Error(msg);
    }

    if (stream) {
      // Parse SSE stream — return full text after stream completes
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let fullReasoning = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const obj = JSON.parse(data);
            const delta = obj.choices && obj.choices[0] && obj.choices[0].delta;
            if (delta) {
              if (delta.reasoning_content) fullReasoning += delta.reasoning_content;
              if (delta.content) fullContent += delta.content;
              // Live update callback could be added here
            }
          } catch (_) {}
        }
      }
      return { content: fullContent, reasoning: fullReasoning, raw: null };
    } else {
      const data = await resp.json();
      const choice = data.choices && data.choices[0];
      const msg = choice && choice.message ? choice.message : {};
      return {
        content: msg.content || '',
        reasoning: msg.reasoning_content || '',
        raw: data
      };
    }
  }

  // Test NVIDIA API connection
  async function testNvidiaConnection(apiKey, model) {
    try {
      const r = await callNvidiaAPI({
        apiKey,
        model: model || 'meta/llama-3.1-70b-instruct',
        messages: [
          { role: 'system', content: 'You are a test endpoint. Reply with "OK" only.' },
          { role: 'user', content: 'ping' }
        ],
        maxTokens: 10,
        temperature: 0.1
      });
      return { ok: true, content: r.content, raw: r.raw };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // ========= Context Builder =========
  // Builds a "context" object passed to the AI in the system prompt
  // For customers: hides costPrice, customer PII, sales analytics
  // For admin: includes everything

  async function buildCustomerContext() {
    const products = await loadProducts();
    // Filter to active products only
    const active = products.filter(p => p.active !== false);

    // Public-safe product list
    const productList = active.map(p => {
      const stock = p.stock || {};
      const stockSummary = Object.entries(stock)
        .filter(([k, v]) => v > 0)
        .map(([k, v]) => {
          const [size, color] = k.split('_');
          return `${size}/${color}:${v}`;
        })
        .slice(0, 15)
        .join(', ');
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        oldPrice: p.oldPrice || null,
        category: p.category || '',
        sizes: p.sizes || [],
        colors: (p.colors || []).map(c => typeof c === 'string' ? c : c.name).filter(Boolean),
        description: (p.description || '').slice(0, 200),
        featured: !!p.featured,
        isNew: !!p.isNew,
        stockAvailable: stockSummary || 'غير متوفر',
        image: (p.images && p.images[0]) || ''
      };
    });

    const settings = await loadStoreSettings();
    const cart = typeof getCart === 'function' ? getCart() : [];

    return {
      mode: 'customer',
      storeName: 'Tiger Jeans',
      storeUrl: location.origin,
      currentPage: location.pathname,
      cart: cart.map(c => ({
        name: c.name,
        price: c.price,
        qty: c.qty,
        size: c.size,
        color: c.color
      })),
      cartTotal: cart.reduce((s, c) => s + c.price * c.qty, 0),
      products: productList,
      productCount: productList.length,
      storeSettings: {
        shippingNote: settings.shippingNote || 'الشحن لجميع محافظات مصر',
        promoActive: settings.promoActive || false,
        socialLinks: {
          facebook: settings.facebook || '',
          instagram: settings.instagram || '',
          whatsapp: settings.whatsapp || '',
          tiktok: settings.tiktok || ''
        }
      }
    };
  }

  async function buildAdminContext() {
    const products = await loadProducts(true);
    const orders = await loadOrders();
    const settings = await loadStoreSettings();

    // Aggregate stats
    const totalSales = orders.reduce((s, o) => s + (o.total || 0), 0);
    const pendingOrders = orders.filter(o => (o.status || 'pending') === 'pending').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

    // Best sellers
    const productSales = {};
    orders.forEach(o => {
      (o.items || []).forEach(it => {
        const key = it.name || it.id;
        if (!productSales[key]) productSales[key] = { name: it.name, qty: 0, revenue: 0 };
        productSales[key].qty += it.qty || 1;
        productSales[key].revenue += (it.price || 0) * (it.qty || 1);
      });
    });
    const bestSellers = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 10);

    // Low stock alert
    const lowStock = [];
    products.forEach(p => {
      const stock = p.stock || {};
      Object.entries(stock).forEach(([k, v]) => {
        if (v <= 5) {
          const [size, color] = k.split('_');
          lowStock.push({ product: p.name, size, color, qty: v });
        }
      });
    });

    return {
      mode: 'admin',
      storeName: 'Tiger Jeans',
      storeUrl: location.origin,
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        costPrice: p.costPrice || 0,
        oldPrice: p.oldPrice || null,
        category: p.category || '',
        sizes: p.sizes || [],
        colors: (p.colors || []).map(c => typeof c === 'string' ? c : c.name).filter(Boolean),
        description: p.description || '',
        active: p.active !== false,
        featured: !!p.featured,
        isNew: !!p.isNew,
        stock: p.stock || {},
        profit: p.costPrice ? (p.price - p.costPrice) : p.price
      })),
      orders: orders.map(o => ({
        id: o.id,
        code: o.code,
        customer: o.customer || {},
        total: o.total,
        status: o.status || 'pending',
        payment: o.payment || {},
        createdAt: o.createdAt,
        items: o.items || [],
        trackingNumber: o.trackingNumber || '',
        shippingCompany: o.shippingCompany || ''
      })),
      stats: {
        totalOrders: orders.length,
        totalSales,
        pendingOrders,
        deliveredOrders,
        cancelledOrders,
        bestSellers,
        lowStock: lowStock.slice(0, 20),
        avgOrderValue: orders.length ? totalSales / orders.length : 0
      },
      settings: settings
    };
  }

  // ========= System Prompts =========
  function getDefaultCustomerPrompt() {
    return `أنت "تايجر AI" — المساعد الذكي الرسمي لمتجر Tiger Jeans (تايجر جينز) — متجر بناطيل جينز وملابس عصرية في مصر.

## مهمتك:
مساعدة العميل في:
1. البحث عن المنتجات والترشيح الذكي حسب احتياجه (مقاس، لون، مناسبة، ميزانية، أسلوب).
2. الإجابة عن أسئلة المنتجات (المواصفات، المقاسات، الألوان، التوفر، السعر).
3. اقتراح إطلالات كاملة (بنطلون + قميص + حذاء + إكسسوار) من المنتجات المتوفرة فقط.
4. خدمة العملاء: الشحن، الدفع، الاستبدال والاسترجاع، تتبع الطلب، طرق الدفع المتاحة.
5. اقتراح المقاس المناسب بناءً على الطول والوزن والعمر وشكل الجسم.
6. مقارنة المنتجات إذا طلب العميل ذلك.
7. ترشيح منتجات مكملة للسلة لزيادة قيمة الطلب (Cross-sell).

## القواعد الصارمة:
- ابحث دائماً في products الموجودة في السياق ولا تخترع منتجات غير موجودة.
- اذكر السعر بصيغة: "X ج.م" فقط من بيانات المنتج.
- لا تذكر أبداً: تكلفة المنتج (costPrice)، أرباح المتجر، بيانات العملاء الآخرين، معلومات الطلبات الداخلية، إعدادات الأدمن، أو أي بيانات إدارية.
- إذا لم تجد المنتج المطلوب، اعتذر بأدب واعرض بدائل متوفرة.
- إذا سأل العميل عن شيء غير متوفر في السياق، اعتذر بصدق ولا تخمن.
- لكل منتج تترشحه، اذكر: الاسم + السعر + المقاسات المتاحة + الألوان + رابط المنتج product.html?id=ID.
- ردودك يجب أن تكون بالعربية المصرية الواضحة، ودودة ومهنية.
- استخدم Markdown (عناوين، قوائم، تنسيق) لجعل الرد مقروءاً.
- لا تذكر أبداً أنك نموذج لغوي أو AI — أنت مساعد المتجر.
- إذا أرفق العميل صورة، حللها وابحث عن منتجات مشابهة في المتجر.

## معلومات المتجر:
- الاسم: Tiger Jeans (تايجر جينز)
- الدولة: مصر
- الشحن: لجميع محافظات مصر
- طرق الدفع: فودافون كاش، انستاباي، الدفع عند الاستلام، بطاقات الهدايا
- سياسة الاسترجاع: 14 يوم من الاستلام`;

  }

  function getDefaultAdminPrompt() {
    return `أنت "تايجر AI" — المساعد الإداري الذكي لمتجر Tiger Jeans. تعمل مع مالك المتجر أو الأدمن فقط.

## مهمتك:
1. تحليل أداء المتجر (المبيعات، الطلبات، العملاء، المنتجات).
2. تقارير سريعة: أكثر المنتجات مبيعاً، الطلبات المتأخرة، المنتجات منخفضة المخزون.
3. المساعدة في إدارة الطلبات (الحالات، التتبع، المبالغ).
4. اقتراحات لتحسين الأرباح والتسعير.
5. توليد أوصاف منتجات احترافية و SEO.
6. الإجابة عن أي استفسار إداري بناءً على البيانات المتاحة.

## القواعد:
- لديك صلاحية كاملة لرؤية كل البيانات: الأسعار، التكلفة (costPrice)، الأرباح، بيانات العملاء، الطلبات، الإعدادات.
- قدم تحليلات مبنية على الأرقام الفعلية في السياق.
- استخدم Markdown لتنظيم الردود (جداول، قوائم، تنسيق).
- إذا سألك الأدمن عن شيء غير موجود في السياق، اعتذر بصدق.
- لا تقترح أبداً تعديل أو حذف بيانات مباشرة — أنت للاستشارة والتحليل فقط.
- اذكر دائماً الأرقام بالجنيه المصري (ج.م).
- ردودك بالعربية الفصحى المبسطة أو المصرية حسب طلب الأدمن.

## بيانات السياق المتاحة:
- products: كل المنتجات مع التكلفة والأرباح والمخزون.
- orders: كل الطلبات مع بيانات العملاء والتنفيذ.
- stats: إحصائيات مجمعة (إجمالي المبيعات، أفضل المنتجات، المخزون المنخفض).
- settings: إعدادات المتجر (الشحن، الدفع، البانرات، إلخ).`;
  }

  function buildSystemPrompt() {
    if (!aiConfig) return isAdminMode ? getDefaultAdminPrompt() : getDefaultCustomerPrompt();
    const basePrompt = isAdminMode
      ? (aiConfig.adminSystemPrompt || getDefaultAdminPrompt())
      : (aiConfig.systemPrompt || getDefaultCustomerPrompt());
    return basePrompt;
  }

  // ========= Message Building =========
  async function buildMessages(userText, image) {
    const systemPrompt = buildSystemPrompt();
    const context = isAdminMode ? await buildAdminContext() : await buildCustomerContext();

    // System message with context
    const systemMsg = {
      role: 'system',
      content: `${systemPrompt}

## السياق الحالي للمتجر (JSON):
\`\`\`json
${JSON.stringify(context).slice(0, 50000)}
\`\`\`

استخدم هذا السياق للإجابة على سؤال العميل. إذا كنت ستذكر منتج، اذكر id الخاص به لإنشاء رابط صحيح.`
    };

    // User message
    let userMsg;
    if (image) {
      // Vision model message format
      userMsg = {
        role: 'user',
        content: [
          { type: 'text', text: userText || 'حلل هذه الصورة وابحث عن منتجات مشابهة في المتجر.' },
          { type: 'image_url', image_url: { url: image.dataUrl } }
        ]
      };
    } else {
      userMsg = { role: 'user', content: userText };
    }

    // Include last 6 turns of history (trimmed)
    const trimmedHistory = chatHistory.slice(-6);

    return {
      messages: [systemMsg, ...trimmedHistory, userMsg],
      context
    };
  }

  // ========= UI: Render =========
  let root, launcher, panel, messagesEl, textarea, sendBtn, attachInput, attachRow;
  let dropZone = null; // the × drop target shown on long-press

  function injectStylesheet() {
    if (document.getElementById('tiger-ai-css')) return;
    const link = document.createElement('link');
    link.id = 'tiger-ai-css';
    link.rel = 'stylesheet';
    link.href = 'css/tiger-ai.css';
    document.head.appendChild(link);
  }

  function buildUI() {
    injectStylesheet();

    root = document.createElement('div');
    root.className = 'tj-ai-root';
    root.innerHTML = `
      <button class="tj-ai-launcher" id="tjAiLauncher" aria-label="Tiger AI" title="اسأل Tiger AI">
        <span class="tj-ai-pulse"></span>
        <i class='bx bx-bot'></i>
      </button>

      <div class="tj-ai-drop-zone" id="tjAiDropZone">
        <div class="tj-ai-drop-zone-inner">
          <i class='bx bx-x'></i>
        </div>
      </div>

      <div class="tj-ai-panel" id="tjAiPanel" role="dialog" aria-label="Tiger AI Assistant">
        <div class="tj-ai-header">
          <div class="tj-ai-avatar"><i class='bx bx-bot'></i></div>
          <div class="tj-ai-header-info">
            <h3>تايجر AI</h3>
            <span>متصل الآن</span>
          </div>
          <div class="tj-ai-header-actions">
            <button id="tjAiClear" title="محادثة جديدة"><i class='bx bx-message-square-add'></i></button>
            <button id="tjAiClose" title="إغلاق"><i class='bx bx-x'></i></button>
          </div>
        </div>

        <div class="tj-ai-quick" id="tjAiQuick">
          <button class="tj-ai-quick-chip" data-prompt="عاوز بنطلون جينز أزرق مقاس 34 يناسب الصيف"><i class='bx bx-search'></i> بحث ذكي</button>
          <button class="tj-ai-quick-chip" data-prompt="اقترحلي إطلالة كاملة لمناسبة رسمية"><i class='bx bx-t-shirt'></i> إطلالة كاملة</button>
          <button class="tj-ai-quick-chip" data-prompt="إيه طرق الدفع المتاحة في المتجر؟"><i class='bx bx-credit-card'></i> طرق الدفع</button>
          <button class="tj-ai-quick-chip" data-prompt="إيه سياسة الاسترجاع والاستبدال؟"><i class='bx bx-undo'></i> الاسترجاع</button>
          <button class="tj-ai-quick-chip" data-prompt="ازاي أعرف مقاسي الصح؟"><i class='bx bx-ruler'></i> دليل المقاسات</button>
          <button class="tj-ai-quick-chip" data-prompt="إيه أكثر المنتجات مبيعاً؟"><i class='bx bx-trophy'></i> الأكثر مبيعاً</button>
        </div>

        <div class="tj-ai-messages" id="tjAiMessages"></div>

        <div class="tj-ai-input-wrap">
          <div class="tj-ai-input-attach-row" id="tjAiAttachRow"></div>
          <div class="tj-ai-input-row">
            <textarea id="tjAiTextarea" placeholder="اكتب سؤالك أو ارفع صورة..." rows="1"></textarea>
            <input type="file" id="tjAiFile" accept="image/*" style="display:none" />
            <button class="tj-ai-input-btn" id="tjAiAttach" title="رفع صورة"><i class='bx bx-image-add'></i></button>
            <button class="tj-ai-input-btn tj-ai-send" id="tjAiSend" title="إرسال"><i class='bx bx-send'></i></button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    // Wire up
    launcher = root.querySelector('#tjAiLauncher');
    panel = root.querySelector('#tjAiPanel');
    messagesEl = root.querySelector('#tjAiMessages');
    textarea = root.querySelector('#tjAiTextarea');
    sendBtn = root.querySelector('#tjAiSend');
    attachInput = root.querySelector('#tjAiFile');
    attachRow = root.querySelector('#tjAiAttachRow');
    dropZone = root.querySelector('#tjAiDropZone');

    // Customize quick prompts for admin mode
    if (isAdminMode) {
      const quickEl = root.querySelector('#tjAiQuick');
      quickEl.innerHTML = `
        <button class="tj-ai-quick-chip" data-prompt="اعرض ملخص أداء المتجر اليوم"><i class='bx bx-line-chart'></i> ملخص الأداء</button>
        <button class="tj-ai-quick-chip" data-prompt="إيه أكثر المنتجات مبيعاً هذا الشهر؟"><i class='bx bx-trophy'></i> الأكثر مبيعاً</button>
        <button class="tj-ai-quick-chip" data-prompt="إيه الطلبات المتأخرة أو المعلقة؟"><i class='bx bx-time-five'></i> الطلبات المتأخرة</button>
        <button class="tj-ai-quick-chip" data-prompt="إيه المنتجات اللي مخزونها منخفض؟"><i class='bx bx-error'></i> مخزون منخفض</button>
        <button class="tj-ai-quick-chip" data-prompt="احسبلي إجمالي الأرباح وصافي الربح"><i class='bx bx-wallet'></i> الأرباح</button>
        <button class="tj-ai-quick-chip" data-prompt="اكتبلي وصف SEO لمنتج جينز رجالي كلاسيك"><i class='bx bx-pencil'></i> توليد وصف</button>
      `;
    }

    bindEvents();
  }

  function bindEvents() {
    launcher.addEventListener('click', togglePanel);
    root.querySelector('#tjAiClose').addEventListener('click', closePanel);
    root.querySelector('#tjAiClear').addEventListener('click', clearChat);

    // Quick prompts
    root.querySelectorAll('.tj-ai-quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const p = chip.dataset.prompt;
        textarea.value = p;
        autoResize();
        sendMessage();
      });
    });

    // Send on Enter (without shift)
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    textarea.addEventListener('input', autoResize);

    sendBtn.addEventListener('click', sendMessage);

    // Attach image
    root.querySelector('#tjAiAttach').addEventListener('click', () => attachInput.click());
    attachInput.addEventListener('change', onFileSelected);

    // Persist open state
    if (sessionStorage.getItem(TIGER_AI_OPEN_KEY) === '1') {
      openPanel();
    }

    // Init draggable + long-press dismiss
    initDragDismiss();
  }

  // ========= Draggable + Long-Press Dismiss =========
  function initDragDismiss() {
    const btn = launcher;
    if (!btn) return;

    let isDragging = false;
    let hasMoved = false;
    let longPressTimer = null;
    let startX = 0, startY = 0;
    let offsetX = 0, offsetY = 0;
    let btnRect = null;
    let isDismissing = false; // true when long-press activated

    const LONG_PRESS_MS = 500;
    const MOVE_THRESHOLD = 8;

    // Switch to using top/left positioning for drag
    function switchToAbsolutePos() {
      const rect = btn.getBoundingClientRect();
      btn.style.left = rect.left + 'px';
      btn.style.top = rect.top + 'px';
      btn.style.right = 'auto';
      btn.style.bottom = 'auto';
      btn.classList.add('tj-ai-dragging-pos');
    }

    // On pointer down
    function onPointerDown(e) {
      if (isDismissing) return;
      // Don't interfere with click-to-open when panel is closed
      const touch = e.touches ? e.touches[0] : e;
      startX = touch.clientX;
      startY = touch.clientY;
      hasMoved = false;
      isDragging = false;
      btnRect = btn.getBoundingClientRect();
      offsetX = touch.clientX - btnRect.left;
      offsetY = touch.clientY - btnRect.top;

      // Start long-press timer
      longPressTimer = setTimeout(() => {
        if (!hasMoved) {
          isDismissing = true;
          switchToAbsolutePos();
          dropZone.classList.add('tj-ai-drop-zone-show');
          btn.classList.add('tj-ai-dismiss-mode');
          // Vibrate if supported
          if (navigator.vibrate) navigator.vibrate(50);
        }
      }, LONG_PRESS_MS);
    }

    // On pointer move
    function onPointerMove(e) {
      const touch = e.touches ? e.touches[0] : e;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (!hasMoved && Math.sqrt(dx * dx + dy * dy) > MOVE_THRESHOLD) {
        hasMoved = true;
        // Cancel long-press if we moved before it fired
        if (!isDismissing) {
          clearTimeout(longPressTimer);
        }
      }

      if (!isDismissing) return;

      e.preventDefault();
      isDragging = true;

      const x = touch.clientX - offsetX;
      const y = touch.clientY - offsetY;

      // Clamp to viewport
      const maxX = window.innerWidth - btn.offsetWidth;
      const maxY = window.innerHeight - btn.offsetHeight;
      const clampedX = Math.max(0, Math.min(x, maxX));
      const clampedY = Math.max(0, Math.min(y, maxY));

      btn.style.left = clampedX + 'px';
      btn.style.top = clampedY + 'px';

      // Check proximity to drop zone for visual feedback
      const dzRect = dropZone.getBoundingClientRect();
      const btnCenterX = clampedX + btn.offsetWidth / 2;
      const btnCenterY = clampedY + btn.offsetHeight / 2;
      const dzCenterX = dzRect.left + dzRect.width / 2;
      const dzCenterY = dzRect.top + dzRect.height / 2;
      const dist = Math.sqrt(Math.pow(btnCenterX - dzCenterX, 2) + Math.pow(btnCenterY - dzCenterY, 2));
      const activateDist = 90;

      if (dist < activateDist) {
        dropZone.classList.add('tj-ai-drop-zone-near');
        btn.classList.add('tj-ai-near-drop');
      } else {
        dropZone.classList.remove('tj-ai-drop-zone-near');
        btn.classList.remove('tj-ai-near-drop');
      }
    }

    // On pointer up
    function onPointerUp(e) {
      clearTimeout(longPressTimer);

      if (!isDismissing) {
        // Normal tap — let the click event fire for togglePanel
        return;
      }

      // Check if dropped on the zone
      const dzRect = dropZone.getBoundingClientRect();
      const btnRect2 = btn.getBoundingClientRect();
      const btnCX = btnRect2.left + btnRect2.width / 2;
      const btnCY = btnRect2.top + btnRect2.height / 2;
      const dzCX = dzRect.left + dzRect.width / 2;
      const dzCY = dzRect.top + dzRect.height / 2;
      const dist = Math.sqrt(Math.pow(btnCX - dzCX, 2) + Math.pow(btnCY - dzCY, 2));

      if (dist < 90) {
        // Dismiss the assistant
        dismissAssistant();
      } else {
        // Snap back / keep new position
        snapToEdge();
      }

      // Cleanup
      isDismissing = false;
      isDragging = false;
      dropZone.classList.remove('tj-ai-drop-zone-show', 'tj-ai-drop-zone-near');
      btn.classList.remove('tj-ai-dismiss-mode', 'tj-ai-near-drop');
    }

    // Snap button to nearest horizontal edge
    function snapToEdge() {
      const rect = btn.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      const edgePadding = 18;
      const minY = 10;
      const maxY = window.innerHeight - rect.height - 10;
      const targetY = Math.max(minY, Math.min(rect.top, maxY));

      if (midX < window.innerWidth / 2) {
        btn.style.left = edgePadding + 'px';
      } else {
        btn.style.left = (window.innerWidth - rect.width - edgePadding) + 'px';
      }
      btn.style.top = targetY + 'px';
    }

    // Dismiss: hide entire root, mark in sessionStorage
    function dismissAssistant() {
      sessionStorage.setItem(TIGER_AI_DISMISSED_KEY, '1');
      // Animate out
      btn.style.transition = 'transform .3s ease, opacity .3s ease';
      btn.style.transform = 'scale(0.3)';
      btn.style.opacity = '0';
      dropZone.classList.remove('tj-ai-drop-zone-show', 'tj-ai-drop-zone-near');
      setTimeout(() => {
        if (root) root.classList.add('tj-ai-hidden');
      }, 320);
    }

    // Prevent default click (toggle panel) after drag
    btn.addEventListener('click', function (e) {
      if (isDragging || isDismissing) {
        e.preventDefault();
        e.stopPropagation();
        isDragging = false;
      }
    }, true);

    // Touch events
    btn.addEventListener('touchstart', onPointerDown, { passive: true });
    btn.addEventListener('touchmove', onPointerMove, { passive: false });
    btn.addEventListener('touchend', onPointerUp);
    btn.addEventListener('touchcancel', onPointerUp);

    // Mouse events (for desktop)
    btn.addEventListener('mousedown', onPointerDown);
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);
  }

  function togglePanel() {
    if (panel.classList.contains('show')) closePanel();
    else openPanel();
  }

  function openPanel() {
    panel.classList.add('show');
    sessionStorage.setItem(TIGER_AI_OPEN_KEY, '1');
    setTimeout(() => textarea.focus(), 300);
    // Show welcome message if first time
    if (messagesEl.children.length === 0) {
      showWelcomeMessage();
    }
  }

  function closePanel() {
    panel.classList.remove('show');
    sessionStorage.removeItem(TIGER_AI_OPEN_KEY);
  }

  function autoResize() {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  function showWelcomeMessage() {
    const greeting = isAdminMode
      ? 'مرحباً 👋 أنا تايجر AI — مساعدك الإداري. اسألني عن المبيعات، الطلبات، المخزون، أو اطلب تحليلات لأي جزء في المتجر.'
      : 'أهلاً بيك في تايجر جينز! 🐯 أنا مساعدك الذكي للتسوق. اسألني عن أي منتج، اطلب إطلالة كاملة، أو ارفع صورة وأنا هلاقي لك المنتجات المشابهة.';
    addAiMessage(greeting, false);
  }

  // ========= UI: Messages =========
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Very lightweight Markdown -> HTML (safe-ish)
  function markdownToHtml(md) {
    if (!md) return '';
    let html = md;
    // Code blocks ```lang\n...```
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (m, lang, code) =>
      `<pre><code>${escapeHtml(code)}</code></pre>`);
    // Inline code `code`
    html = html.replace(/`([^`]+)`/g, (m, c) => `<code>${escapeHtml(c)}</code>`);
    // Bold **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic *text* (not **)
    html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    // Headings
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^#\s+(.+)$/gm, '<h3>$1</h3>');
    // Unordered lists
    html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>');
    // Ordered lists
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="ol-item">$1</li>');
    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // Paragraphs
    html = html.split(/\n\n+/).map(block => {
      if (block.startsWith('<') || block.trim() === '') return block;
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    }).join('');
    return html;
  }

  function addUserMessage(text, image) {
    const msg = document.createElement('div');
    msg.className = 'tj-ai-msg tj-ai-msg-user';
    msg.innerHTML = `
      <div class="tj-ai-msg-avatar"><i class='bx bx-user'></i></div>
      <div class="tj-ai-msg-bubble">
        ${image ? `<div class="tj-ai-attachment"><img src="${image.dataUrl}" alt="" /></div>` : ''}
        ${escapeHtml(text)}
      </div>
    `;
    messagesEl.appendChild(msg);
    scrollToBottom();
  }

  function addAiMessage(html, saveToHistory = true, reasoning = '') {
    const msg = document.createElement('div');
    msg.className = 'tj-ai-msg tj-ai-msg-ai';
    msg.innerHTML = `
      <div class="tj-ai-msg-avatar"><i class='bx bx-bot'></i></div>
      <div class="tj-ai-msg-bubble">
        ${reasoning ? `
          <div class="tj-ai-reasoning">
            <div class="tj-ai-reasoning-label"><i class='bx bx-brain'></i> التفكير المنطقي</div>
            ${escapeHtml(reasoning).slice(0, 600)}${reasoning.length > 600 ? '…' : ''}
          </div>
        ` : ''}
        ${typeof html === 'string' ? markdownToHtml(html) : html}
      </div>
    `;
    messagesEl.appendChild(msg);
    scrollToBottom();

    if (saveToHistory && typeof html === 'string') {
      chatHistory.push({ role: 'assistant', content: html });
      saveHistory();
    }
  }

  function showTyping() {
    const msg = document.createElement('div');
    msg.className = 'tj-ai-msg tj-ai-msg-ai';
    msg.id = 'tjAiTyping';
    msg.innerHTML = `
      <div class="tj-ai-msg-avatar"><i class='bx bx-bot'></i></div>
      <div class="tj-ai-msg-bubble">
        <div class="tj-ai-typing"><span></span><span></span><span></span></div>
      </div>
    `;
    messagesEl.appendChild(msg);
    scrollToBottom();
  }

  function hideTyping() {
    const t = document.getElementById('tjAiTyping');
    if (t) t.remove();
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showDisabled(message) {
    const msg = document.createElement('div');
    msg.className = 'tj-ai-msg tj-ai-msg-ai';
    msg.innerHTML = `
      <div class="tj-ai-msg-avatar"><i class='bx bx-bot'></i></div>
      <div class="tj-ai-msg-bubble">
        <div class="tj-ai-disabled">
          <i class='bx bx-bot'></i>
          <b>المساعد الذكي غير مُفعّل حالياً</b>
          ${escapeHtml(message || 'برجاء تفعيله من لوحة التحكم -> مساعد AI.')}
        </div>
      </div>
    `;
    messagesEl.appendChild(msg);
    scrollToBottom();
  }

  // ========= File Attach =========
  function onFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      if (typeof showToast === 'function') showToast('صورة فقط مدعومة حالياً');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      if (typeof showToast === 'function') showToast('حجم الصورة كبير (الحد 8MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      attachedImage = { dataUrl: reader.result, mimeType: file.type, name: file.name };
      renderAttachRow();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function renderAttachRow() {
    if (!attachedImage) {
      attachRow.classList.remove('show');
      attachRow.innerHTML = '';
      return;
    }
    attachRow.classList.add('show');
    attachRow.innerHTML = `
      <div class="tj-ai-attach-pill">
        <img src="${attachedImage.dataUrl}" alt="" />
        <span>${escapeHtml(attachedImage.name || 'صورة')}</span>
        <button id="tjAiRemoveAttach" title="إزالة"><i class='bx bx-x'></i></button>
      </div>
    `;
    attachRow.querySelector('#tjAiRemoveAttach').addEventListener('click', () => {
      attachedImage = null;
      renderAttachRow();
    });
  }

  // ========= Send Message =========
  async function sendMessage() {
    if (isWaiting) return;
    const text = textarea.value.trim();
    if (!text && !attachedImage) return;

    // Check config
    if (!aiConfig || aiConfig.enabled === false) {
      addUserMessage(text, attachedImage);
      showDisabled(isAdminMode
        ? 'فعّل المساعد من تبويب "مساعد AI" في الأعلى.'
        : 'المساعد قيد الصيانة، حاول مرة أخرى لاحقاً.');
      return;
    }
    if (!aiConfig.apiKey) {
      addUserMessage(text, attachedImage);
      showDisabled('مفتاح API غير مُدخل. تواصل مع إدارة المتجر.');
      return;
    }

    // Choose model
    let model = aiConfig.textModel || 'meta/llama-3.1-70b-instruct';
    if (attachedImage) {
      model = aiConfig.visionModel || 'meta/llama-3.2-90b-vision-instruct';
    }
    // If user message starts with "حلل" or asks for deep analysis → use reasoning model
    const wantsReasoning = /حلل|حلل |فكر|استنتج|قارن بين|ايه الافضل|ما الافضل|/i.test(text) && aiConfig.reasoningModel;
    // Note: reasoning model is opt-in via explicit setting

    addUserMessage(text, attachedImage);

    // Add to history
    if (text) {
      chatHistory.push({ role: 'user', content: text });
      saveHistory();
    }

    textarea.value = '';
    autoResize();
    const currentImage = attachedImage;
    attachedImage = null;
    renderAttachRow();

    isWaiting = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      const { messages } = await buildMessages(text, currentImage);

      const result = await callNvidiaAPI({
        apiKey: aiConfig.apiKey,
        model,
        messages,
        temperature: 0.6,
        maxTokens: 1500,
        topP: 0.95,
        stream: false
      });

      hideTyping();

      let content = (result.content || '').trim();
      if (!content) {
        content = 'معلش، ماقدرتش أجيب رد. حاول مرة تانية بصيغة مختلفة.';
      }
      addAiMessage(content, true, result.reasoning || '');
    } catch (err) {
      hideTyping();
      console.error('[TigerAI] error:', err);
      let errMsg = err.message || 'حصل خطأ غير متوقع.';
      if (/401|403|unauthor/i.test(errMsg)) errMsg = 'مفتاح NVIDIA API غير صالح. تواصل مع إدارة المتجر.';
      if (/429|rate/i.test(errMsg)) errMsg = 'تم تجاوز حد الطلبات. حاول بعد دقيقة.';
      if (/5\d\d/.test(errMsg)) errMsg = 'مشكلة مؤقتة في خوادم NVIDIA. حاول مرة أخرى.';
      addAiMessage(`⚠️ حصل خطأ: ${escapeHtml(errMsg)}`, false);
    } finally {
      isWaiting = false;
      sendBtn.disabled = false;
    }
  }

  function clearChat() {
    chatHistory = [];
    sessionStorage.removeItem(TIGER_AI_HISTORY_KEY);
    messagesEl.innerHTML = '';
    showWelcomeMessage();
  }

  function saveHistory() {
    try {
      // Keep last 20 messages only
      if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
      sessionStorage.setItem(TIGER_AI_HISTORY_KEY, JSON.stringify(chatHistory));
    } catch (_) {}
  }

  function loadHistory() {
    try {
      const saved = sessionStorage.getItem(TIGER_AI_HISTORY_KEY);
      if (saved) chatHistory = JSON.parse(saved) || [];
    } catch (_) { chatHistory = []; }
  }

  // ========= Init =========
  async function init() {
    if (window.__tigerAIInitStarted) return;
    window.__tigerAIInitStarted = true;

    isAdminMode = detectAdminMode();

    // Auto-load Firebase + config.js if missing (for static content pages)
    await ensureFirebaseLoaded();

    // Wait for Firebase to be ready
    let tries = 0;
    while (!isFirebaseReady() && tries < 30) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
    if (!isFirebaseReady()) {
      console.log('[TigerAI] Firebase not ready, aborting');
      return;
    }

    // Don't show on admin login lock screen
    if (isAdminMode && document.querySelector('.admin-lock:not([style*="display: none"])') && !document.querySelector('.admin-layout:not([style*="display: none"])')) {
      // We're on admin page but not logged in yet — wait
      const observer = new MutationObserver(() => {
        if (document.querySelector('.admin-layout') && getComputedStyle(document.querySelector('.admin-layout')).display !== 'none') {
          observer.disconnect();
          continueInit();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
      setTimeout(() => { observer.disconnect(); continueInit(); }, 8000);
      return;
    }

    continueInit();
  }

  async function continueInit() {
    // Check if assistant was dismissed in this session
    if (sessionStorage.getItem(TIGER_AI_DISMISSED_KEY) === '1') {
      console.log('[TigerAI] Assistant dismissed this session, skipping init');
      return;
    }

    loadHistory();
    buildUI();

    // Load config
    await loadAiConfig();

    // Hide launcher if disabled and not admin (admin still sees it for config)
    if (aiConfig && aiConfig.enabled === false && !isAdminMode) {
      launcher.style.display = 'none';
    }
  }

  // ========= Public API (for admin panel) =========
  window.TigerAI = {
    version: TIGER_AI_VERSION,
    init,
    loadAiConfig,
    saveAiConfig: async function (cfg) {
      // Deprecated — admin panel handles its own save via tiger-ai-admin.js
      // Kept for backward compatibility
      const db = getDb();
      if (!db) throw new Error('Firebase not ready');
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
      const secretPart = {
        apiKey: cfg.apiKey,
        systemPrompt: cfg.systemPrompt,
        adminSystemPrompt: cfg.adminSystemPrompt,
        updatedAt: Date.now()
      };
      await Promise.all([
        db.ref(TIGER_AI_PUBLIC_PATH).set(publicPart),
        db.ref(TIGER_AI_SECRET_PATH).set(secretPart)
      ]);
      aiConfig = cfg;
      return true;
    },
    testNvidiaConnection,
    callNvidiaAPI,
    getConfig: () => aiConfig,
    isAdmin: () => isAdminMode,
    openPanel,
    closePanel,
    reloadConfig: async function () {
      await loadAiConfig();
      if (aiConfig && aiConfig.enabled !== false) {
        if (launcher) launcher.style.display = '';
      }
    }
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();