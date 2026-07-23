/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Tiger Jeans - AI Admin Panel (NVIDIA)                       ║
 * ║  ================================                            ║
 * ║  إعدادات مساعد الذكاء الاصطناعي على الموقع                  ║
 * ║  يستخدم NVIDIA NIM API فقط (للمساعد على الموقع)             ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════
// ⚙️ الإعدادات الافتراضية
// ═══════════════════════════════════════════════════════════════

const AI_DEFAULTS = {
  enabled: false,
  
  // NVIDIA API (يتم تخزين المفتاح في Worker Secret)
  nvidiaApiKey: '',
  
  // النماذج
  textModel: 'meta/llama-3.1-70b-instruct',
  visionModel: 'meta/llama-3.2-90b-vision-instruct',
  reasoningModel: 'deepseek-ai/deepseek-r1',
  
  // المزايا
  features: {
    smartSearch: true,      // بحث ذكي
    visionSearch: true,     // بحث بالصور
    outfitAdvisor: true,    // منسق الإطلالات
    sizeAdvisor: true,      // مستشار المقاسات
    cartSuggestions: true,  // اقتراحات السلة
    customerService: true,  // خدمة العملاء
    giftAssistant: true     // مساعد الهدية
  },
  
  // البرومبتات
  customerPrompt: `أنت مساعد ذكي لمتجر "Tiger Jeans" للملابس الرجالية. مهمتك:
  
1. مساعدة العملاء في العثور على المنتجات المناسبة
2. تقديم نصائح حول المقاسات والألوان
3. اقتراح إطلالات كاملة ومتناسقة
4. الإجابة عن أسعار المنتجات والمخزون المتاح

كن ودوداً واحترافياً. أجب بالعربية دائماً.
استخدم الإيموجي لتنسيق الردود.`,

  adminPrompt: `أنت مساعد إداري ذكي لمتجر "Tiger Jeans". صلاحياتك:

📊 التحليلات:
- تحليل المبيعات والأرباح
- مقارنة الأداء بالفترات السابقة
- توقع المبيعات القادمة

📦 المخزون:
- تنبيهات المخزون المنخفض
- اقتراحات إعادة الطلب
- تحليل حركة المنتجات

👥 العملاء:
- تحليل سلوك العملاء
- تقسيم العملاء (Segmentation)
- اقتراحات للحفاظ على العملاء

✍️ المحتوى:
- كتابة أوصاف SEO
- إنشاء عروض تسويقية
- صياغة رسائل التسويق

كن دقيقاً في الأرقام. استخدم الرسوم البيانية النصية عند الحاجة.`
};

let AI_CONFIG = { ...AI_DEFAULTS };

// ═══════════════════════════════════════════════════════════════
// 🔄 تحميل الإعدادات
// ═══════════════════════════════════════════════════════════════

