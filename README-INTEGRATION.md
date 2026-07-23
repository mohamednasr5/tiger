# 📦 حزمة Tiger Jeans الكاملة - مع إشعارات Telegram الفورية

## ✅ ما تم إضافته (بدون تغيير على شكل الموقع):

### 1️⃣ نظام الإشعارات الفورية
تم إضافة `telegram-notifications.js` لجميع الصفحات:
- ✅ **checkout.html** - إشعار عند طلب جديد
- ✅ **gift-cards.html** - إشعار عند طلب بطاقة هدايا
- ✅ **gift-card.html** - إشعار عند فتح بطاقة
- ✅ **admin.html** - لوحة تحكم البوت
- ✅ **cart.html** - السلة
- ✅ **about.html** - من نحن
- ✅ **contact.html** - اتصل بنا
- ✅ **404.html** - صفحة الخطأ

### 2️⃣ Worker محدث (v2.0)
ملف `tiger-jeans-worker-v2.js` يحتوي على:
- ✅ **بيانات حقيقية من Firebase** (بدلاً من أرقام وهمية)
- ✅ **إشعارات فورية** للطلبات والدفع والمخزون
- ✅ **إحصائيات حقيقية** للمتجر

### 3️⃣ قواعد أمان Firebase
ملف `firebase-rules.json` محدث للسماح بالوصول.

---

## 📋 خطوات التثبيت:

### الخطوة 1: نشر Worker الجديد على Cloudflare

1. اذهب إلى [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Workers & Pages → `tiger-jeans-worker`
3. **استبدل الكود** بملف: `tiger-jeans-worker-v2.js`
4. اضغط **Deploy**

### الخطوة 2: إضافة Environment Variables

في إعدادات Worker → **Settings** → **Variables**:

```
FIREBASE_URL = https://tiger-d1433-default-rtdb.firebaseio.com
TELEGRAM_BOT_TOKEN = [توكن البوت]
AGENTROUTER_API_KEY = [مفتاح AgentRouter]
NVIDIA_API_KEY = [مفتاح NVIDIA]
```

### الخطوة 3: تحديث قواعد Firebase

1. اذهب إلى [Firebase Console](https://console.firebase.google.com)
2. Realtime Database → **Rules**
3. انسخ محتوى `firebase-rules.json`
4. اضغط **Publish**

### الخطوة 4: رفع الملفات للموقع

ارفع جميع الملفات في هذا المجلد إلى استضافتك:
- جميع ملفات HTML (المعدلة)
- `telegram-notifications.js` (جديد)
- `telegram-bot.js` (محدث)
- `js/` folder (كما هو)

---

## 🎯 كيف تعمل الإشعارات:

### عند طلب جديد (checkout.html):
```javascript
// يتم إرسال إشعار تلقائياً عند نجاح الطلب
// يظهر للمديرين في Telegram:
🛒 طلب جديد — Tiger Jeans 🐯
━━━━━━━━━━━━━━━━━━━
🔖 رقم الطلب: TJ-XXXXX
👤 العميل: أحمد محمد
📱 التليفون: 01012345678
💰 الإجمالي: 550 ج.م
💳 الدفع: vodafone_cash
```

### عند نقص المخزون:
```javascript
// يمكن استدعاؤه يدوياً من أي صفحة:
notifyLowStock({
  productName: 'بنطلون جينز أسود',
  sizeColor: '32_أسود',
  qty: 3,
  price: 450
});
```

---

## 🔧 الدوال المتاحة:

| الدالة | الوصف | الصفحة |
|--------|-------|--------|
| `notifyNewOrder(data)` | إشعار طلب جديد | checkout.html |
| `notifyNewGiftCard(data)` | إشعار بطاقة هدايا | gift-cards.html |
| `notifyNewPayment(data)` | إشعار دفع جديد | checkout.html |
| `notifyLowStock(data)` | إشعار مخزون منخفض | أي صفحة |

---

## ⚙️ تخصيص الإشعارات:

### تفعيل/إيقاف:
```javascript
setNotificationsEnabled(true);  // تفعيل
setNotificationsEnabled(false); // إيقاف
```

### تغيير رابط Worker:
```javascript
setWorkerUrl('https://your-worker.workers.dev');
```

---

## 📞 الدعم:

لأي مشاكل أو استفسارات، تواصل معنا.

---
**Tiger Jeans © 2026** 🐯
