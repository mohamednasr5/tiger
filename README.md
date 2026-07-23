# 🐯 Tiger Jeans - متجر إلكتروني متكامل

![Tiger Jeans](images/logo-icon.png)

**متجر إلكتروني احترافي لبيع الجينز والملابس العصرية في مصر**
مع دعم كامل للذكاء الاصطناعي وإشعارات Telegram

---

## ✨ المميزات

### 🛒 **متجر كامل**
- عرض المنتجات مع الفلترة والبحث
- سلة تسوق متقدمة
- نظام دفع متعدد (فودافون كاش، إنستاباي، عند الاستلام، بطاقات هدايا)
- تتبع الطلبات
- قائمة المفضلات
- بطاقات هدايا رقمية

### 🤖 **الذكاء الاصطناعي (NVIDIA AI)**
- مساعد ذكي للعملاء (نص + صور)
- اقتراحات المنتجات والمقاسات
- بحث ذكي بالصور
- لوحة تحكم AI للأدمن

### 📱 **إشعارات Telegram فورية**
- إشعار عند طلب جديد
- إشعار تغيير حالة الطلب
- تنبيهات المخزون المنخفض
- روابط المنتجات باللون الأزرق

### 🔐 **لوحة تحكم شاملة**
- إدارة المنتجات والطلبات
- إدارة بطاقات الهدايا
- تتبع الزوار وحظر IP
- إعدادات الشحن والدفع
- تقارير المبيعات

---

## 📁 هيكل المشروع

```
tiger-jeans/
├── index.html              # الصفحة الرئيسية
├── product.html            # صفحة المنتج
├── cart.html               # السلة
├── checkout.html           # إتمام الشراء
├── orders.html             # طلباتي
├── admin.html              # لوحة التحكم
├── gift-card.html          # بطاقة هدايا
├── gift-cards.html         # جميع البطاقات
├── track.html              # تتبع الطلب
├── wishlist.html           # المفضلة
│
├── css/
│   └── style.css           # التنسيقات الرئيسية
│
├── js/
│   ├── config.js           # إعدادات Firebase
│   ├── tiger-ai.js         # المساعد الذكي AI
│   ├── tiger-ai-admin.js   # لوحة تحكم AI
│   ├── telegram-bot.js     # بوت تليجرام ⭐ جديد
│   ├── checkout-telegram-patch.js  # إشعارات الدفع ⭐ جديد
│   ├── admin-telegram-patch.js     # إشعارات الأدمن ⭐ جديد
│   └── ...                 # ملفات أخرى
│
├── images/                 # الصور والأيقونات
│
├── tiger-jeans-worker.js   # Worker موحد (AI + Telegram) ⭐ جديد
│
└── README.md               # هذا الملف
```

---

## 🚀 خطوات التثبيت السريعة

### 1️⃣ **إعداد Firebase**