async function loadAIConfig() {
  try {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
      const db = firebase.database();
      
      // تحميل الإعدادات العامة
      const publicSnap = await db.ref('aiConfig/public').once('value');
      if (publicSnap.exists()) {
        const publicData = publicSnap.val();
        AI_CONFIG = { ...AI_CONFIG, ...publicData };
      }
      
      // تحميل الإعدادات السرية (للأدمن فقط)
      const secretSnap = await db.ref('aiConfig/secret').once('value');
      if (secretSnap.exists()) {
        const secretData = secretSnap.val();
        AI_CONFIG.nvidiaApiKey = secretData.apiKey || '';
        AI_CONFIG.adminPrompt = secretData.adminPrompt || AI_DEFAULTS.adminPrompt;
      }

      console.log('✅ تم تحميل إعدادات AI');
      updateAIUI();
      return true;
    }
  } catch (error) {
    console.error('❌ خطأ في تحميل إعدادات AI:', error);
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
// 💾 حفظ الإعدادات
// ═══════════════════════════════════════════════════════════════

async function saveAIConfig() {
  // جمع البيانات من الواجهة
  collectAIFromUI();

  try {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
      const db = firebase.database();
      
      // حفظ الإعدادات العامة
      await db.ref('aiConfig/public').set({
        enabled: AI_CONFIG.enabled,
        textModel: AI_CONFIG.textModel,
        visionModel: AI_CONFIG.visionModel,
        reasoningModel: AI_CONFIG.reasoningModel,
        features: AI_CONFIG.features,
        customerPrompt: AI_CONFIG.customerPrompt,
        updatedAt: new Date().toISOString()
      });

      // حفظ الإعدادات السرية
      await db.ref('aiConfig/secret').set({
        apiKey: AI_CONFIG.nvidiaApiKey || '',
        adminPrompt: AI_CONFIG.adminPrompt,
        updatedAt: new Date().toISOString()
      });

      console.log('✅ تم حفظ إعدادات AI');
      showToast('✅ تم حفظ إعدادات المساعد الذكي');
      
      // تحديث الشارة
      updateAIBadge();
      
      return true;
    }
  } catch (error) {
    console.error('❌ خطأ في الحفظ:', error);
    showToast('❌ فشل حفظ الإعدادات: ' + error.message);
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
// 🎨 تحديث واجهة المستخدم
// ═══════════════════════════════════════════════════════════════

function updateAIUI() {
  // حالة التفعيل
  const enabledEl = document.getElementById('aiEnabled');
  if (enabledEl) enabledEl.checked = AI_CONFIG.enabled;

  // النماذج
  const textModelEl = document.getElementById('aiTextModel');
  if (textModelEl) textModelEl.value = AI_CONFIG.textModel;

  const visionModelEl = document.getElementById('aiVisionModel');
  if (visionModelEl) visionModelEl.value = AI_CONFIG.visionModel;

  const reasoningModelEl = document.getElementById('aiReasoningModel');
  if (reasoningModelEl) reasoningModelEl.value = AI_CONFIG.reasoningModel;

  // البرومبتات
  const customerPromptEl = document.getElementById('aiCustomerPrompt');
  if (customerPromptEl) customerPromptEl.value = AI_CONFIG.customerPrompt;

  const adminPromptEl = document.getElementById('aiAdminPrompt');
  if (adminPromptEl) adminPromptEl.value = AI_CONFIG.adminPrompt;

  // المزايا
  Object.keys(AI_CONFIG.features).forEach(feature => {
    const el = document.getElementById(`aiFeature_${feature}`);
    if (el) el.checked = AI_CONFIG.features[feature];
  });
}

function collectAIFromUI() {
  const enabledEl = document.getElementById('aiEnabled');
  if (enabledEl) AI_CONFIG.enabled = enabledEl.checked;

  const textModelEl = document.getElementById('aiTextModel');
  if (textModelEl) AI_CONFIG.textModel = textModelEl.value;

  const visionModelEl = document.getElementById('aiVisionModel');
  if (visionModelEl) AI_CONFIG.visionModel = visionModelEl.value;

  const reasoningModelEl = document.getElementById('aiReasoningModel');
  if (reasoningModelEl) AI_CONFIG.reasoningModel = reasoningModelEl.value;

  const customerPromptEl = document.getElementById('aiCustomerPrompt');
  if (customerPromptEl) AI_CONFIG.customerPrompt = customerPromptEl.value;

  const adminPromptEl = document.getElementById('aiAdminPrompt');
  if (adminPromptEl) AI_CONFIG.adminPrompt = adminPromptEl.value;

  Object.keys(AI_CONFIG.features).forEach(feature => {
    const el = document.getElementById(`aiFeature_${feature}`);
    if (el) AI_CONFIG.features[feature] = el.checked;
  });
}

function updateAIBadge() {
  const badge = document.getElementById('navAiStatus');
  if (!badge) return;
  
  badge.style.display = AI_CONFIG.enabled ? 'inline' : 'none';
}

// ═══════════════════════════════════════════════════════════════
// 🧪 اختبار الاتصال بـ NVIDIA
// ═══════════════════════════════════════════════════════════════

async function testNVIDIAConnection() {
  const apiKey = document.getElementById('nvidiaApiKey')?.value || AI_CONFIG.nvidiaApiKey;
  
  if (!apiKey) {
    showToast('❌ أدخل مفتاح NVIDIA API');
    return false;
  }

  const testBtn = document.getElementById('testNvidiaBtn');
  if (testBtn) {
    testBtn.disabled = true;
    testBtn.textContent = 'جاري الاختبار...';
  }

  try {
    // استخدام Worker كـ Proxy
    const response = await fetch(`${getWorkerUrl()}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-70b-instruct',
        messages: [{ role: 'user', content: 'Hello, respond with OK' }],
        max_tokens: 10
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.choices && data.choices[0]) {
        showToast('✅ الاتصال بـ NVIDIA ناجح!');
        return true;
      }
    }
    
    throw new Error('Invalid response');
  } catch (error) {
    console.error('NVIDIA Test Error:', error);
    showToast('❌ فشل الاتصال: ' + error.message);
    return false;
  } finally {
    if (testBtn) {
      testBtn.disabled = false;
      testBtn.textContent = 'اختبار الاتصال';
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔄 إعادة تعيين البرومبتات
// ═══════════════════════════════════════════════════════════════

function resetCustomerPrompt() {
  const el = document.getElementById('aiCustomerPrompt');
  if (el) el.value = AI_DEFAULTS.customerPrompt;
  showToast('📝 تم إعادة تعيين برومبت العملاء');
}

function resetAdminPrompt() {
  const el = document.getElementById('aiAdminPrompt');
  if (el) el.value = AI_DEFAULTS.adminPrompt;
  showToast('📝 تم إعادة تعيين برومبت الأدمن');
}

// ═══════════════════════════════════════════════════════════════
// 🔗 الحصول على رابط Worker
// ═══════════════════════════════════════════════════════════════

function getWorkerUrl() {
  // يمكن تغيير هذا حسب إعداداتك
  return 'https://telegram.studegy10.workers.dev';
}

// ═══════════════════════════════════════════════════════════════
// ✍️ توليد وصف منتج احترافي ومتوافق مع SEO بالذكاء الاصطناعي
// ═══════════════════════════════════════════════════════════════

async function generateProductDescriptionAI() {
  const nameEl = document.getElementById('pName');
  const descEl = document.getElementById('pDesc');
  const catEl = document.getElementById('pCategory');
  const btn = document.getElementById('aiDescBtn');

  if (!nameEl || !descEl) return;

  const name = nameEl.value.trim();
  if (!name) {
    if (typeof showToast === 'function') showToast('❌ اكتب اسم المنتج أولاً قبل توليد الوصف');
    nameEl.focus();
    return;
  }

  if (!AI_CONFIG.nvidiaApiKey) {
    if (typeof showToast === 'function') showToast('⚠️ فعّل ذكاء Tiger AI وأدخل مفتاح NVIDIA من إعدادات الذكاء الاصطناعي أولاً');
    return;
  }

  const category = (catEl && catEl.value.trim()) || '';
  const originalBtnHTML = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> جاري التوليد...";
  }

  const prompt = `اكتب وصف منتج احترافي لمتجر ملابس إلكتروني "Tiger Jeans"، باللغة العربية، مُحسّن لمحركات البحث (SEO) بنسبة 100% لظهور المنتج في أوائل نتائج البحث.

اسم المنتج: "${name}"${category ? `\nالفئة: "${category}"` : ''}

الشروط:
- من 3 إلى 5 جمل قصيرة وجذابة، بدون أي مقدمات أو عناوين أو رموز.
- ادمج كلمات مفتاحية طبيعية مرتبطة بالمنتج والفئة (مثل نوع القصة، الخامة، المناسبة) دون حشو.
- أبرز الجودة، الخامة، الراحة، والمناسبة للاستخدام اليومي حسب نوع المنتج.
- أسلوب تسويقي مقنع يشجع على الشراء الفوري.
- فقرة نصية عادية متصلة فقط، بدون Markdown وبدون علامات اقتباس.
- لا تكرر اسم المنتج أكثر من مرتين.`;

  try {
    const response = await fetch(`${getWorkerUrl()}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.nvidiaApiKey}`
      },
      body: JSON.stringify({
        model: AI_CONFIG.textModel || AI_DEFAULTS.textModel,
        messages: [
          { role: 'system', content: 'أنت خبير كتابة محتوى تسويقي وتحسين محركات البحث (SEO) لمتاجر الملابس الإلكترونية باللغة العربية.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 350,
        temperature: 0.7
      })
    });

    if (!response.ok) throw new Error(`فشل الاتصال بخدمة الذكاء الاصطناعي (${response.status})`);

    const data = await response.json();
    const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
      ? data.choices[0].message.content.trim()
      : '';

    if (!text) throw new Error('لم يتم توليد أي نص، حاول مرة أخرى');

    descEl.value = text.replace(/^["'«»\s]+|["'«»\s]+$/g, '');
    if (typeof showToast === 'function') showToast('✅ تم توليد الوصف بنجاح');
  } catch (error) {
    console.error('AI Description Generation Error:', error);
    if (typeof showToast === 'function') showToast('❌ فشل توليد الوصف: ' + (error.message || 'خطأ غير متوقع'));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalBtnHTML;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 🎯 تصدير الوحدة العامة
// ═══════════════════════════════════════════════════════════════

window.TigerAIAdmin = {
  config: AI_CONFIG,
  
  load: loadAIConfig,
  save: saveAIConfig,
  test: testNVIDIAConnection,
  
  resetCustomerPrompt,
  resetAdminPrompt,
  generateDescription: generateProductDescriptionAI,

  isEnabled() {
    return AI_CONFIG.enabled;
  },

  getModel(type) {
    switch (type) {
      case 'text': return AI_CONFIG.textModel;
      case 'vision': return AI_CONFIG.visionModel;
      case 'reasoning': return AI_CONFIG.reasoningModel;
      default: return AI_CONFIG.textModel;
    }
  },

  isFeatureEnabled(feature) {
    return AI_CONFIG.features[feature] || false;
  }
};

// ═══════════════════════════════════════════════════════════════
// 🚀 التهيئة
// ═══════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      loadAIConfig();
    }, 2000);
  });
}

console.log('🤖 Tiger AI Admin Module Loaded (NVIDIA)');
