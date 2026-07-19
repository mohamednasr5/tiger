# إعداد خدمة إشعارات تليجرام 📱

## خطوات الإعداد:

### 1. إنشاء بوت تليجرام
1. افتح تليجرام وابحث عن **@BotFather**
2. أرسل `/newbot`
3. اكتب اسم البوت (مثلاً: `Tiger Jeans Bot`)
4. اكتب username البوت (مثلاً: `tiger_jeans_store_bot`)
5. ستحصل على **Bot Token** - احفظه في مكان آمن

### 2. الحصول على Chat ID
1. ابحث عن **@userinfobot** على تليجرام
2. أرسل أي رسالة للبوت
3. سيرد عليك بـ **Chat ID** الخاص بك (رقم)

### 3. تهيئة البيئة
في Cloudflare Workers (أو بيئة الاستضافة):
```
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=987654321
```

### 4. اختبار الإشعارات
بعد الإعداد، اختبر الإشعار:
```bash
curl -X POST https://your-worker.dev/api/notify/order \
  -H "Content-Type: application/json" \
  -d '{"orderId": "TEST-001", "customer": "اختبار", "total": 100}'
```

## نقاط النهاية المتاحة:

| المسار | الوصف |
|--------|-------|
| `/api/notify/order` | إشعار طلب جديد |
| `/api/notify/payment` | إشعار تأكيد دفع |
| `/api/notify/preorder` | إشعار طلب مسبق |
| `/api/notify/lowstock` | إشعار مخزون منخفض |
| `/api/notify/status` | إشعار تغيير حالة |

## استكشاف الأخطاء:

### المشكلة: "401 Unauthorized"
**الحل:** تحقق من صحة Bot Token

### المشكلة: "400 Bad Request: chat not found"
**الحل:** تحقق من صحة Chat ID

### المشكلة: لا تصل الإشعارات
**الحل:** 
1. تأكد أن البوت تم تشغيله عبر `/start`
2. تحقق من سجلات Cloudflare Workers

---

**ملاحظة:** هذه الخدمة تعمل كـ Cloudflare Worker مستقل، وليست جزءًا من الموقع الرئيسي.
