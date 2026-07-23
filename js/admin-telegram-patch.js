/**
 * 🔧 Tiger Jeans - Admin Telegram Integration Patch
 * ===================================================
 * أضف هذا الكود في admin.html أو استخدمه كمرجع
 * 
 * هذا الكود يضيف إشعار تلقائي لتليجرام عند تغيير حالة طلب
 */

// ====== دالة تحديث حالة الطلب مع إشعار Telegram ======
async function updateOrderStatusWithNotification(orderId, newStatus, note = '', shippingCompany = '', trackingNumber = '') {
  const orderRef = db.ref(`orders/${orderId}`);
  
  try {
    // 1. قراءة الطلب الحالي
    const snap = await orderRef.once('value');
    const order = snap.val();
    
    if (!order) {
      throw new Error('الطلب غير موجود');
    }
    
    const oldStatus = order.status;
    
    // 2. تحديث الحالة في Firebase
    const updateData = {
      status: newStatus,
      [`statusHistory/${Date.now()}`]: {
        status: newStatus,
        note: note || `تم تغيير الحالة إلى: ${newStatus}`,
        ts: Date.now(),
        shippingCompany: shippingCompany || undefined,
        trackingNumber: trackingNumber || undefined
      }
    };
    
    // إضافة بيانات الشحن إذا وجدت
    if (shippingCompany) {
      updateData.shippingCompany = shippingCompany;
    }
    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }
    
    await orderRef.update(updateData);
    
    // 3. إرسال إشعار Telegram
    await sendTelegramStatusNotification(order, oldStatus, newStatus, note, shippingCompany, trackingNumber);
    
    return { success: true, message: 'تم تحديث الحالة وإرسال الإشعار' };
    
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

// ====== دالة إرسال إشعار تغيير الحالة ======
async function sendTelegramStatusNotification(order, oldStatus, newStatus, note = '', shippingCompany = '', trackingNumber = '') {
  const WORKER_URL = 'https://tigerorder.studegy10.workers.dev';
  
  try {
    // تحديث بيانات الطلب للإشعار
    const orderForNotification = {
      ...order,
      code: order.code || order.orderCode,
      customer: order.customer || {},
      shippingCompany: shippingCompany || order.shippingCompany,
      trackingNumber: trackingNumber || order.trackingNumber
    };

    console.log(`📤 Sending status notification: ${oldStatus} → ${newStatus}`);
    
    const response = await fetch(`${WORKER_URL}/telegram/status-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order: orderForNotification,
        oldStatus: oldStatus,
        newStatus: newStatus,
        note: note || '',
        siteUrl: 'https://tiger-jeans.com'
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Status notification sent successfully');
      if (typeof showToast === 'function') {
        showToast('تم تحديث الحالة وإرسال الإشعار ✓');
      }
    } else {
      console.warn('⚠️ Status notification failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Status notification error:', error);
    // لا نوقف العملية إذا فشل الإشعار
    return { success: false, error: error.message };
  }
}

// ====== دوال مساعدة لتغيير الحالات الشائعة ======

/**
 * تأكيد طلب وبدء التجهيز
 */
async function confirmOrder(orderId) {
  return updateOrderStatusWithNotification(orderId, 'confirmed', 'تم تأكيد الطلب وجاري التجهيز');
}

/**
 * بدء الشحن
 */
async function shipOrder(orderId, company, trackingNum) {
  const note = `تم الشحن عبر ${getShippingCompanyName(company)}`;
  return updateOrderStatusWithNotification(orderId, 'shipping', note, company, trackingNum);
}

/**
 * تسليم الطلب
 */
async function deliverOrder(orderId) {
  return updateOrderStatusWithNotification(orderId, 'delivered', 'تم تسليم الطلب بنجاح');
}

/**
 * إلغاء الطلب
 */
async function cancelOrder(orderId, reason = '') {
  return updateOrderStatusWithNotification(orderId, 'cancelled', reason || 'تم إلغاء الطلب');
}

// ====== مساعدات ======
function getShippingCompanyName(company) {
  const names = {
    'bosta': 'بوستا (Bosta)',
    'aramex': 'أرامكس (Aramex)',
    'smsa': 'سمسا (SMSA)',
    'dhl': 'DHL',
    'self_pickup': 'استلام ذاتي'
  };
  return names[company] || company;
}

// ====== تصدير الدوال ======
window.AdminTelegramIntegration = {
  updateOrderStatus: updateOrderStatusWithNotification,
  sendStatusNotification: sendTelegramStatusNotification,
  confirmOrder,
  shipOrder,
  deliverOrder,
  cancelOrder
};

console.log('🔧 Admin Telegram Integration Loaded');
