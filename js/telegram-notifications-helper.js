/**
 * Tiger Jeans - Telegram Notifications Helper
 * ===========================================
 * هذا الملف مسؤول عن إرسال الإشعارات إلى تليجرام عبر الـ Worker
 * لتجاوز مشكلة الـ CORS وحماية الـ Token الخاص بالبوت.
 */

const TELEGRAM_WORKER_URL = "https://telegram.studegy10.workers.dev";

/**
 * دالة رئيسية لإرسال الرسائل إلى تليجرام
 * @param {string} messageText - نص الرسالة (يدعم تنسيق HTML)
 * @returns {Promise<boolean>} - نجاح أو فشل الإرسال
 */
async function sendTelegramNotification(messageText) {
    try {
        if (!messageText) return false;

        const response = await fetch(TELEGRAM_WORKER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text: messageText })
        });

        if (!response.ok) {
            console.error(`Telegram Worker Error: ${response.status} ${response.statusText}`);
            return false;
        }

        const data = await response.json();
        return data.ok === true;
    } catch (error) {
        console.error("Telegram Notification Failed:", error);
        return false;
    }
}

/**
 * دالة جاهزة لإرسال إشعار بطلب شراء جديد
 * @param {object} orderData - بيانات الطلب من قاعدة البيانات
 */
async function sendNewOrderNotification(orderData) {
    const customer = orderData.customer || {};
    const payment = orderData.payment || {};
    
    // تحويل طريقة الدفع لعربي لتكون مفهومة في الإشعار
    let paymentMethod = payment.method || "غير محدد";
    if (paymentMethod === "vodafone") paymentMethod = "فودافون كاش";
    if (paymentMethod === "instapay") paymentMethod = "إنستاباي";
    if (paymentMethod === "cod") paymentMethod = "الدفع عند الاستلام";
    if (paymentMethod === "giftcard") paymentMethod = "بطاقة هدايا";

    const message = `
🛍️ <b>طلب جديد في Tiger Jeans!</b> 🛍️

📦 <b>رقم الطلب:</b> <code>${orderData.code || "غير محدد"}</code>
👤 <b>العميل:</b> ${customer.name || "غير محدد"}
📞 <b>الموبايل:</b> ${customer.phone || "غير محدد"}
📍 <b>المحافظة:</b> ${customer.city || "غير محدد"}
💰 <b>الإجمالي:</b> ${orderData.total || 0} جنيه
💳 <b>طريقة الدفع:</b> ${paymentMethod}

<a href="https://tiger-jeans.com/admin.html">👉 الذهاب إلى لوحة التحكم</a>
    `;
    return await sendTelegramNotification(message);
}

/**
 * دالة جاهزة لإرسال إشعار بطلب بطاقة هدايا جديدة
 * @param {object} giftCardData - بيانات بطاقة الهدايا
 */
async function sendGiftCardNotification(giftCardData) {
    const payment = giftCardData.payment || {};
    let paymentMethod = payment.method || "غير محدد";
    if (paymentMethod === "vodafone") paymentMethod = "فودافون كاش";
    if (paymentMethod === "instapay") paymentMethod = "إنستاباي";

    const message = `
🎁 <b>طلب بطاقة هدايا جديد!</b> 🎁

👤 <b>المرسل:</b> ${giftCardData.senderName || "غير محدد"}
📞 <b>موبايل المرسل:</b> ${giftCardData.senderPhone || "غير محدد"}
👤 <b>المستلم:</b> ${giftCardData.recipientName || "غير محدد"}
🎉 <b>المناسبة:</b> ${giftCardData.occasion || "غير محدد"}
💰 <b>القيمة:</b> ${giftCardData.amount || 0} جنيه
💳 <b>رقم البطاقة:</b> <code>${giftCardData.cardNumber || "غير محدد"}</code>
💵 <b>طريقة الدفع:</b> ${paymentMethod}

<a href="https://tiger-jeans.com/admin.html">👉 مراجعة وإرسال البطاقة</a>
    `;
    return await sendTelegramNotification(message);
}

/**
 * دالة جاهزة لإرسال إشعار بطلب استرجاع جديد
 * @param {object} returnData - بيانات الاسترجاع
 */
async function sendReturnNotification(returnData) {
    const message = `
🔄 <b>طلب استرجاع جديد!</b> 🔄

📦 <b>رقم الطلب:</b> <code>${returnData.orderCode || "غير محدد"}</code>
👤 <b>العميل:</b> ${returnData.name || "غير محدد"}
📞 <b>الموبايل:</b> ${returnData.phone || "غير محدد"}
📝 <b>سبب الاسترجاع:</b> ${returnData.reason || "غير محدد"}
💬 <b>التفاصيل:</b> ${returnData.details || "لا يوجد"}

<a href="https://tiger-jeans.com/admin.html">👉 مراجعة الطلب في لوحة التحكم</a>
    `;
    return await sendTelegramNotification(message);
}

// تصدير الدوال إذا كنت تستخدم ES Modules (Type="module")
// إذا كنت تستخدمه كملف سكريبت عادي في الـ HTML، يمكنك حذف الجزء الخاص بالـ export
export {
    sendTelegramNotification,
    sendNewOrderNotification,
    sendGiftCardNotification,
    sendReturnNotification
};
