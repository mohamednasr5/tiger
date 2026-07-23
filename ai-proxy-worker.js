/**
 * Tiger Jeans - NVIDIA AI Proxy Worker
 * ====================================
 * Proxy لطلبات NVIDIA NIM API عشان يتخطى مشكلة CORS اللي بتمنع
 * المتصفح من الاتصال المباشر بـ integrate.api.nvidia.com.
 *
 * ====================================================================
 * التحديث المهم: مفتاح NVIDIA بقى مُخزّن هنا فقط (Secret على الـ Worker)
 * ====================================================================
 * قبل كده، كان المتصفح (js/tiger-ai.js) لازم يبعت مفتاح NVIDIA API مع
 * كل طلب في الـ Authorization header. المفتاح كان متخزن في Firebase
 * تحت aiConfig/secret اللي قاعدة البيانات بتمنع أي حد غير مسجل دخول
 * (auth != null) من قراءته — يعني أي عميل زائر (مش مسجل دخول) مستحيل
 * يوصل للمفتاح، فالمساعد كان بيظهر "غير مُفعّل" لكل العملاء دايماً.
 *
 * الحل: المفتاح دلوقتي بيتخزن هنا فقط كـ Secret على الـ Worker نفسه
 * (مش في قاعدة البيانات خالص)، والـ Worker هو اللي بيضيفه لطلب NVIDIA.
 * المتصفح (عميل أو أدمن) مبقاش محتاج يعرف المفتاح الحقيقي خالص.
 *
 * لو حد بعت Authorization header بمفتاح من عنده (زي زرار "اختبار
 * الاتصال" في لوحة التحكم لما الأدمن يجرب مفتاح جديد قبل ما يحفظه)،
 * الـ Worker بيستخدم المفتاح ده بدل مفتاحه الافتراضي لهذا الطلب بس.
 *
 * ====================================================================
 * خطوات الديبلوي:
 * ====================================================================
 * 1) اضبط الـ Secret (مرة واحدة فقط، من جهازك):
 *      wrangler secret put NVIDIA_API_KEY
 *    (هيطلب منك تلصق المفتاح، مش هيظهر في أي كود أو في Git)
 *
 *    أو من Cloudflare Dashboard:
 *      Workers & Pages → اختر الـ Worker → Settings → Variables and Secrets
 *      → Add → الاسم: NVIDIA_API_KEY → النوع: Secret → القيمة: مفتاحك
 *
 * 2) Deploy:
 *      wrangler deploy
 *    أو الصق هذا الكود في محرر الـ Worker على Cloudflare Dashboard مباشرة
 *    ثم Deploy (الـ Secret من خطوة 1 بيفضل زي ما هو، مش بيتمسح بالـ deploy).
 *
 * 3) تأكد إن NVIDIA_BASE في js/tiger-ai.js بيشاور على دومين الـ Worker
 *    بتاعك (موجود بالفعل: https://tigerorder.studegy10.workers.dev/v1).
 */

const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept'
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (!url.pathname.startsWith('/v1/')) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Prefer a client-supplied key (used only when the admin panel tests a
    // specific key before saving it). Otherwise fall back to the Worker's
    // own secret — this is the path every real customer/admin chat uses.
    const clientAuth = request.headers.get('Authorization') || '';
    const clientKey = clientAuth.replace(/^Bearer\s+/i, '').trim();
    const apiKey = clientKey || env.NVIDIA_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'لا يوجد مفتاح NVIDIA API. اضبط NVIDIA_API_KEY كـ Secret على الـ Worker (wrangler secret put NVIDIA_API_KEY).'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const targetUrl = `${NVIDIA_BASE}${url.pathname.replace('/v1', '')}`;
    const accept = request.headers.get('Accept') || 'application/json';

    let upstream;
    try {
      upstream = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': accept
        },
        body: await request.text()
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: `Upstream fetch failed: ${e.message}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const isStream = accept.includes('text/event-stream');

    const respHeaders = new Headers(corsHeaders);
    respHeaders.set('Content-Type', isStream ? 'text/event-stream' : 'application/json');

    return new Response(upstream.body, {
      status: upstream.status,
      headers: respHeaders
    });
  }
};
