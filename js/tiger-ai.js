// ====== Tiger AI Assistant - Enhanced Version ======
// الإصدار 3.0 - ذكي مع دعم المنتجات والتتبع

(function() {
  'use strict';
  
  // ====== Configuration ======
  const DEFAULT_NVIDIA_API_URL = 'https://tigerorder.studegy10.workers.dev/v1';
  const SITE_URL = 'https://tiger-jeans.com';
  
  // ====== State ======
  window.TigerAI = {
    enabled: false,
    config: {},
    productsCache: null,
    productsCacheTime: 0,
    cacheDuration: 5 * 60 * 1000, // 5 minutes
    isStreaming: false,
    abortController: null,
    conversationHistory: [],
    maxHistoryLength: 10
  };
  
  // ====== Products Data Management ======
  
  // Fetch all active products from Firebase
  async function fetchProductsFromFirebase() {
    const now = Date.now();
    
    // Return cache if still valid
    if (window.TigerAI.productsCache && (now - window.TigerAI.productsCacheTime) < window.TigerAI.cacheDuration) {
      return window.TigerAI.productsCache;
    }
    
    try {
      const snap = await db.ref('products').orderByChild('active').equalTo(true).once('value');
      const data = snap.val();
      
      if (!data) return [];
      
      const products = Object.entries(data).map(([id, product]) => ({
        id,
        ...product,
        url: `${SITE_URL}/#product-${id}`
      }));
      
      // Cache the results
      window.TigerAI.productsCache = products;
      window.TigerAI.productsCacheTime = now;
      
      console.log(`[TigerAI] Loaded ${products.length} products from Firebase`);
      return products;
    } catch (error) {
      console.error('[TigerAI] Error fetching products:', error);
      return window.TigerAI.productsCache || [];
    }
  }
  
  // Format product data for AI context
  function formatProductForAI(product) {
    const colors = (product.colors || []).map(c => c.name).join('، ');
    const sizes = (product.sizes || []).join('، ');
    const price = product.price || 0;
    const oldPrice = product.oldPrice || 0;
    const discount = oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0;
    
    let text = `📦 اسم المنتج: ${product.name}\n`;
    text += `   السعر: ${price} ج.م${discount > 0 ? ` (خصم ${discount}%)` : ''}\n`;
    text += `   الألوان المتاحة: ${colors || 'غير محدد'}\n`;
    text += `   المقاسات المتاحة: ${sizes || 'غير محدد'}\n`;
    text += `   التصنيف: ${product.category || 'عام'}\n`;
    text += `   الوصف: ${(product.description || '').substring(0, 200)}...\n`;
    text += `   الرابط: ${product.url}\n`;
    
    // Stock info (limited for customers)
    if (product.stock) {
      const lowStockItems = Object.entries(product.stock)
        .filter(([key, qty]) => qty <= 3)
        .map(([key]) => key.replace(/_/g, ' - '));
      
      if (lowStockItems.length > 0) {
        text += `   ⚠️ مقاسات شبه نفذت: ${lowStockItems.join('، ')}`;
      }
    }
    
    return text;
  }
  
  // Search products by query
  async function searchProducts(query) {
    const products = await fetchProductsFromFirebase();
    const queryLower = query.toLowerCase();
    
    // Score each product
    const scored = products.map(product => {
      let score = 0;
      const nameLower = (product.name || '').toLowerCase();
      const descLower = (product.description || '').toLowerCase();
      const categoryLower = (product.category || '').toLowerCase();
      
      // Exact name match
      if (nameLower.includes(queryLower)) score += 10;
      
      // Partial matches
      const words = queryLower.split(/\s+/);
      words.forEach(word => {
        if (word.length > 2) {
          if (nameLower.includes(word)) score += 5;
          if (descLower.includes(word)) score += 3;
          if (categoryLower.includes(word)) score += 4;
          
          // Color match
          if (product.colors) {
            product.colors.forEach(c => {
              if ((c.name || '').toLowerCase().includes(word)) score += 4;
            });
          }
          
          // Size match
          if (product.sizes && product.sizes.includes(word)) score += 3;
        }
      });
      
      // Featured boost
      if (product.featured) score += 2;
      
      return { ...product, _score: score };
    });
    
    // Filter and sort
    return scored
      .filter(p => p._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 10)
      .map(({ _score, ...rest }) => rest);
  }
  
  // Get order tracking info
  async function getOrderTracking(phoneOrCode) {
    try {
      // Normalize input
      let query = phoneOrCode.trim();
      query = query.replace(/\D/g, '');
      if (query.startsWith('2') && query.length > 10) query = query.substring(1);
      if (!query.startsWith('0') && /^\d{10}$/.test(query)) query = '0' + query;
      
      // Try to find by order code first
      if (query.toUpperCase().startsWith('TJ-')) {
        const snap = await db.ref('orders')
          .orderByChild('code')
          .equalTo(query.toUpperCase())
          .once('value');
        const data = snap.val();
        if (data) return Object.values(data)[0];
      }
      
      // Then try by phone
      if (/^01\d{9}$/.test(query)) {
        const snap = await db.ref('orders')
          .orderByChild('customer/phone')
          .equalTo(query)
          .limitToLast(5)
          .once('value');
        const data = snap.val();
        if (data) return Object.values(data);
      }
      
      return null;
    } catch (error) {
      console.error('[TigerAI] Tracking error:', error);
      return null;
    }
  }
  
  // Format tracking response
  function formatTrackingResponse(orders) {
    if (!orders) return 'لم يتم العثور على طلبات بهذه البيانات. تأكد من رقم التليفون أو كود الطلب.';
    
    const ordersArray = Array.isArray(orders) ? orders : [orders];
    
    let response = '📋 **طلباتك لدى Tiger Jeans:**\n\n';
    
    ordersArray.forEach(order => {
      const statusMap = {
        pending: '⏳ قيد الانتظار',
        confirmed: '✅ تم التأكيد',
        processing: '🔄 جاري التجهيز',
        shipping: '🚚 تم الشحن',
        delivered: '🎉 تم التسليم',
        cancelled: '❌ ملغي'
      };
      
      const status = statusMap[order.status] || order.status;
      response += `🔖 **${order.code}**\n`;
      response += `الحالة: ${status}\n`;
      response += `الإجمالي: **${fmtPrice(order.total)}**\n`;
      
      if (order.status === 'shipping' && order.trackingNumber) {
        const bostaLink = `https://track.bosta.co/shipments/${order.trackingNumber}`;
        response += `رقم التتبع: ${order.trackingNumber}\n`;
        response += `[تتبع الشحنة على بوستا](${bostaLink})\n`;
      }
      
      response += '\n';
    });
    
    return response;
  }
  
  // ====== AI Configuration ======
  
  async function loadAIConfig() {
    try {
      const snap = await db.ref('aiConfig/public').once('value');
      const config = snap.val();
      
      if (config) {
        window.TigerAI.config = config;
        window.TigerAI.enabled = config.enabled !== false;
        
        console.log('[TigerAI] Config loaded, enabled:', window.TigerAI.enabled);
      }
      
      return config;
    } catch (error) {
      console.error('[TigerAI] Error loading config:', error);
      return null;
    }
  }
  
  // Build system prompt with real product data
  async function buildSystemPrompt() {
    const basePrompt = window.TigerAI.config.systemPrompt || `أنت "تايجر AI" المساعد الذكي الرسمي لمتجر Tiger Jeans.
قواعد صارمة جداً لا تكسرها أبداً:
1. أجب دائمًا واستخرج المنتجات من قاعدة بيانات المتجر فقط.
2. يُمنع منعاً باتاً ابتكار منتجات وهمية أو ذكر منتجات غير موجودة لدينا.
3. عند تزويد العميل برابط أي منتج، يجب أن يكون الرابط حقيقي وقابل للضغط.
4. استخدم لهجة عربية مصرية واضحة وودودة.`;
    
    // Add products context
    const products = await fetchProductsFromFirebase();
    const productsContext = products.slice(0, 50).map(formatProductForAI).join('\n\n');
    
    const enhancedPrompt = `${basePrompt}

═══════════════════════════════════════
📦 قائمة المنتجات المتاحة حالياً في المتجر:
(استخدم هذه البيانات فقط عند الإجابة عن الأسئلة)

${productsContext}
═══════════════════════════════════════

🔗 تنسيق الروابط:
- رابط المنتج: https://tiger-jeans.com/#product-{id}
- رابط تتبع بوستا: https://track.bosta.co/shipments/{trackingNumber}

💡 تعليمات إضافية:
1. عندما يسأل العميل عن منتج، ابحث في القائمة أعلاه فقط
2. قدم معلومات دقيقة عن السعر والمقاسات والألوان
3. اذكر دائماً رابط المنتج القابل للضغط
4. إذا طلب تتبع طلبه، اطلب منه رقم تليفونه أو كود الطلب
5. لا تذكر أبداً تكلفة المنتج أو الأرباح`;

    return enhancedPrompt;
  }
  
  // ====== Chat Completions API ======
  
  async function sendMessage(userMessage, options = {}) {
    if (!window.TigerAI.enabled) {
      return { 
        success: false, 
        error: 'المساعد الذكي غير مفعّل حالياً' 
      };
    }
    
    // Check if it's a tracking request
    const trackMatch = userMessage.match(/(?:تتبع|tracking|追踪|طلب|شحنة)\s*[::]?\s*(.+)/i);
    if (trackMatch) {
      const trackingInfo = await getOrderTracking(trackMatch[1].trim());
      if (trackingInfo) {
        return {
          success: true,
          message: formatTrackingResponse(trackingInfo),
          isTrackingResponse: true
        };
      }
    }
    
    // Check for product search intent
    const products = await searchProducts(userMessage);
    let productContext = '';
    if (products.length > 0) {
      productContext = '\n\n📦 **منتجات مطابقة لطلبك:**\n';
      products.forEach((p, i) => {
        productContext += `${i+1}. **${p.name}** - ${p.price} ج.م\n`;
        productContext += `   [عرض المنتج](${p.url})\n\n`;
      });
    }
    
    // Build messages array
    const systemPrompt = await buildSystemPrompt();
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...window.TigerAI.conversationHistory.slice(-window.TigerAI.maxHistoryLength),
      { 
        role: 'user', 
        content: userMessage + productContext 
      }
    ];
    
    // Get model settings
    const textModel = window.TigerAI.config.textModel || 'meta/llama-3.1-8b-instruct';
    const maxTokens = window.TigerAI.config.maxTokens || 1500;
    const temperature = window.TigerAI.config.temperature || 0.6;
    
    // Create abort controller for streaming cancellation
    window.TigerAI.abortController = new AbortController();
    
    try {
      const response = await fetch(`${DEFAULT_NVIDIA_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          model: textModel,
          messages: messages,
          max_tokens: maxTokens,
          temperature: temperature,
          stream: true
        }),
        signal: window.TigerAI.abortController.signal
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }
      
      // Handle streaming response
      return await handleStreamResponse(response, userMessage);
      
    } catch (error) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'تم إلغاء الطلب', cancelled: true };
      }
      console.error('[TigerAI] API Error:', error);
      return { success: false, error: error.message };
    }
  }
  
  async function handleStreamResponse(response, userMessage) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';
    
    window.TigerAI.isStreaming = true;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          
          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                
                // Call onStream callback if available
                if (typeof window.TigerAI.onStream === 'function') {
                  window.TigerAI.onStream(content, fullContent);
                }
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
      
      // Save to conversation history
      window.TigerAI.conversationHistory.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: fullContent }
      );
      
      window.TigerAI.isStreaming = false;
      
      return {
        success: true,
        message: fullContent
      };
      
    } catch (error) {
      window.TigerAI.isStreaming = false;
      throw error;
    }
  }
  
  // Non-streaming version for simple queries
  async function sendMessageSimple(userMessage) {
    if (!window.TigerAI.enabled) {
      return { success: false, error: 'المساعد غير مفعّل' };
    }
    
    const systemPrompt = await buildSystemPrompt();
    const textModel = window.TigerAI.config.textModel || 'meta/llama-3.1-8b-instruct';
    
    try {
      const response = await fetch(`${DEFAULT_NVIDIA_API_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: textModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          max_tokens: 500,
          temperature: 0.6
        })
      });
      
      const data = await response.json();
      
      if (data.choices && data.choices[0]) {
        return {
          success: true,
          message: data.choices[0].message.content
        };
      }
      
      return { success: false, error: 'لا استجابة من الذكاء الاصطناعي' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  // Vision/Image analysis
  async function analyzeImage(imageBase64, prompt = 'صف هذا المنتج واقترح منتجات مشابهة من المتجر') {
    if (!window.TigerAI.enabled) {
      return { success: false, error: 'المساعد غير مفعّل' };
    }
    
    const visionModel = window.TigerAI.config.visionModel || 'meta/llama-3.2-90b-vision-instruct';
    const systemPrompt = await buildSystemPrompt();
    
    try {
      const response = await fetch(`${DEFAULT_NVIDIA_API_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: visionModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { 
              role: 'user', 
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageBase64 } }
              ]
            }
          ],
          max_tokens: 800,
          temperature: 0.5
        })
      });
      
      const data = await response.json();
      
      if (data.choices && data.choices[0]) {
        return {
          success: true,
          message: data.choices[0].message.content
        };
      }
      
      return { success: false, error: 'لا استجابة' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  // Cancel current request
  function cancelRequest() {
    if (window.TigerAI.abortController) {
      window.TigerAI.abortController.abort();
      window.TigerAI.isStreaming = false;
    }
  }
  
  // Clear conversation history
  function clearHistory() {
    window.TigerAI.conversationHistory = [];
  }
  
  // Refresh products cache
  function refreshProducts() {
    window.TigerAI.productsCache = null;
    window.TigerAI.productsCacheTime = 0;
  }
  
  // ====== UI Components ======
  
  function createAIChatWidget() {
    // Check if widget already exists
    if (document.getElementById('tiger-ai-widget')) return;
    
    const widget = document.createElement('div');
    widget.id = 'tiger-ai-widget';
    widget.innerHTML = `
      <div class="ai-chat-toggle" id="aiToggle" title="مساعد تايجر AI">
        <span class="ai-icon">🤖</span>
        <span class="ai-badge" style="display:none">1</span>
      </div>
      <div class="ai-chat-container" id="aiContainer" style="display:none">
        <div class="ai-header">
          <div class="ai-title">
            <span>🐯 تايجر AI</span>
            <span class="ai-status" id="aiStatus"></span>
          </div>
          <button class="ai-close" id="aiClose">✕</button>
        </div>
        <div class="ai-messages" id="aiMessages">
          <div class="ai-welcome">
            <p>مرحباً بك! 👋</p>
            <p>أنا مساعدك الذكي لتايگر چينز. أسألني عن:</p>
            <ul>
              <li>المنتجات والأسعار</li>
              <li>المقاسات المناسبة</li>
              <li>تتبع طلباتك</li>
              <li>أي سؤال عن المتجر</li>
            </ul>
          </div>
        </div>
        <div class="ai-input-area">
          <input type="text" id="aiInput" placeholder="اكتب سؤالك هنا..." />
          <button id="aiSend">إرسال</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(widget);
    
    // Load CSS if not present
    if (!document.querySelector('link[href*="tiger-ai.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'css/tiger-ai.css';
      document.head.appendChild(link);
    }
    
    setupAIEventListeners();
  }
  
  function setupAIEventListeners() {
    const toggle = document.getElementById('aiToggle');
    const container = document.getElementById('aiContainer');
    const closeBtn = document.getElementById('aiClose');
    const sendBtn = document.getElementById('aiSend');
    const input = document.getElementById('aiInput');
    
    if (toggle) {
      toggle.addEventListener('click', () => {
        container.style.display = container.style.display === 'none' ? 'flex' : 'none';
        if (container.style.display === 'flex') input.focus();
      });
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        container.style.display = 'none';
      });
    }
    
    async function handleSend() {
      const message = input.value.trim();
      if (!message || window.TigerAI.isStreaming) return;
      
      input.value = '';
      addAIMessage(message, 'user');
      
      const statusEl = document.getElementById('aiStatus');
      if (statusEl) statusEl.textContent = 'يفكر...';
      
      const result = await sendMessage(message);
      
      if (result.success) {
        addAIMessage(result.message, 'assistant');
      } else {
        addAIMessage(`❌ عذراً، حدث خطأ: ${result.error}`, 'error');
      }
      
      if (statusEl) statusEl.textContent = '';
    }
    
    if (sendBtn) sendBtn.addEventListener('click', handleSend);
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
      });
    }
  }
  
  function addAIMessage(content, type) {
    const messagesContainer = document.getElementById('aiMessages');
    if (!messagesContainer) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = `ai-message ai-message-${type}`;
    
    // Parse markdown-like links
    const formattedContent = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/\n/g, '<br>');
    
    msgDiv.innerHTML = formattedContent;
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  // ====== Initialize =====+
  
  async function init() {
    await loadAIConfig();
    
    if (window.TigerAI.enabled) {
      createAIChatWidget();
      
      // Pre-load products
      fetchProductsFromFirebase();
    }
    
    console.log('%c🤖 Tiger AI Loaded', 'color: #d4af37; font-weight: bold;');
  }
  
  // Auto-init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // ====== Public API ======
  window.TigerAI.sendMessage = sendMessage;
  window.TigerAI.sendMessageSimple = sendMessageSimple;
  window.TigerAI.analyzeImage = analyzeImage;
  window.TigerAI.searchProducts = searchProducts;
  window.TigerAI.trackOrder = getOrderTracking;
  window.TigerAI.cancelRequest = cancelRequest;
  window.TigerAI.clearHistory = clearHistory;
  window.TigerAI.refreshProducts = refreshProducts;
  window.TigerAI.createWidget = createAIChatWidget;
  
})();