1. أنشئ مشروع على [Firebase Console](https://console.firebase.google.com)
2. فعّل **Realtime Database**
3. ارفع قواعد البيانات من `database.rules.json`
4. حدّث `js/config.js` ببيانات مشروعك:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 2️⃣ **نشر Worker على Cloudflare**

1. أنشئ [Cloudflare Account](https://dash.cloudflare.com)
2. اذهب إلى **Workers & Pages** → **Create Application**
3. اختر **Create Worker**
4. **امسح الكود الافتراضي** والصق محتوى `tiger-jeans-worker.js`
5. اضغط **Deploy**

#### أضف Secrets:

اذهب إلى **Settings → Variables and Secrets** وأضف:

| اسم المتغير | القيمة |
|------------|--------|
| `NVIDIA_API_KEY` | مفتاح NVIDIA API من [build.nvidia.com](https://build.nvidia.com) |
| `TELEGRAM_BOT_TOKEN` | توكن البوت من [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHAT_ID` | معرف الدردشة (رقم) |

### 3️⃣ **رفع الموقع**

#### الخيار A: GitHub Pages (مجاني)

```bash
# 1. ادفع الكود لـ GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/tiger-jeans.git
git push -u origin main

# 2. فعّل GitHub Pages
# Settings → Pages → Source: main branch → Save
```

#### الخيار B: Cloudflare Pages (مجاني)

```bash
# استخدم Wrangler CLI
npm install -g wrangler
wrangler pages deploy . --project-name=tiger-jeans
```

#### الخيار C: Netlify / Vercel

ارفع مجلد المشروع مباشرة

### 4️⃣ **تحديث رابط Worker**

في `js/tiger-ai.js` تأكد من:
```javascript
const DEFAULT_NVIDIA_API_URL = 'https://YOUR_WORKER.workers.dev/v1';
```

في `js/telegram-bot.js` و `checkout-telegram-patch.js`:
```javascript
const WORKER_URL = 'https://YOUR_WORKER.workers.dev';
```

---

## 🔧 الإعدادات المتقدمة

### إعدادات AI

اذهب إلى **لوحة التحكم → تبويب AI**:
- فعّل/عطّل المساعد الذكي
- اختر النموذج (Llama, Mixtral, DeepSeek...)
- عدّل البرومبت (System Prompt)
- اضبط max_tokens و temperature

### إعدادات Telegram

1. أنشئ بوت من [@BotFather](https://t.me/BotFather)
2. احصل على توكن البوت
3. أرسل رسالة لبوتك من حساب الأدمن
4. احصل على Chat ID من [@userinfobot](https://t.me/userinfobot)
5. أضف التوكن و Chat ID في Secrets

### إعدادات الدفع

عدّل أرقام الحسابات من **لوحة التحكم → الإعدادات**:
- رقم فودافون كاش
- معرف إنستاباي
- اسم صاحب الحساب

---

## 📡 Endpoints API

| Endpoint | الوظيفة | الطريقة |
|----------|---------|---------|
| `/` | صفحة حالة Worker | GET |
| `/v1/chat/completions` | AI Proxy (المساعد الذكي) | POST |
| `/telegram/notify-order` | إشعار طلب جديد | POST |
| `/telegram/status-update` | إشعار تغيير حالة | POST |
| `/telegram/test` | اختبار الاتصال | GET |

---

## 💬 مثال إشعار Telegram

```
🛒 طلب جديد - TJ-6181054671
━━━━━━━━━━━━━━━━━━━

👤 العميل: محمد حماد
📱 الهاتف: 01279934735
📍 العنوان: المنزلة, الدقهلية

📦 المنتجات:
1. بنطلون Old Money Casual Wide Leg – خامة فاخرة
   🎨 اللون: أسود فحمي | 📏 المقاس: 30
   💰 السعر: 550 ج.م
   🔗 [عرض المنتج] ← رابط أزرق

━━━━━━━━━━━━━━━━━━━
💵 الإجمالي: 645 ج.م
🚚 الشحن: بوستا (Bosta)
💳 الدفع: فودافون كاش

🔗 [لوحة التحكم] ← رابط أزرق
```

---

## 🛠️ التقنيات المستخدمة

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Firebase Realtime Database
- **AI:** NVIDIA NIM API (Llama, DeepSeek, Vision Models)
- **Notifications:** Telegram Bot API
- **Hosting:** GitHub Pages / Cloudflare Workers
- **Payment:** Vodafone Cash, InstaPay, COD, Gift Cards

---

## 📱 التوافق

- ✅ Desktop (Chrome, Firefox, Safari, Edge)
- ✅ Mobile (iOS Safari, Chrome Mobile)
- ✅ Responsive Design
- ✅ Dark/Light Mode
- ✅ RTL Support (العربية)

---

## 📄 الترخيص

هذا المشروع خاص بـ **Tiger Jeans®**

جميع الحقوق محفوظة © 2026

---

## 🆘 الدعم

للمساعدة أو الاستفسارات:
- 📧 البريد الإلكتروني
- 📱 واتساب
- 💬 تليجرام

---

**صُنع بـ ❤️ لمتجر Tiger Jeans**
