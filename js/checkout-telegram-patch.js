/**
 * 🔧 Tiger Jeans - Checkout Telegram Integration Patch
 * =====================================================
 * أضف هذا الكود في نهاية checkout.html قبل </body>
 * أو استبدل دالة submitOrder الموجودة بهذه النسخة المحسنة
 * 
 * هذا الكود يضيف إشعار تلقائي لتليجرام عند إنشاء طلب جديد
 */

// ====== حفظ الدالة الأصلية ======
const _originalSubmitOrder = typeof submitOrder === 'function' ? submitOrder : null;

// ====== دالة إرسال الطلب المحسنة مع إشعارات Telegram ======
async function submitOrderWithTelegram() {
  const name = document.getElementById("cName").value.trim();
  const phone = document.getElementById("cPhone").value.trim();
  const city = document.getElementById("cCity").value.trim();
  const address = document.getElementById("cAddress").value.trim();
  const notes = document.getElementById("cNotes").value.trim();

  // Validation
  if (!name || !phone || !city || !address) {
    showToast("من فضلك أكمل بيانات التوصيل");
    return;
  }
  if (!/^01[0125][0-9]{8}$/.test(phone)) {
    showToast("رقم الموبايل غير صحيح");
    return;
  }
  
  // ... (باقي التحققات من الكود الأصلي)

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> جاري إرسال الطلب...';

  const code = genOrderCode();
  const shippingCost = getShippingCost();
  
  let total = Math.max(0, cartTotal() + getShippingCost() - discountAmount);

  // حساب خصم بطاقة الهدايا إذا وجدت
  let giftDeduction = 0;
  if (appliedGiftCard) {
    giftDeduction = Math.min(appliedGiftCard.balance, total);
    total = Math.max(0, total - giftDeduction);
  }

  const order = {
    code,
    items: cart,
    subtotal: cartTotal(),
    shippingCost,
    discount: discountAmount,
    total: Math.max(0, total),
    customer: { name, phone, city, address, notes },
    uid: (typeof currentUser !== "undefined" && currentUser) ? currentUser.uid : null,
    payment: { 
      method, 
      receiptImage: receiptUrl || null,
      status: (total <= 0) ? "paid" : (method === "cod" ? "pending_payment" : "pending_verification")
    },
    status: "pending",
    statusHistory: [{ 
      status: "pending", 
      note: method === "cod" ? "تم استلام الطلب - في انتظار الدفع عند الاستلام" : "تم استلام الطلب وفي انتظار مراجعة الدفع", 
      ts: Date.now() 
    }],
    createdAt: Date.now()
  };

  try {
    const orderRef = await db.ref("orders").push(order);
    const orderId = orderRef.key;
    
    // بيانات للإشعار
    order.orderCode = code;
    order.id = orderId;
    
    localStorage.setItem("tj_customer_phone", phone);

    // خصم المخزون
    if (typeof deductStockForOrder === 'function') {
      deductStockForOrder(order.items).catch(e => console.error('Stock deduction error:', e));
    }

    clearCart();
    
    // عرض رسالة النجاح
    document.getElementById("checkoutForm").style.display = "none";
    document.getElementById("successBox").style.display = "block";
    document.getElementById("orderCodeDisplay").textContent = code;
    
    // رابط واتساب
    if (typeof generateWhatsAppLink === 'function') {
      document.getElementById("whatsappInvoice").href = generateWhatsAppLink(order);
    }
    
    // ==========================================
    // 📱 إرسال إشعار Telegram (الميزة الجديدة)
    // ==========================================
    sendTelegramOrderNotification(order);
    
  } catch (err) {
    showToast("حدث خطأ أثناء إرسال الطلب، حاول مرة أخرى");
    btn.disabled = false;
    btn.innerHTML = "تأكيد الطلب <i class='bx bx-check-double'></i>";
  }
}

// ====== دالة إرسال الإشعار لتليجرام ======
async function sendTelegramOrderNotification(order) {
  const WORKER_URL = 'https://tigerorder.studegy10.workers.dev';
  
  try {
    console.log('📤 Sending Telegram notification for order:', order.code);
    
    const response = await fetch(`${WORKER_URL}/telegram/notify-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: order.code || order.orderCode || '',
        customer: order.customer || {},
        items: (order.items || []).map(item => ({
          id: item.id,
          name: item.name,
          color: item.color,
          size: item.size,
          price: item.price,
          qty: item.qty,
          image: item.image
        })),
        subtotal: order.subtotal || 0,
        shippingCost: order.shippingCost || 0,
        discount: order.discount || 0,
        total: order.total || 0,
        payment: order.payment || {},
        shippingCompany: order.shippingCompany || '',
        trackingNumber: order.trackingNumber || '',
        status: order.status || 'pending',
        siteUrl: 'https://tiger-jeans.com'
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Telegram notification sent successfully');
    } else {
      console.warn('⚠️ Telegram notification failed:', result.error);
    }
  } catch (error) {
    // لا نوقف العملية إذا فشل الإشعار
    console.error('❌ Telegram notification error:', error);
  }
}

// ====== تصدير الدوال ======
window.sendTelegramOrderNotification = sendTelegramOrderNotification;

console.log('📦 Checkout Telegram Integration Loaded');
