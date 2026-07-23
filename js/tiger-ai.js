/* ==========================================================
   Tiger AI Assistant — NVIDIA API Integration (FIXED VERSION)
   ----------------------------------------------------------
   Self-contained widget. Loads AI config from Firebase
   (aiConfig/public + aiConfig/secret). Supports text, image
   (vision), and reasoning models. Auto-detects admin mode
   from URL. Does NOT modify any existing site functionality.
   
   🔧 FIXES APPLIED:
   - Better error handling during initialization
   - Debug logging for troubleshooting
   - Reset mechanism for dismissed state
   - Robust Firebase connection handling
   - Click event protection
   ========================================================== */

(function () {
  'use strict';

  // ========= Config =========
  const TIGER_AI_VERSION = '1.0.1-fixed';

  // Brand-based assistant icon: reuses the exact Tiger Jeans emblem path
  // (see images/logo.svg) plus a small "AI" badge, so the assistant reads
  // as "the brand + AI" instead of a generic bot icon everywhere it appears
  // (launcher, header avatar, message avatars).
  const TIGER_AI_ICON_SVG = `<svg class="tj-ai-icon" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <circle cx="20" cy="20" r="18.6" fill="var(--surface,#161619)" stroke="var(--gold,#d4af37)" stroke-width="1.3"/>
    <g stroke="var(--gold,#d4af37)" stroke-width="3" stroke-linecap="round" opacity="0.5">
      <path d="M8.5 5 L13 35"/>
      <path d="M17 4 L21.5 36"/>
      <path d="M25.5 5 L30 35"/>
    </g>
    <text x="20" y="24.5" text-anchor="middle" font-size="12.5" font-weight="800" font-family="Arial, Helvetica, sans-serif" fill="var(--gold,#d4af37)" stroke="var(--bg,#0a0a0c)" stroke-width="2.4" paint-order="stroke" stroke-linejoin="round">AI</text>
  </svg>`;
  // Public path: readable by all clients (just enabled flag + model names + features)
  const TIGER_AI_PUBLIC_PATH = 'aiConfig/public';
  // Secret path: only readable when authenticated (API key, system prompts)
  const TIGER_AI_SECRET_PATH = 'aiConfig/secret';
  // Default NVIDIA API endpoint (public, no auth needed for basic models)
  const DEFAULT_NVIDIA_API_URL = 'https://tigerorder.studegy10.workers.dev/v1';
  // Chat history key (persists in sessionStorage for tab lifetime)
  const TIGER_AI_HISTORY_KEY = 'tj_ai_history';
  // Open state key (survives page reloads within session)
  const TIGER_AI_OPEN_KEY = 'tj_ai_open';
  // Dismiss State (sessionStorage) - long-press dismiss
  const TIGER_AI_DISMISSED_KEY = 'tj_ai_dismissed';
  // Customer phone key (shared with orders.html)
  const TIGER_AI_PHONE_KEY = 'tj_customer_phone';

  // ========= Official Size Guide Data (mirrors size-guide.html) =========
  const SIZE_GUIDE_DATA = {
    note: 'كل القياسات بالسنتيمتر. لو العميل بين مقاسين، رشح الأكبر للراحة إلا لو طلب مقاس ضيق.',
    jeans: {
      name: 'جينز / بنطلون',
      sizes: [
        {size:'28',waist:76,hip:96,length:102,thigh:58},
        {size:'30',waist:80,hip:100,length:104,thigh:60},
        {size:'32',waist:84,hip:104,length:106,thigh:62},
        {size:'34',waist:88,hip:108,length:108,thigh:64},
        {size:'36',waist:92,hip:112,length:110,thigh:66},
        {size:'38',waist:96,hip:116,length:112,thigh:68},
        {size:'40',waist:100,hip:120,length:114,thigh:70},
        {size:'42',waist:104,hip:124,length:116,thigh:72},
        {size:'44',waist:108,hip:128,length:118,thigh:74},
        {size:'46',waist:112,hip:132,length:120,thigh:76},
        {size:'48',waist:116,hip:136,length:122,thigh:78},
        {size:'50',waist:120,hip:140,length:124,thigh:80}
      ]
    },
    slimfit: {
      name: 'جينز سليم (ضيق)',
      sizes: [
        {size:'28',waist:74,hip:92,length:100,thigh:54},
        {size:'30',waist:78,hip:96,length:102,thigh:56},
        {size:'32',waist:82,hip:100,length:104,thigh:58},
        {size:'34',waist:86,hip:104,length:106,thigh:60},
        {size:'36',waist:90,hip:108,length:108,thigh:62},
        {size:'38',waist:94,hip:112,length:110,thigh:64},
        {size:'40',waist:98,hip:116,length:112,thigh:66},
        {size:'42',waist:102,hip:120,length:114,thigh:68},
        {size:'44',waist:106,hip:124,length:116,thigh:70}
      ]
    },
    jeansTall: {
      name: 'جينز طويل (أطوال خاصة)',
      sizes: [
        {size:'30',waist:80,hip:100,length:114,thigh:60},
        {size:'32',waist:84,hip:104,length:116,thigh:62},
        {size:'34',waist:88,hip:108,length:118,thigh:64},
        {size:'36',waist:92,hip:112,length:120,thigh:66},
        {size:'38',waist:96,hip:116,length:122,thigh:68},
        {size:'40',waist:100,hip:120,length:124,thigh:70},
        {size:'42',waist:104,hip:124,length:126,thigh:72}
      ]
    },
    tshirt1: {
      name: 'تيشرت',
      sizes: [
        {size:'S',chest:92,length:68,shoulder:42,sleeve:20},
        {size:'M',chest:96,length:70,shoulder:44,sleeve:21},
        {size:'L',chest:100,length:72,shoulder:46,sleeve:22},
        {size:'XL',chest:104,length:74,shoulder:48,sleeve:23},
        {size:'XXL',chest:110,length:76,shoulder:50,sleeve:24}
      ]
    },
    shirts: {
      name: 'قميص',
      sizes: [
        {size:'S',chest:94,length:74,shoulder:43,sleeve:22,collar:39},
        {size:'M',chest:98,length:76,shoulder:45,sleeve:23,collider:40},
        {size:'L',chest:102,length:78,shoulder:47,sleeve:24,collar:41},
        {size:'XL',chest:106,length:80,shoulder:49,sleeve:25,collar:42},
        {size:'XXL',chest:112,length:82,shoulder:51,sleeve:26,collar:43}
      ]
    }
  };

  // ========= State =========
  let aiConfig = null;
  let isAdminMode = false;
  let chatHistory = [];
  let isLoading = false;
  let currentAttachment = null; // { dataUrl, mimeType, fileName }
  let abortController = null;

  // Products/orders cache (admin tool use)
  let productsCache = null;
  let productsCacheTime = 0;
  let allProductsSnapshot = [];
  let allOrdersSnapshot = [];

  // UI refs (set after buildUI)
  let root, launcher, panel, messagesEl, textarea, sendBtn, attachInput, attachRow, modeRow;
  let trackOrdersBtn = null;
  let dropZone = null;

  // Mode prefix (admin): "سؤال" or "نفذ"
  let currentModePrefix = '';

  // ========= Utilities =========
  function fmtPrice(n) {
    return Number(n || 0).toLocaleString('ar-EG') + ' ج.م';
  }

  function isFirebaseReady() {
    if (typeof firebase === 'undefined') return false;
    try { if (typeof db !== 'undefined' && db) return true; } catch (_) {}
    if (typeof window.db !== 'undefined' && window.db) return true;
    return false;
  }

  function getDb() {
    try {
      if (typeof db !== 'undefined' && db) return db;
      if (typeof window.db !== 'undefined' && window.db) return window.db;
      return null;
    } catch (_) {
      return typeof window.db !== 'undefined' ? window.db : null;
    }
  }

  function getAuth() {
    try {
      if (typeof auth !== 'undefined' && auth) return auth;
      if (typeof window.auth !== 'undefined' && window.auth) return window.auth;
      return null;
    } catch (_) {
      return typeof window.auth !== 'undefined' ? window.auth : null;
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
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
        console.log('[TigerAI] Loading Firebase SDK...');
        await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
        await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js');
        await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js');
      }
      // Check again before loading config.js (in case Firebase was loaded but db not yet)
      try {
        if (typeof db !== 'undefined' && db) return;
      } catch (_) {}
      if (typeof window.db === 'undefined') {
        console.log('[TigerAI] Loading config.js...');
        await loadScript('js/config.js');
      }
    } catch (e) {
      console.error('[TigerAI] ensureFirebaseLoaded error:', e);
    }
  }

  // Load AI config from Firebase
  async function loadAiConfig() {
    const db = getDb();
    if (!db) {
      console.warn('[TigerAI] No database available for AI config');
      return null;
    }
    try {
      console.log('[TigerAI] Loading AI config...');
      // Always read public config
      const publicSnap = await db.ref(TIGER_AI_PUBLIC_PATH).once('value');
      const publicCfg = publicSnap.val() || null;

      if (!publicCfg) {
        console.warn('[TigerAI] No public AI config found');
        aiConfig = null;
        return null;
      }

      // Try to read secret config (only ever holds the optional API key used
      // for admin "test connection" — the real key used for every actual
      // chat call lives server-side in the Cloudflare Worker, so this is
      // allowed to fail for anonymous customers with no effect on them).
      let secretCfg = {};
      try {
        const secretSnap = await db.ref(TIGER_AI_SECRET_PATH).once('value');
        secretCfg = secretSnap.val() || {};
      } catch (e) {
        console.log('[TigerAI] Secret config not accessible (needs auth):', e.message);
        secretCfg = {};
      }

      // System prompts live in the public config now (they're not secrets),
      // so a store owner's customized customer-facing prompt actually reaches
      // anonymous visitors instead of only ever applying to logged-in admins.
      aiConfig = {
        ...publicCfg,
        apiKey: secretCfg.apiKey || ''
      };
      
      console.log('[TigerAI] AI config loaded successfully:', {
        enabled: aiConfig.enabled,
        textModel: aiConfig.textModel,
        hasApiKey: !!aiConfig.apiKey
      });
      
      return aiConfig;
    } catch (e) {
      console.error('[TigerAI] loadAiConfig error:', e);
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
      console.error('[TigerAI] loadProducts error:', e);
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
      console.error('[TigerAI] loadOrders error:', e);
      return [];
    }
  }

  // ========= Admin Detection =========
  function detectAdminMode() {
    return /admin\.html/i.test(location.pathname);
  }

  // ========= Explicit Execute Gate =========
  // For admin mode: the AI must include one of these exact words/phrases
  // in its tool_use call for us to actually execute it. This prevents
  // accidental DB writes from hallucinated tool calls.
  const EXECUTE_WORDS = ['نفذ', 'execute', 'تنفيذ'];
  function hasExplicitExecuteCommand(text) {
    if (!text) return false;
    const lower = text.toLowerCase().trim();
    return EXECUTE_WORDS.some(w => lower.includes(w.toLowerCase()));
  }

  // ========= History Management =========
  function loadHistory() {
    try {
      const raw = sessionStorage.getItem(TIGER_AI_HISTORY_KEY);
      chatHistory = raw ? JSON.parse(raw) : [];
    } catch (e) {
      chatHistory = [];
    }
  }

  function saveHistory() {
    try {
      sessionStorage.setItem(TIGER_AI_HISTORY_KEY, JSON.stringify(chatHistory.slice(-50)));
    } catch (e) {}
  }

  function clearChat() {
    chatHistory = [];
    saveHistory();
    if (messagesEl) messagesEl.innerHTML = '';
    addBotMessage(aiConfig?.welcomeMessage || 'مرحباً بك! أنا مساعد تايجر الذكي. كيف يمكنني مساعدتك اليوم؟ 🐯');
  }

  // ========= NVIDIA API Call =========
  function getNvidiaApiUrl() {
    // Use configured URL or default to worker proxy
    return aiConfig?.apiUrl?.trim() || DEFAULT_NVIDIA_API_URL;
  }

  function getNvidiaApiKey() {
    // For worker proxy, we don't need client-side key
    // The worker has its own secret
    return aiConfig?.apiKey || '';
  }

  async function callNvidiaAPI(messages, options = {}) {
    const url = `${getNvidiaApiUrl()}/chat/completions`;
    
    const body = {
      model: options.model || aiConfig?.textModel || 'meta/llama-3.1-8b-instruct',
      messages: messages,
      max_tokens: options.maxTokens || aiConfig?.maxTokens || 1024,
      temperature: options.temperature ?? aiConfig?.temperature ?? 0.7,
      stream: false
    };

    // Add image support (vision) if attachment present
    if (currentAttachment && options.includeImage !== false) {
      // For vision, we need to convert to the right format
      const userMsg = messages[messages.length - 1];
      if (userMsg && userMsg.role === 'user') {
        userMsg.content = [
          { type: 'text', text: userMsg.content },
          {
            type: 'image_url',
            image_url: {
              url: currentAttachment.dataUrl
            }
          }
        ];
        // Switch to vision model if available
        if (aiConfig?.visionModel) {
          body.model = aiConfig.visionModel;
        }
      }
    }

    console.log('[TigerAI] Calling NVIDIA API:', url, 'model:', body.model);

    const headers = {
      'Content-Type': 'application/json'
    };

    // Only add API key if not using worker proxy (worker has its own key)
    const apiKey = getNvidiaApiKey();
    if (apiKey && !url.includes('workers.dev')) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        signal: options.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TigerAI] API error:', response.status, errorText);
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (e) {
      if (e.name === 'AbortError') {
        throw new Error('تم إلغاء الطلب');
      }
      console.error('[TigerAI] Fetch error:', e);
      throw e;
    }
  }

  // Test NVIDIA connection (for admin panel)
  async function testNvidiaConnection(testApiKey) {
    const url = `${getNvidiaApiUrl()}/chat/completions`;
    const key = testApiKey || getNvidiaApiKey();
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (key && !url.includes('workers.dev')) {
      headers['Authorization'] = `Bearer ${key}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: aiConfig?.textModel || 'meta/llama-3.1-8b-instruct',
          messages: [{ role: 'user', content: 'اختبار' }],
          max_tokens: 10
        })
      });

      if (!response.ok) {
        const err = await response.json();
        return { success: false, error: err.detail || err.message || `HTTP ${response.status}` };
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ========= System Prompt Builder =========
  function buildSystemPrompt() {
    if (isAdminMode) {
      return aiConfig?.adminSystemPrompt || `أنت مساعد ذكي لمتجر "Tiger Jeans" (تايجر جينز) المتخصص في بيع الجينز والملابس. أنت الآن في وضع الأدمن.

## قدراتك:
- الإجابة على أسئلة عن المنتجات والطلبات والمخزون
- تنفيذ أوامر على قاعدة البيانات (عند طلب صريح)

## قاعدة البيانات المتاحة:
- products: جميع المنتجات مع الأسعار والمخزون
- orders: جميع الطلبات مع حالاتها

## تعليمات هامة:
- كن محدداً ومفيداً
- أجب بالعربية دائماً
- عند عرض الأسعار استخدم التنسيق المصري
- إذا سئلت عن منتج غير موجود، اقترح بدائل مشابهة`;
    }

    return aiConfig?.systemPrompt || `أنت مساعد ذكي ودود لمتجر "Tiger Jeans" (تايجر جينز) المتخصص في بيع الجينز والملابس العصرية في مصر.

## مهمتك:
مساعدة العملاء في:
- البحث عن المنتجات المناسبة (جينز رجالي، حريمي، بناتي، شبابي)
- الاستشارة في المقاسات والألوان
- معرفة سياسات المتجر (الشحن، الاسترجاع، الدفع)
- الرد على استفسارات عامة عن المتجر

## معلومات المتجر:
- الاسم: Tiger Jeans (تايجر جينز)
- التخصص: بناطيل جينز وملابس عصرية
- الشحن: لجميع محافظات مصر
- الدفع: كاش عند الاستلام، فودافون كاش، إنستا باي، بطاقات هدايا

## دليل المقاسات:
${JSON.stringify(SIZE_GUIDE_DATA, null, 2)}

## نبرة الصوت:
- ودودة ومهذبة
- تشعر العميل بأنه يتحدث مع صديق خبير
- استخدم الإيموجي بشكل معتدل
- كن مباشراً ومفيداً

## قواعد:
- أجب دائماً بالعربية
- إذا لم تكن متأكداً، اطلب المزيد من التفاصيل
- لا تخترع معلومات عن المنتجات
- ركز على مساعدة العميل في اتخاذ قرار الشراء`;
  }

  // ========= Messages Context Builder =========
  function buildMessagesContext(userMessage) {
    const systemMsg = {
      role: 'system',
      content: buildSystemPrompt()
    };

    // Add product/order context for admin
    if (isAdminMode) {
      // This will be populated when admin asks about products/orders
    }

    const trimmedHistory = chatHistory.slice(-6);

    return {
      messages: [systemMsg, ...trimmedHistory, userMessage],
      context: {}
    };
  }

  // ========= UI: Render =========
  
  function injectStylesheet() {
    if (document.getElementById('tiger-ai-css')) return;
    const link = document.createElement('link');
    link.id = 'tiger-ai-css';
    link.rel = 'stylesheet';
    link.href = 'css/tiger-ai.css';
    document.head.appendChild(link);
    console.log('[TigerAI] Stylesheet injected');
  }

  function buildUI() {
    injectStylesheet();

    root = document.createElement('div');
    root.className = 'tj-ai-root';
    root.id = 'tjAiRoot';
    root.innerHTML = `
      <button class="tj-ai-launcher" id="tjAiLauncher" aria-label="Tiger AI" title="اسأل Tiger AI">
        <span class="tj-ai-pulse"></span>
        ${TIGER_AI_ICON_SVG}
      </button>

      <div class="tj-ai-drop-zone" id="tjAiDropZone">
        <div class="tj-ai-drop-zone-inner">
          <i class='bx bx-x'></i>
        </div>
      </div>

      <div class="tj-ai-panel" id="tjAiPanel" role="dialog" aria-label="Tiger AI Assistant">
        <div class="tj-ai-header">
          <div class="tj-ai-avatar">${TIGER_AI_ICON_SVG}</div>
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
          <!-- زر تتبع الطلبات -->
          <button type="button" class="tj-ai-track-btn" id="tjAiTrackBtn" title="تتبع طلباتك">
            <i class='bx bx-package'></i> <span>تتبع الطلبات</span>
          </button>
          <div class="tj-ai-mode-row" id="tjAiModeRow"></div>
          <div class="tj-ai-input-attach-row" id="tjAiAttachRow"></div>
          <div class="tj-ai-input-row">
            <textarea id="tjAiTextarea" placeholder="اكتب سؤالك أو ارفق صورة..." rows="1"></textarea>
            <input type="file" id="tjAiFile" accept="image/*" style="display:none" />
            <button class="tj-ai-input-btn" id="tjAiAttach" title="رفع صورة"><i class='bx bx-image-add'></i></button>
            <button class="tj-ai-input-btn tj-ai-send" id="tjAiSend" title="إرسال"><i class='bx bx-send'></i></button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    console.log('[TigerAI] UI built and appended to body');

    // Wire up references
    launcher = root.querySelector('#tjAiLauncher');
    panel = root.querySelector('#tjAiPanel');
    messagesEl = root.querySelector('#tjAiMessages');
    textarea = root.querySelector('#tjAiTextarea');
    sendBtn = root.querySelector('#tjAiSend');
    attachInput = root.querySelector('#tjAiFile');
    attachRow = root.querySelector('#tjAiAttachRow');
    modeRow = root.querySelector('#tjAiModeRow');
    trackOrdersBtn = root.querySelector('#tjAiTrackBtn');
    dropZone = root.querySelector('#tjAiDropZone');

    // Verify critical elements exist
    if (!launcher) {
      console.error('[TigerAI] CRITICAL: Launcher element not found!');
      return;
    }

    // Wire up Track Orders button (customer mode only)
    if (!isAdminMode && trackOrdersBtn) {
      trackOrdersBtn.addEventListener('click', handleTrackOrders);
    } else if (trackOrdersBtn) {
      trackOrdersBtn.style.display = 'none';
    }

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

      // Two ready-made mode buttons: "سؤال" just fills the box with a
      // question prefix (plain text answer, no DB access). "نفذ" fills it
      // with the exact word the Explicit Execute Gate looks for, which is
      // what actually unlocks real tool calls for that message.
      modeRow.innerHTML = `
        <button type="button" class="tj-ai-mode-btn tj-ai-mode-question" id="tjAiModeQuestion" title="سؤال بدون أي تعديل على البيانات">
          <i class='bx bx-help-circle'></i> سؤال
        </button>
        <button type="button" class="tj-ai-mode-btn tj-ai-mode-execute" id="tjAiModeExecute" title="طلب تنفيذ عملية فعلية على قاعدة البيانات">
          <i class='bx bx-bolt-circle'></i> نفذ
        </button>
      `;
      const modeQuestionBtn = modeRow.querySelector('#tjAiModeQuestion');
      const modeExecuteBtn = modeRow.querySelector('#tjAiModeExecute');
      modeQuestionBtn.addEventListener('click', () => setModePrefix('سؤال', modeQuestionBtn));
      modeExecuteBtn.addEventListener('click', () => setModePrefix('نفذ', modeExecuteBtn));
    }

    bindEvents();
    console.log('[TigerAI] Events bound successfully');
  }

  function bindEvents() {
    if (!launcher) {
      console.error('[TigerAI] Cannot bind events: launcher is null');
      return;
    }

    // Main launcher click - with protection
    launcher.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('[TigerAI] Launcher clicked!');
      togglePanel();
    });
    
    // Also handle touchend for mobile
    launcher.addEventListener('touchend', function(e) {
      e.preventDefault();
      console.log('[TigerAI] Launcher touched!');
      togglePanel();
    });

    if (root.querySelector('#tjAiClose')) {
      root.querySelector('#tjAiClose').addEventListener('click', closePanel);
    }
    if (root.querySelector('#tjAiClear')) {
      root.querySelector('#tjAiClear').addEventListener('click', clearChat);
    }

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
    let isDismissing = false;

    const LONG_PRESS_MS = 500;
    const MOVE_THRESHOLD = 8;

    function switchToAbsolutePos() {
      const rect = btn.getBoundingClientRect();
      btn.style.left = rect.left + 'px';
      btn.style.top = rect.top + 'px';
      btn.style.right = 'auto';
      btn.style.bottom = 'auto';
      btn.classList.add('tj-ai-dragging-pos');
    }

    btn.addEventListener('pointerdown', (e) => {
      if (isDismissing) return;
      
      startX = e.clientX;
      startY = e.clientY;
      hasMoved = false;
      isDragging = false;
      
      btnRect = btn.getBoundingClientRect();
      offsetX = e.clientX - btnRect.left;
      offsetY = e.clientY - btnRect.top;

      // Start long press timer
      longPressTimer = setTimeout(() => {
        if (!hasMoved) {
          isDismissing = true;
          btn.classList.add('tj-ai-dismiss-mode');
          dropZone.classList.add('tj-ai-drop-zone-show');
        }
      }, LONG_PRESS_MS);

      btn.setPointerCapture(e.pointerId);
    });

    btn.addEventListener('pointermove', (e) => {
      if (!btn.hasPointerCapture(e.pointerId)) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!isDragging && (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD)) {
        isDragging = true;
        hasMoved = true;
        
        // Cancel long press if moved
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }

        switchToAbsolutePos();
      }

      if (isDragging) {
        const targetX = e.clientX - offsetX;
        const targetY = e.clientY - offsetY;
        
        btn.style.left = targetX + 'px';
        btn.style.top = targetY + 'px';

        // Check proximity to drop zone
        const zoneRect = dropZone.getBoundingClientRect();
        const btnCenterX = targetX + btnRect.width / 2;
        const btnCenterY = targetY + btnRect.height / 2;
        const zoneCenterX = zoneRect.left + zoneRect.width / 2;
        const zoneCenterY = zoneRect.top + zoneRect.height / 2;
        
        const distance = Math.sqrt(
          Math.pow(btnCenterX - zoneCenterX, 2) + 
          Math.pow(btnCenterY - zoneCenterY, 2)
        );

        if (distance < 100) {
          btn.classList.add('tj-ai-near-drop');
          dropZone.classList.add('tj-ai-drop-zone-near');
        } else {
          btn.classList.remove('tj-ai-near-drop');
          dropZone.classList.remove('tj-ai-drop-zone-near');
        }
      }
    });

    btn.addEventListener('pointerup', (e) => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      if (isDismissing) {
        // Check if dropped in zone
        const zoneRect = dropZone.getBoundingClientRect();
        const btnRectNow = btn.getBoundingClientRect();
        const btnCenterX = btnRectNow.left + btnRectNow.width / 2;
        const btnCenterY = btnRectNow.top + btnRectNow.height / 2;
        const zoneCenterX = zoneRect.left + zoneRect.width / 2;
        const zoneCenterY = zoneRect.top + zoneRect.height / 2;
        
        const distance = Math.sqrt(
          Math.pow(btnCenterX - zoneCenterX, 2) + 
          Math.pow(btnCenterY - zoneCenterY, 2)
        );

        if (distance < 100) {
          // Dismiss!
          dismissAssistant();
        } else {
          // Cancel dismiss
          isDismissing = false;
          btn.classList.remove('tj-ai-dismiss-mode');
          dropZone.classList.remove('tj-ai-drop-zone-show', 'tj-ai-drop-zone-near');
          btn.classList.remove('tj-ai-near-drop');
        }
      } else if (!hasMoved && !isDragging) {
        // Regular click - handled by click listener
      } else if (isDragging) {
        // Just dragging, save position
        localStorage.setItem('tj_ai_launcher_pos', JSON.stringify({
          left: btn.style.left,
          top: btn.style.top
        }));
      }

      isDragging = false;
      if (btn.hasPointerCapture(e.pointerId)) {
        btn.releasePointerCapture(e.pointerId);
      }
    });

    // Dismiss: hide entire root, mark in sessionStorage
    function dismissAssistant() {
      sessionStorage.setItem(TIGER_AI_DISMISSED_KEY, '1');
      // Animate out
      btn.style.transition = 'transform .3s ease, opacity .3s ease';
      btn.style.transform = 'scale(0.3)';
      btn.style.opacity = '0';
      dropZone.classList.remove('tj-ai-drop-zone-show', 'tj-ai-drop-zone-near');
      
      setTimeout(() => {
        if (root) root.style.display = 'none';
      }, 300);
      
      console.log('[TigerAI] Assistant dismissed (long-press + drag to ×)');
    }
  }

  // ========= Panel Toggle =========
  function togglePanel() {
    if (!panel || !launcher) return;
    
    const isOpen = panel.classList.contains('show');
    if (isOpen) {
      closePanel();
    } else {
      openPanel();
    }
  }

  function openPanel() {
    if (!panel || !launcher) return;
    
    panel.classList.add('show');
    launcher.classList.add('tj-ai-active');
    sessionStorage.setItem(TIGER_AI_OPEN_KEY, '1');
    
    // Focus textarea after animation
    setTimeout(() => {
      if (textarea) textarea.focus();
    }, 300);
  }

  function closePanel() {
    if (!panel || !launcher) return;
    
    panel.classList.remove('show');
    launcher.classList.remove('tj-ai-active');
    sessionStorage.setItem(TIGER_AI_OPEN_KEY, '0');
  }

  // ========= Message Display =========
  function addBotMessage(text, isError = false) {
    if (!messagesEl) return;
    
    const div = document.createElement('div');
    div.className = `tj-ai-msg tj-ai-bot${isError ? ' tj-ai-error' : ''}`;
    div.innerHTML = `
      <div class="tj-ai-msg-avatar">${TIGER_AI_ICON_SVG}</div>
      <div class="tj-ai-msg-bubble">${formatMessage(text)}</div>
    `;
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function addUserMessage(text) {
    if (!messagesEl) return;
    
    const div = document.createElement('div');
    div.className = 'tj-ai-msg tj-ai-user';
    div.innerHTML = `
      <div class="tj-ai-msg-bubble">${escapeHtml(text)}</div>
    `;
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function addTypingIndicator() {
    if (!messagesEl) return;
    
    removeTypingIndicator();
    const div = document.createElement('div');
    div.className = 'tj-ai-msg tj-ai-bot';
    div.id = 'tjAiTyping';
    div.innerHTML = `
      <div class="tj-ai-msg-avatar">${TIGER_AI_ICON_SVG}</div>
      <div class="tj-ai-msg-bubble tj-ai-typing">
        <span></span><span></span><span></span>
      </div>
    `;
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const el = document.getElementById('tjAiTyping');
    if (el) el.remove();
  }

  function scrollToBottom() {
    if (messagesEl) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  function formatMessage(text) {
    // Basic markdown-like formatting
    let html = escapeHtml(text);
    
    // Links: [نص](https://...) -> real clickable <a> (only http/https allowed,
    // so the model can never smuggle a javascript: or data: URL through here)
    html = html.replace(/\[([^\[\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (m, label, url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    return html;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ========= Textarea Auto-resize =========
  function autoResize() {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
  }

  // ========= File Attachment =========
  function onFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('يرجى اختيار صورة فقط', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('حجم الملف كبير جداً (الحد الأقصى 5MB)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      currentAttachment = {
        dataUrl: ev.target.result,
        mimeType: file.type,
        fileName: file.name
      };
      showAttachmentPreview(file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function showAttachmentPreview(fileName) {
    if (!attachRow) return;
    
    attachRow.innerHTML = `
      <div class="tj-ai-attach-preview">
        <i class='bx bx-image'></i>
        <span>${escapeHtml(fileName)}</span>
        <button type="button" id="tjAiRemoveAttach" title="إزالة"><i class='bx bx-x'></i></button>
      </div>
    `;
    attachRow.querySelector('#tjAiRemoveAttach').addEventListener('click', () => {
      currentAttachment = null;
      attachRow.innerHTML = '';
    });
  }

  // ========= Send Message =========
  async function sendMessage() {
    if (!textarea || isLoading) return;
    
    const text = textarea.value.trim();
    if (!text && !currentAttachment) return;

    // Clear input
    textarea.value = '';
    autoResize();

    // Add mode prefix for admin
    let finalText = text;
    if (isAdminMode && currentModePrefix) {
      finalText = `[${currentModePrefix}] ${text}`;
    }

    // Show user message
    addUserMessage(finalText);

    // Save to history
    chatHistory.push({ role: 'user', content: finalText });
    saveHistory();

    // Clear attachment after sending
    const attachmentToSend = currentAttachment;
    currentAttachment = null;
    if (attachRow) attachRow.innerHTML = '';

    // Call API
    isLoading = true;
    addTypingIndicator();
    updateSendButton(true);

    try {
      const { messages, context } = buildMessagesContext({ 
        role: 'user', 
        content: finalText 
      });

      // Check for admin tool calls
      if (isAdminMode) {
        // First, call AI to see if it wants to use tools
        const aiResponse = await callNvidiaAPI(messages, {
          includeImage: !!attachmentToSend
        });

        const aiText = aiResponse.choices?.[0]?.message?.content || '';
        
        // Check if AI requested a tool call
        const toolCallMatch = aiText.match(/<tool_use>([\s\S]*?)<\/tool_use>/);
        
        if (toolCallMatch) {
          const toolJson = toolCallMatch[1].trim();
          
          try {
            const toolCall = JSON.parse(toolJson);
            
            // Check for explicit execute command
            if (hasExplicitExecuteCommand(finalText)) {
              // Execute the tool
              const result = await executeAdminTool(toolCall);
              
              // Send result back to AI for formatting
              const followUpMessages = [...messages, 
                { role: 'assistant', content: aiText },
                { role: 'user', content: `نتيجة تنفيذ الأمر:\n${JSON.stringify(result, null, 2)}\n\nعرض النتيجة للعميل بشكل منسق.` }
              ];
              
              const finalResponse = await callNvidiaAPI(followUpMessages, { includeImage: false });
              const finalText = finalResponse.choices?.[0]?.message?.content || 'تم تنفيذ الأمر بنجاح.';
              
              addBotMessage(finalText);
              chatHistory.push({ role: 'assistant', content: finalText });
              saveHistory();
            } else {
              // Just inform that execute permission needed
              addBotMessage(`⚠️ **يتطلب تأكيد**: يريد المساعد تنفيذ الأمر التالي:

\`\`\`${toolCall.name}\`\`\`

لتنفيذه، اضغط زر "**نفذ**" ثم أرسل نفس الرسالة مرة أخرى.`);
              chatHistory.push({ role: 'assistant', content: aiText });
              saveHistory();
            }
          } catch (parseError) {
            // Invalid tool JSON, show as normal message
            addBotMessage(aiText);
            chatHistory.push({ role: 'assistant', content: aiText });
            saveHistory();
          }
        } else {
          // Normal response
          addBotMessage(aiText);
          chatHistory.push({ role: 'assistant', content: aiText });
          saveHistory();
        }
      } else {
        // Customer mode - simple call
        const response = await callNvidiaAPI(messages, {
          includeImage: !!attachmentToSend
        });

        const responseText = response.choices?.[0]?.message?.content || 'عذراً، حدث خطأ. حاول مرة أخرى.';
        
        addBotMessage(responseText);
        chatHistory.push({ role: 'assistant', content: responseText });
        saveHistory();
      }

    } catch (error) {
      console.error('[TigerAI] Send message error:', error);
      addBotMessage(`عذراً، حدث خطأ: ${error.message}`, true);
    } finally {
      isLoading = false;
      removeTypingIndicator();
      updateSendButton(false);
    }
  }

  // ========= Admin Tool Execution =========
  async function executeAdminTool(toolCall) {
    const { name, args } = toolCall;
    console.log('[TigerAI] Executing tool:', name, args);

    switch (name) {
      case 'list_products': {
        const products = await loadProducts(true);
        return { products: products.slice(0, (args?.limit || 20)), total: products.length };
      }

      case 'get_product': {
        const products = await loadProducts();
        const product = products.find(p => 
          p.id === args?.id || 
          p.name?.includes(args?.name || '') ||
          args?.query && p.name?.includes(args.query)
        );
        return product || { error: 'المنتج غير موجود' };
      }

      case 'list_orders': {
        const orders = await loadOrders();
        const limit = args?.limit || 20;
        const status = args?.status;
        let filtered = orders;
        
        if (status) {
          filtered = orders.filter(o => o.status === status);
        }
        
        // Sort by date (newest first)
        filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        return { orders: filtered.slice(0, limit), total: filtered.length };
      }

      case 'get_order': {
        const orders = await loadOrders();
        const order = orders.find(o => 
          o.id === args?.id || 
          o.orderCode === args?.code ||
          o.orderCode === args?.id
        );
        return order || { error: 'الطلب غير موجود' };
      }

      case 'update_order_status': {
        const db = getDb();
        if (!db) return { error: 'قاعدة البيانات غير متاحة' };
        
        const { orderId, status, reason } = args;
        if (!orderId || !status) {
          return { error: 'معرف الطلب والحالة مطلوبان' };
        }

        const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
          return { error: 'حالة غير صالحة. الحالات المتاحة: ' + validStatuses.join(', ') };
        }

        try {
          const orderRef = db.ref(`orders/${orderId}`);
          const snap = await orderRef.once('value');
          if (!snap.exists()) {
            return { error: 'الطلب غير موجود' };
          }

          const oldStatus = snap.val().status;
          await orderRef.update({
            status,
            statusReason: reason || '',
            statusUpdatedAt: Date.now(),
            statusUpdatedBy: 'admin-ai'
          });

          // Try to send Telegram notification
          try {
            if (typeof window.TelegramBot !== 'undefined') {
              await window.TelegramBot.notifyOrderStatusChange(snap.val(), oldStatus, status);
            }
          } catch (telegramError) {
            console.log('Telegram notification failed:', telegramError);
          }

          return { success: true, orderId, oldStatus, newStatus: status };
        } catch (e) {
          return { error: e.message };
        }
      }

      case 'update_stock': {
        const db = getDb();
        if (!db) return { error: 'قاعدة البيانات غير متاحة' };
        
        const { productId, size, color, quantity } = args;
        if (!productId || quantity === undefined) {
          return { error: 'معرف المنتج والكمية مطلوبان' };
        }

        try {
          const stockKey = size && color ? `${size}_${color}` : 'default';
          await db.ref(`products/${productId}/stock/${stockKey}`).set(quantity);
          
          // Clear cache
          productsCache = null;
          
          return { success: true, productId, stockKey, quantity };
        } catch (e) {
          return { error: e.message };
        }
      }

      case 'get_stats': {
        const orders = await loadOrders();
        const products = await loadProducts();
        
        const now = Date.now();
        const todayStart = new Date().setHours(0, 0, 0, 0);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        const todayOrders = orders.filter(o => (o.createdAt || 0) >= todayStart);
        const monthOrders = orders.filter(o => (o.createdAt || 0) >= monthStart);

        const totalRevenue = orders.reduce((sum, o) => sum + (o.totalPrice || o.total || 0), 0);
        const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.totalPrice || o.total || 0), 0);
        const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.totalPrice || o.total || 0), 0);

        return {
          totalOrders: orders.length,
          totalRevenue,
          todayOrders: todayOrders.length,
          todayRevenue,
          monthOrders: monthOrders.length,
          monthRevenue,
          totalProducts: products.length,
          lowStockProducts: products.filter(p => {
            if (!p.stock) return false;
            return Object.values(p.stock).some(q => q <= 2 && q > 0);
          }).length
        };
      }

      case 'search_products': {
        const products = await loadProducts();
        const query = (args?.query || '').toLowerCase();
        
        if (!query) {
          return { error: 'مصطلح البحث مطلوب' };
        }

        const results = products.filter(p =>
          p.name?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
        );

        return { results, count: results.length };
      }

      default:
        return { error: `أغير معروف: ${name}` };
    }
  }

  // ========= Track Orders Feature =========
  async function handleTrackOrders() {
    if (!messagesEl || !textarea) return;

    console.log('[TigerAI] Track Orders clicked');

    // Check login status
    const auth = getAuth();
    let currentUser = null;
    
    if (auth) {
      try {
        currentUser = auth.currentUser;
      } catch (e) {
        console.log('[TigerAI] Error getting current user:', e);
      }
    }

    if (!currentUser) {
      // Not logged in - prompt to login
      addBotMessage(`🔐 **يرجى تسجيل الدخول أولاً**

لتتبع طلباتك، يجب تسجيل الدخول إلى المتجر أولاً.

هل تريد تسجيل الدخول الآن؟`);
      
      // Add login button suggestion
      setTimeout(() => {
        if (textarea) {
          textarea.value = 'نعم، أريد تسجيل الدخول';
          autoResize();
        }
      }, 500);
      return;
    }

    // User is logged in - get phone number
    let phoneNumber = currentUser.phoneNumber;
    
    // If no phone in auth, check Firebase user profile
    if (!phoneNumber) {
      const db = getDb();
      if (db) {
        try {
          const userSnap = await db.ref(`users/${currentUser.uid}`).once('value');
          const userData = userSnap.val();
          if (userData?.phone) {
            phoneNumber = userData.phone;
          }
        } catch (e) {
          console.log('[TigerAI] Error fetching user phone:', e);
        }
      }
    }

    // Check sessionStorage for guest phone (from orders.html)
    if (!phoneNumber) {
      phoneNumber = sessionStorage.getItem(TIGER_AI_PHONE_KEY);
    }

    if (!phoneNumber) {
      addBotMessage(`📱 **لم يتم العثور على رقم هاتف**

لم نتمكن من العثور على رقم هاتف مربح بحسابك.

يرجى إدخال رقم هاتفك لتتبع الطلبات:`);
      
      // Wait for user to enter phone
      waitForPhoneNumber();
      return;
    }

    // Search for orders
    await searchAndDisplayOrders(phoneNumber);
  }

  function waitForPhoneNumber() {
    // Add an input handler for phone number entry
    const originalSend = sendMessage;
    let phoneHandler = async function() {
      const phone = textarea.value.trim();
      if (phone && /^01[0-9]{9}$/.test(phone.replace(/\s/g, ''))) {
        // Remove this handler
        sendMessage = originalSave;
        
        // Save phone to sessionStorage
        sessionStorage.setItem(TIGER_AI_PHONE_KEY, phone);
        
 addUserMessage(phone);
        await searchAndDisplayOrders(phone);
      } else if (phone) {
        addBotMessage(`❌ **رقم هاتف غير صحيح**

يرجى إدخال رقم مصري صحيح (يبدأ بـ 01)`);
      }
    };
    
    var originalSave = sendMessage;
    sendMessage = phoneHandler;
  }

  async function searchAndDisplayOrders(phoneNumber) {
    addBotMessage(`🔍 **جاري البحث عن الطلبات...**

رقم الهاتف: \`${phoneNumber}\``);
    
    const db = getDb();
    if (!db) {
      addBotMessage(`❌ **خطأ في الاتصال بقاعدة البيانات**

حاول مرة أخرى لاحقاً.`);
      return;
    }

    try {
      // Clean phone number
      let cleanPhone = phoneNumber.replace(/\D/g, '');
      
      // Search in orders
      const ordersSnap = await db.ref('orders').once('value');
      const allOrders = ordersSnap.val() || {};
      
      const customerOrders = Object.entries(allOrders)
        .filter(([id, order]) => {
          const orderPhone = (order.customer?.phone || '').replace(/\D/g, '');
          return orderPhone.includes(cleanPhone) || cleanPhone.includes(orderPhone);
        })
        .map(([id, order]) => ({ id, ...order }))
        .filter(order => order.status !== 'delivered' && order.status !== 'cancelled')
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      if (customerOrders.length === 0) {
        addBotMessage(`✅ **لا توجد طلبات قيد التجهيز**

لا توجد طلبات نشطة مرتبطة بهذا الرقم.

شكراً لتواصلك مع متجر تايجر جينز! 🐯`);
        return;
      }

      // Build orders display
      let message = `📦 **وجدت ${customerOrders.length} طلب(ات) نشطة**\n\n`;
      
      const motivationalMessages = [
        'سعدنا بشرائكم من متجر تايجر! 🐯',
        'شكراً لثقتكم بنا! ✨',
        'نحن في خدمتكم دائماً! 💪',
        'متجر تايجر يقدر ثقتكم! 🎉'
      ];

      customerOrders.forEach((order, idx) => {
        const statusMap = {
          'pending': '⏳ قيد الانتظار',
          'confirmed': '✅ تم التأكيد',
          'processing': '🔄 قيد التجهيز',
          'shipped': '🚚 تم الشحن'
        };

        const status = statusMap[order.status] || order.status || 'قيد المراجعة';
        const shippingCompany = order.shippingCompany || order.shipping?.company || 'جاري التحديد';
        const trackingNumber = order.trackingNumber || order.shipping?.trackingNumber || '';
        
        message += `---\n**طلب #${idx + 1}** (${order.orderCode || order.id})\n`;
        message += `📊 الحالة: ${status}\n`;
        
        if (shippingCompany && shippingCompany !== 'جاري التحديد') {
          message += `🚚 شركة الشحن: ${shippingCompany}\n`;
        }
        
        if (trackingNumber) {
          // Generate tracking link based on company
          const trackingLink = generateTrackingLink(shippingCompany, trackingNumber);
          message += `🔗 رقم التتبع: ${trackingNumber}\n`;
          if (trackingLink) {
            message += `🌐 [تتبع الشحنة](${trackingLink})\n`;
          }
        }
        
        message += `💰 الإجمالي: ${fmtPrice(order.totalPrice || order.total)}\n\n`;
      });

      // Add random motivational message
      const motivationalMsg = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
      message += `\n${motivationalMsg}`;

      addBotMessage(message);
      
    } catch (error) {
      console.error('[TigerAI] Error searching orders:', error);
      addBotMessage(`❌ **حدث خطأ أثناء البحث عن الطلبات**

حاول مرة أخرى لاحقاً.`);
    }
  }

  function generateTrackingLink(company, trackingNumber) {
    if (!company || !trackingNumber) return '';
    
    const companyLower = company.toLowerCase();
    
    // Egyptian shipping companies tracking links
    if (companyLower.includes('aramex') || companyLower.includes('أرامكس')) {
      return `https://www.aramex.com/track/results?detail=1&ShipmentNumber=${trackingNumber}`;
    }
    if (companyLower.includes('bosta') || companyLower.includes('بوستا')) {
      return `https://app.bosta.co/track/${trackingNumber}`;
    }
    if (companyLower.includes('beezol') || companyLower.includes('بيزول')) {
      return `https://beezol.com/track?num=${trackingNumber}`;
    }
    if (companyLower.includes('smsa') || companyLower.includes('سمسة')) {
      return `https://www.smsaexpress.com/track.aspx?nums=${trackingNumber}`;
    }
    if (companyLower.includes('dhl')) {
      return `https://www.dhl.com/eg-ar/homepage/tracking/tracking-parcel.html?submit=1&tracking-id=${trackingNumber}`;
    }
    if (companyLower.includes('fedex')) {
      return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
    }
    
    // Generic - no specific link
    return '';
  }

  // ========= Mode Prefix (Admin) =========
  function setModePrefix(prefix, btn) {
    currentModePrefix = prefix;
    
    // Update button styles
    if (modeRow) {
      modeRow.querySelectorAll('.tj-ai-mode-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
      });
    }
    
    // Update placeholder
    if (textarea) {
      if (prefix === 'نفذ') {
        textarea.placeholder = 'اكتب أمر التنفيذ (سيتم تطبيق تغييرات على قاعدة البيانات)...';
      } else {
        textarea.placeholder = 'اكتب سؤالك (قراءة فقط)...';
      }
    }
  }

  // ========= Send Button State =========
  function updateSendButton(isLoading_state) {
    if (!sendBtn) return;
    
    if (isLoading_state) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = '<i class=\'bx bx-loader-alt bx-spin\'></i>';
    } else {
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<i class=\'bx bx-send\'></i>';
    }
  }

  // ========= Toast Notification =========
  function showToast(message, type = 'info') {
    // Reuse existing toast or create new one
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    
    t.textContent = message;
    t.className = 'toast show';
    if (type === 'error') {
      t.style.background = '#e0554b';
    } else {
      t.style.background = '';
    }
    
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
  }

  // ========= Initialization =========
  async function init() {
    console.log('[TigerAI] Starting initialization v' + TIGER_AI_VERSION + '...');
    
    if (window.__tigerAIInitStarted) {
      console.warn('[TigerAI] Already initialized, skipping');
      return;
    }
    window.__tigerAIInitStarted = true;

    try {
      isAdminMode = detectAdminMode();
      console.log('[TigerAI] Admin mode:', isAdminMode);

      // Auto-load Firebase + config.js if missing (for static content pages)
      await ensureFirebaseLoaded();

      // Wait for Firebase to be ready
      let tries = 0;
      while (!isFirebaseReady() && tries < 50) {
        await new Promise(r => setTimeout(r, 100));
        tries++;
      }
      
      if (!isFirebaseReady()) {
        console.error('[TigerAI] Firebase not ready after 5 seconds, aborting');
        
        // Still build UI but show error state
        buildUI();
        if (messagesEl) {
          addBotMessage(`⚠️ **مشكلة في الاتصال**

تعذر الاتصال بخادم البيانات. تحقق من اتصال الإنترنت وحاول مرة أخرى.`, true);
        }
        return;
      }
      
      console.log('[TigerAI] Firebase ready after', tries * 100, 'ms');

      // Don't show on admin login lock screen
      if (isAdminMode && isAdminLoginLockVisible()) {
        console.log('[TigerAI] Admin lock screen visible, waiting...');
        const observer = new MutationObserver(() => {
          if (!isAdminLoginLockVisible()) {
            observer.disconnect();
            continueInit();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
        setTimeout(() => {
          if (!isAdminLoginLockVisible()) {
            observer.disconnect();
            continueInit();
          }
        }, 8000);
        return;
      }

      await continueInit();
      
    } catch (error) {
      console.error('[TigerAI] Init error:', error);
    }
  }

  // True while the admin login lock screen is showing and the logged-in
  // layout is not — checked via computed style, since the layout is hidden
  // by a CSS class rule (not an inline style attribute).
  function isAdminLoginLockVisible() {
    const lockEl = document.querySelector('.admin-lock');
    const layoutEl = document.querySelector('.admin-layout');
    const lockVisible = !!lockEl && getComputedStyle(lockEl).display !== 'none';
    const layoutVisible = !!layoutEl && getComputedStyle(layoutEl).display !== 'none';
    return lockVisible && !layoutVisible;
  }

  async function continueInit() {
    console.log('[TigerAI] Continuing initialization...');
    
    // Check if assistant was dismissed in this session
    if (sessionStorage.getItem(TIGER_AI_DISMISSED_KEY) === '1') {
      console.log('[TigerAI] Assistant dismissed this session, skipping init');
      // Still build but keep hidden (can be reset via console)
      buildUI();
      if (root) root.style.display = 'none';
      return;
    }

    loadHistory();
    buildUI();

    // Load config
    await loadAiConfig();

    // Hide launcher if disabled and not admin (admin still sees it for config)
    if (aiConfig && aiConfig.enabled === false && !isAdminMode) {
      console.log('[TigerAI] AI disabled in config, hiding launcher');
      if (launcher) launcher.style.display = 'none';
    }

    // Show welcome message if no history
    if (chatHistory.length === 0) {
      addBotMessage(aiConfig?.welcomeMessage || 'مرحباً بك! أنا مساعد تايجر الذكي. كيف يمكنني مساعدتك اليوم؟ 🐯');
    } else {
      // Restore history display
      chatHistory.forEach(msg => {
        if (msg.role === 'user') {
          addUserMessage(msg.content);
        } else {
          addBotMessage(msg.content);
        }
      });
    }

    console.log('[TigerAI] Initialization complete!');
  }

  // ========= Public API (for admin panel) =========
  window.TigerAI = {
    version: TIGER_AI_VERSION,
    init,
    loadAiConfig,
    saveAiConfig: async function (cfg) {
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
    resetAssistant: function() {
      // Manual reset - clear dismissed state and reinit
      console.log('[TigerAI] Manual reset triggered');
      sessionStorage.removeItem(TIGER_AI_DISMISSED_KEY);
      sessionStorage.removeItem(TIGER_AI_HISTORY_KEY);
      sessionStorage.removeItem(TIGER_AI_OPEN_KEY);
      
      // Remove existing UI
      if (root && root.parentNode) {
        root.parentNode.removeChild(root);
      }
      
      // Restart init
      window.__tigerAIInitStarted = false;
      init();
    },
    debug: function() {
      return {
        version: TIGER_AI_VERSION,
        isAdminMode,
        isFirebaseReady: isFirebaseReady(),
        hasConfig: !!aiConfig,
        configEnabled: aiConfig?.enabled,
        isDismissed: sessionStorage.getItem(TIGER_AI_DISMISSED_KEY) === '1',
        hasLauncher: !!launcher,
        hasPanel: !!panel,
        historyLength: chatHistory.length,
        isLoading
      };
    },
    reloadConfig: async function () {
      await loadAiConfig();
      if (aiConfig && aiConfig.enabled !== false) {
        if (launcher) launcher.style.display = '';
      }
    }
  };

  // Debug helper - can be called from browser console
  window.resetTigerAI = function() {
    console.log('[TigerAI] Reset called from console');
    if (window.TigerAI) {
      window.TigerAI.resetAssistant();
    }
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already ready
    init();
  }

  console.log('[TigerAI] Script loaded v' + TIGER_AI_VERSION);
  console.log('[TigerAI] Debug commands: window.TigerAI.debug() | window.resetTigerAI()');
})();