// ====== Tiger Jeans - Admin Enhancements ======
// هذا الملف يحتوي على الإضافات الجديدة: المخزون، الطلبات المسبقة، إشعارات المبيعات

// ====== State Variables ======
let stockMatrix = {}; // {size_color: quantity}
let preordersList = [];
let notificationSettings = {};

// ====== 1. STOCK MANAGEMENT SYSTEM ======

// Initialize stock matrix when sizes/colors change
function initStockMatrix() {
  const sizes = tempSizes || [];
  const colors = tempColors.map(c => typeof c === 'string' ? c : c.name);
  
  if (sizes.length === 0 || colors.length === 0) return;
  
  renderStockTable(sizes, colors);
}

// Render stock table in product modal
function renderStockTable(sizes, colors) {
  let container = document.getElementById('stockTableContainer');
  if (!container) {
    // Create stock table container after colors field
    const colorsField = document.getElementById('colorsChips')?.parentElement;
    if (!colorsField) return;
    
    container = document.createElement('div');
    container.id = 'stockTableContainer';
    container.className = 'field';
    container.innerHTML = `
      <label style="display:flex;align-items:center;gap:.5rem">
        <i class='bx bx-package' style="color:var(--gold)"></i>
        المخزون (عدد القطع لكل مقاس/لون)
      </label>
      <p style="color:var(--text-dim);font-size:.78rem;margin-top:-.3rem;margin-bottom:.5rem">اترك الخلية فارغة أو 0 للإشارة إلى نفاد المخزون</p>
      <div class="stock-matrix-wrapper" id="stockMatrixWrapper" style="overflow-x:auto"></div>
      <button type="button" class="btn-secondary" style="margin-top:.5rem;font-size:.8rem;padding:.4rem 1rem" onclick="fillAllStock()">
        <i class='bx bx-plus'></i> ملء كل الخلايا بنفس الرقم
      </button>
    `;
    colorsField.parentElement.insertBefore(container, colorsField.nextSibling);
  }
  
  const wrapper = document.getElementById('stockMatrixWrapper');
  
  if (colors.length === 0 || sizes.length === 0) {
    wrapper.innerHTML = '<p style="color:var(--text-dim);padding:1rem;text-align:center">أضف مقاسات وألوان أولاً</p>';
    return;
  }
  
  let html = `<table class="stock-matrix-table" style="width:100%;border-collapse:collapse;font-size:.85rem">
    <thead>
      <tr style="background:var(--bg-alt)">
        <th style="padding:.6rem;border:1px solid var(--line);text-align:center;color:var(--text-dim)">المقاس \\ اللون</th>
        ${colors.map(c => `<th style="padding:.6rem;border:1px solid var(--line);text-align:center;min-width:70px">${c}</th>`).join('')}
        <th style="padding:.6rem;border:1px solid var(--line);text-align:center;color:var(--gold)">المجموع</th>
      </tr>
    </thead>
    <tbody>`;
  
  sizes.forEach(size => {
    html += `<tr>
      <td style="padding:.6rem;border:1px solid var(--line);font-weight:700;text-align:center;background:var(--bg-alt)">${size}</td>`;
    
    colors.forEach(color => {
      const key = `${size}_${color}`;
      const val = stockMatrix[key] !== undefined ? stockMatrix[key] : '';
      html += `<td style="padding:.3rem;border:1px solid var(--line)">
        <input type="number" 
          class="stock-input" 
          data-size="${size}" 
          data-color="${color}" 
          value="${val}" 
          min="0" 
          placeholder="0"
          onchange="updateStockCell('${size}','${color}',this.value)"
          oninput="updateStockCell('${size}','${color}',this.value)"
          style="width:100%;padding:.4rem;text-align:center;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--text)" />
      </td>`;
    });
    
    html += `<td style="padding:.6rem;border:1px solid var(--line);text-align:center;font-weight:700;color:var(--gold)" id="rowTotal_${size}">0</td></tr>`;
  });
  
  // Total row
  html += `<tr style="background:var(--bg-alt);font-weight:700">
    <td style="padding:.6rem;border:1px solid var(--line);text-align:center;color:var(--gold)">المجموع</td>`;
  
  colors.forEach(color => {
    html += `<td style="padding:.6rem;border:1px solid var(--line);text-align:center;color:var(--gold)" id="colTotal_${color}">0</td>`;
  });
  
  html += `<td style="padding:.6rem;border:1px solid var(--line);text-align:center;color:var(--gold);background:rgba(212,175,55,.1)" id="grandTotal">0</td></tr>`;
  
  html += `</tbody></table>`;
  wrapper.innerHTML = html;
  
  updateStockTotals();
}

// Update individual stock cell
function updateStockCell(size, color, value) {
  const key = `${size}_${color}`;
  stockMatrix[key] = parseInt(value) || 0;
  updateStockTotals();
}

// Update all totals
function updateStockTotals() {
  const sizes = tempSizes || [];
  const colors = tempColors.map(c => typeof c === 'string' ? c : c.name);
  
  let grandTotal = 0;
  
  sizes.forEach(size => {
    let rowTotal = 0;
    colors.forEach(color => {
      const key = `${size}_${color}`;
      rowTotal += stockMatrix[key] || 0;
    });
    const el = document.getElementById(`rowTotal_${size}`);
    if (el) el.textContent = rowTotal;
    grandTotal += rowTotal;
  });
  
  colors.forEach(color => {
    let colTotal = 0;
    sizes.forEach(size => {
      const key = `${size}_${color}`;
      colTotal += stockMatrix[key] || 0;
    });
    const el = document.getElementById(`colTotal_${color}`);
    if (el) el.textContent = colTotal;
  });
  
  const gtEl = document.getElementById('grandTotal');
  if (gtEl) gtEl.textContent = grandTotal;
}

// Fill all cells with same value
function fillAllStock() {
  const val = prompt('أدخل عدد القطع لكل خلية:');
  if (val === null) return;
  const num = parseInt(val) || 0;
  
  document.querySelectorAll('.stock-input').forEach(input => {
    input.value = num;
    updateStockCell(input.dataset.size, input.dataset.color, num);
  });
}

// Load existing stock when editing product
function loadProductStock(productId) {
  db.ref(`products/${productId}/stock`).once('value').then(snap => {
    const data = snap.val();
    if (data) {
      stockMatrix = {...data};
      const sizes = tempSizes || [];
      const colors = tempColors.map(c => typeof c === 'string' ? c : c.name);
      if (sizes.length && colors.length) {
        renderStockTable(sizes, colors);
      }
    } else {
      stockMatrix = {};
    }
  });
}

// Save stock with product
function getProductStock() {
  return {...stockMatrix};
}

// Check stock for specific size/color
function checkStock(productId, size, color) {
  return new Promise((resolve) => {
    db.ref(`products/${productId}/stock/${size}_${color}`).once('value').then(snap => {
      resolve(snap.val() || 0);
    });
  });
}

// Deduct stock on order
function deductStock(productId, size, color, qty) {
  return new Promise((resolve, reject) => {
    checkStock(productId, size, color).then(current => {
      const newQty = Math.max(0, current - qty);
      db.ref(`products/${productId}/stock/${size}_${color}`).set(newQty).then(resolve).catch(reject);
    }).catch(reject);
  });
}

// Add stock back on order cancel
function addStockBack(productId, size, color, qty) {
  return new Promise((resolve, reject) => {
    checkStock(productId, size, color).then(current => {
      const newQty = current + qty;
      db.ref(`products/${productId}/stock/${size}_${color}`).set(newQty).then(resolve).catch(reject);
    }).catch(reject);
  });
}


// ====== 2. PRE-ORDER SYSTEM ======

// Show pre-order modal on frontend
function showPreorderModal(productId, productName, size, color) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'preorderModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem';
  
  modal.innerHTML = `
    <div style="background:var(--surface);border-radius:16px;padding:2rem;max-width:450px;width:100%;max-height:90vh;overflow-y:auto;border:1px solid var(--line)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
        <h3 style="margin:0;font-family:'Cairo',sans-serif"><i class='bx bx-time-five' style="color:var(--gold)"></i> طلب مسبق</h3>
        <button onclick="closePreorderModal()" style="background:none;border:none;font-size:1.8rem;cursor:pointer;color:var(--text-dim)">&times;</button>
      </div>
      
      <div style="background:rgba(212,175,55,.1);border-radius:10px;padding:1rem;margin-bottom:1.5rem;border:1px solid rgba(212,175,55,.3)">
        <p style="margin:0;color:var(--text-dim);font-size:.9rem;line-height:1.7">
          <i class='bx bx-info-circle' style="color:var(--gold)"></i>
          هذا المنتج غير متوفر حالياً في المقاس/اللون المختار. يمكنك تقديم طلب مسبق وسنقوم بإشعارك عند توفره!
        </p>
      </div>
      
      <input type="hidden" id="preorderProductId" value="${productId}" />
      <input type="hidden" id="preorderSize" value="${size}" />
      <input type="hidden" id="preorderColor" value="${color}" />
      
      <div style="margin-bottom:1rem">
        <label style="display:block;font-weight:700;margin-bottom:.5rem;font-size:.95rem">المنتج</label>
        <div style="padding:.8rem;background:var(--bg-alt);border-radius:8px;border:1px solid var(--line);color:var(--text)">${productName} - ${size} / ${color}</div>
      </div>
      
      <div style="margin-bottom:1rem">
        <label style="display:block;font-weight:700;margin-bottom:.5rem;font-size:.95rem">الاسم *</label>
        <input type="text" id="preorderName" placeholder="أدخل اسمك الكريم" style="width:100%;padding:.8rem;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--text)" />
      </div>
      
      <div style="margin-bottom:1rem">
        <label style="display:block;font-weight:700;margin-bottom:.5rem;font-size:.95rem">رقم الهاتف *</label>
        <input type="tel" id="preorderPhone" placeholder="01xxxxxxxxx" dir="ltr" style="width:100%;padding:.8rem;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--text);text-align:left" />
      </div>
      
      <div style="margin-bottom:1rem">
        <label style="display:block;font-weight:700;margin-bottom:.5rem;font-size:.95rem">المدينة *</label>
        <select id="preorderCity" style="width:100%;padding:.8rem;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--text)">
          <option value="">اختر المحافظة...</option>
          ${EGYPT_GOVERNORATES.map(g => `<option value="${g}">${g}</option>`).join('')}
        </select>
      </div>
      
      <div style="margin-bottom:1.5rem">
        <label style="display:block;font-weight:700;margin-bottom:.5rem;font-size:.95rem">الكمية المطلوبة</label>
        <input type="number" id="preorderQty" value="1" min="1" max="10" style="width:100%;padding:.8rem;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--text)" />
      </div>
      
      <button onclick="submitPreorder()" class="btn-primary full-width" style="padding:1rem;font-size:1rem">
        <i class='bx bx-send'></i> تأكيد الطلب المسبق
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Close preorder modal
function closePreorderModal() {
  const modal = document.getElementById('preorderModal');
  if (modal) modal.remove();
}

// Submit pre-order
function submitPreorder() {
  const productId = document.getElementById('preorderProductId').value;
  const size = document.getElementById('preorderSize').value;
  const color = document.getElementById('preorderColor').value;
  const name = document.getElementById('preorderName').value.trim();
  const phone = document.getElementById('preorderPhone').value.trim();
  const city = document.getElementById('preorderCity').value;
  const qty = parseInt(document.getElementById('preorderQty').value) || 1;
  
  if (!name || !phone || !city) {
    alert('يرجى ملء جميع الحقول المطلوبة');
    return;
  }
  
  const preorderData = {
    productId,
    productName: '', // Will be filled from product data
    size,
    color,
    customer: { name, phone, city },
    qty,
    status: 'pending',
    createdAt: Date.now(),
    notified: false
  };
  
  // Get product name
  db.ref(`products/${productId}/name`).once('value').then(snap => {
    preorderData.productName = snap.val() || '';
    
    return db.ref('preorders').push(preorderData);
  }).then(() => {
    showToast('تم تسجيل طلبك المسبق بنجاح! سنشعرك عند توفر المنتج ✓');
    closePreorderModal();
  }).catch(err => {
    console.error('Preorder error:', err);
    showToast('حدث خطأ، يرجى المحاولة مرة أخرى');
  });
}


// ====== ADMIN PRE-ORDER MANAGEMENT ======

// Load preorders in admin
function loadPreorders() {
  db.ref('preorders').orderByChild('createdAt').on('value', snap => {
    const list = [];
    snap.forEach(child => {
      list.push({id: child.key, ...child.val()});
    });
    preordersList = list.reverse();
    renderPreordersTable(list);
    updatePreordersBadge(list.filter(p => p.status === 'pending').length);
  });
}

// Render preorders table
function renderPreordersTable(list) {
  const tbody = document.getElementById('preordersTable');
  if (!tbody) return;
  
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:2rem">لا توجد طلبات مسبقة حالياً</td></tr>';
    return;
  }
  
  tbody.innerHTML = list.map(p => {
    const statusMap = {
      pending: {text: 'قيد الانتظار', class: 'status-pending'},
      notified: {text: 'تم الإشعار', class: 'status-shipping'},
      fulfilled: {text: 'تم التوفير', class: 'status-delivered'},
      cancelled: {text: 'ملغي', class: 'status-cancelled'}
    };
    const st = statusMap[p.status] || statusMap.pending;
    const date = p.createdAt ? new Date(p.createdAt).toLocaleDateString('ar-EG') : '-';
    
    // WhatsApp & Phone contact buttons
    const phone = p.customer?.phone || '';
    const whatsappLink = phone ? `https://wa.me/2${phone.replace(/^0/, '')}?text=مرحباً ${p.customer?.name || ''}، نتواصل معاك بخصوص طلبك المسبق لمنتج ${p.productName || ''}` : '#';
    const telLink = phone ? `tel:${phone}` : '#';
    
    return `<tr>
      <td><strong>${p.id?.slice(-6)}</strong></td>
      <td>
        <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
          <span>${p.customer?.name || '-'}</span>
          <div style="display:flex;gap:.3rem">
            <a href="${whatsappLink}" target="_blank" title="واتساب" style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;background:#25D366;color:#fff;border-radius:50%;font-size:.85rem;text-decoration:none;transition:.2s" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
              <i class='bx bxl-whatsapp'></i>
            </a>
            <a href="${telLink}" title="اتصال" style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;background:#3498db;color:#fff;border-radius:50%;font-size:.8rem;text-decoration:none;transition:.2s" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
              <i class='bx bx-phone'></i>
            </a>
          </div>
        </div>
        ${phone ? `<small style="color:var(--text-dim);direction:ltr;display:block;text-align:right">${phone}</small>` : ''}
      </td>
      <td>${p.productName || '-'}<br><small style="color:var(--text-dim)">${p.size} / ${p.color}</small></td>
      <td>${p.qty}</td>
      <td>${date}</td>
      <td><span class="status-badge ${st.class}">${st.text}</span></td>
      <td>
        <select onchange="updatePreorderStatus('${p.id}', this.value)" style="padding:.4rem;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--text);font-size:.82rem">
          <option value="pending" ${p.status === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
          <option value="notified" ${p.status === 'notified' ? 'selected' : ''}>تم الإشعار</option>
          <option value="fulfilled" ${p.status === 'fulfilled' ? 'selected' : ''}>تم التوفير</option>
          <option value="cancelled" ${p.status === 'cancelled' ? 'selected' : ''}>ملغي</option>
        </select>
        <button onclick="deletePreorder('${p.id}')" style="margin-top:.3rem;padding:.4rem .6rem;background:#ff4757;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:.78rem">
          <i class='bx bx-trash'></i> حذف
        </button>
      </td>
    </tr>`;
  }).join('');
}

// Update preorder status
function updatePreorderStatus(id, status) {
  db.ref(`preorders/${id}/status`).set(status).then(() => {
    showToast('تم تحديث حالة الطلب المسبق');
  }).catch(err => {
    console.error(err);
    showToast('حدث خطأ');
  });
}

// Delete preorder
function deletePreorder(id) {
  if (!confirm('هل تريد حذف هذا الطلب المسبق؟')) return;
  db.ref(`preorders/${id}`).remove().then(() => {
    showToast('تم حذف الطلب المسبق');
  }).catch(err => {
    console.error(err);
    showToast('حدث خطأ');
  });
}

// Update preorders badge
function updatePreordersBadge(count) {
  document.querySelectorAll('#navPreordersBadge, #navPreordersBadgeMobile').forEach(b => {
    b.textContent = count;
    b.style.display = count > 0 ? 'flex' : 'none';
  });
}


// ====== 3. SALES POPUPS / NOTIFICATIONS SYSTEM ======

// Notification types configuration
const NOTIFICATION_TYPES = {
  purchase: { icon: '🛒', text: 'اشترى {name} من {city} هذا المنتج منذ {time}' },
  wishlist: { icon: '❤️', text: 'أضاف {name} من {city} هذا المنتج إلى المفضلة' },
  viewing: { icon: '👀', text: 'يشاهد هذا المنتج الآن {count} شخص' },
  hot: { icon: '🔥', text: 'تم بيع {count} قطعة من هذا المنتج هذا الأسبوع' },
  low_stock: { icon: '⏳', text: 'يتبقى {count} قطع فقط في المخزون' },
  coupon: { icon: '🎁', text: 'استخدم عميل كوبون خصم ووفر {amount} جنيهًا' },
  rating: { icon: '⭐', text: 'حصل هذا المنتج على تقييم {rating} من 5' },
  shipping: { icon: '🚚', text: 'تم شحن طلب جديد إلى {city}' },
  payment: { icon: '💳', text: 'تم تأكيد عملية دفع جديدة' },
  new_customer: { icon: '🎉', text: 'انضم عميل جديد إلى متجر Tiger' }
};

// Random Egyptian names for notifications
const RANDOM_NAMES = [
  'أحمد محمود', 'محمد علي', 'خالد إبراهيم', 'عمر حسام', 'يوسف أمين',
  'حسن سعيد', 'محمود عبدالله', 'karim Adel', 'طارق مجدي', 'أمير ناصر',
  'سارة أحمد', 'نور محمد', 'منى خالد', 'هدى عمر', 'رنا محمود',
  'دينا علي', 'سلمى حسن', 'ميرة خالد', 'آية إبراهيم', 'نادية سامي'
];

// Load notification settings from Firebase
function loadNotificationSettings() {
  return db.ref('settings/salesNotifications').once('value').then(snap => {
    const settings = snap.val();
    notificationSettings = settings || {
      enabled: true,
      types: ['purchase', 'wishlist', 'viewing', 'hot', 'low_stock'],
      displayDuration: 5000,
      position: 'bottom-left',
      interval: 30000,
      showOnMobile: true
    };
    
    // Ensure defaults for missing properties
    if (notificationSettings.enabled === undefined) notificationSettings.enabled = true;
    if (!notificationSettings.types) notificationSettings.types = ['purchase', 'wishlist', 'viewing'];
    if (!notificationSettings.displayDuration) notificationSettings.displayDuration = 5000;
    if (!notificationSettings.position) notificationSettings.position = 'bottom-left';
    if (!notificationSettings.interval) notificationSettings.interval = 30000;
    if (notificationSettings.showOnMobile === undefined) notificationSettings.showOnMobile = true;
    
    console.log('[Sales Popups] Settings loaded:', notificationSettings);
    applyNotificationSettingsUI();
    return notificationSettings;
  }).catch(err => {
    console.error('[Sales Popups] Error loading settings:', err);
    // Use default settings on error
    notificationSettings = {
      enabled: true,
      types: ['purchase', 'wishlist', 'viewing', 'hot'],
      displayDuration: 5000,
      position: 'bottom-left',
      interval: 30000,
      showOnMobile: true
    };
    return notificationSettings;
  });
}

// Save notification settings
function saveNotificationSettings() {
  const settings = {
    enabled: document.getElementById('notifEnabled')?.checked ?? true,
    types: Array.from(document.querySelectorAll('.notif-type-check:checked')).map(el => el.value),
    displayDuration: parseInt(document.getElementById('notifDuration')?.value) || 5000,
    position: document.getElementById('notifPosition')?.value || 'bottom-left',
    interval: parseInt(document.getElementById('notifInterval')?.value) || 30000,
    showOnMobile: document.getElementById('notifShowMobile')?.checked ?? true
  };
  
  notificationSettings = settings;
  
  return db.ref('settings/salesNotifications').set(settings).then(() => {
    showToast('تم حفظ إعدادات الإشعارات بنجاح');
  });
}

// Apply settings to UI
function applyNotificationSettingsUI() {
  setTimeout(() => {
    const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    
    setCheck('notifEnabled', notificationSettings.enabled);
    setVal('notifDuration', notificationSettings.displayDuration / 1000);
    setVal('notifPosition', notificationSettings.position);
    setVal('notifInterval', notificationSettings.interval / 1000);
    setCheck('notifShowMobile', notificationSettings.showOnMobile);
    
    // Set type checkboxes
    notificationSettings.types?.forEach(type => {
      const el = document.querySelector(`.notif-type-check[value="${type}"]`);
      if (el) el.checked = true;
    });
  }, 100);
}

// Get random item from array
function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Format time ago
function timeAgo(minutes) {
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

// Create and show sales popup
function showSalesPopup(productData) {
  if (!notificationSettings.enabled) return;
  
  // Check mobile setting
  if (window.innerWidth <= 992 && !notificationSettings.showOnMobile) return;
  
  // Get random enabled type
  const enabledTypes = notificationSettings.types || ['purchase'];
  const type = getRandomItem(enabledTypes);
  const typeConfig = NOTIFICATION_TYPES[type];
  
  if (!typeConfig) return;
  
  // Build message
  let msg = typeConfig.text;
  const name = getRandomItem(RANDOM_NAMES);
  const city = getRandomItem(EGYPT_GOVERNORATES);
  const minutes = Math.floor(Math.random() * 30) + 1;
  
  msg = msg.replace('{name}', name)
           .replace('{city}', city)
           .replace('{time}', timeAgo(minutes))
           .replace('{count}', Math.floor(Math.random() * 50) + 5)
           .replace('{amount}', Math.floor(Math.random() * 300) + 50)
           .replace('{rating}', (Math.random() * 1 + 4).toFixed(1));
  
  // Create popup element
  const popup = document.createElement('div');
  popup.className = 'sales-popup';
  popup.style.cssText = `
    position: fixed;
    ${notificationSettings.position.includes('right') ? 'right' : 'left'}: 20px;
    bottom: 20px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 1rem 1.2rem;
    display: flex;
    align-items: center;
    gap: .8rem;
    max-width: 380px;
    width: calc(100% - 40px);
    box-shadow: 0 10px 40px rgba(0,0,0,.15);
    z-index: 9998;
    cursor: pointer;
    transform: translateX(${notificationSettings.position.includes('right') ? '120%' : '-120%'});
    transition: transform .4s cubic-bezier(.68,-.55,.265,1.55);
    font-family: 'Cairo', sans-serif;
  `;
  
  const productImage = productData?.images?.[0] || '';
  const productName = productData?.name || 'منتج';
  const productId = productData?.id || '';
  
  popup.innerHTML = `
    <div style="font-size:1.8rem">${typeConfig.icon}</div>
    <div style="flex:1;min-width:0">
      <p style="margin:0;font-size:.85rem;color:var(--text);line-height:1.5">${msg}</p>
      <p style="margin:.3rem 0 0;font-size:.78rem;color:var(--gold);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        ${productName}
      </p>
    </div>
    <button onclick="event.stopPropagation();this.closest('.sales-popup').remove()" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--text-dim);padding:.3rem">&times;</button>
  `;
  
  // Click to go to product
  if (productId) {
    popup.onclick = () => {
      window.location.href = `product.html?id=${productId}`;
    };
  }
  
  document.body.appendChild(popup);
  
  // Animate in
  requestAnimationFrame(() => {
    popup.style.transform = 'translateX(0)';
  });
  
  // Auto remove
  setTimeout(() => {
    popup.style.transform = `translateX(${notificationSettings.position.includes('right') ? '120%' : '-120%'})`;
    setTimeout(() => popup.remove(), 400);
  }, notificationSettings.displayDuration || 5000);
}

// Start showing popups periodically
let popupInterval = null;
let productsForPopups = [];
let isPopupsRunning = false;

function startSalesPopups() {
  console.log('[Sales Popups] Starting...');
  
  // Stop existing interval if running
  if (popupInterval) {
    clearInterval(popupInterval);
    popupInterval = null;
  }
  
  loadNotificationSettings().then((settings) => {
    console.log('[Sales Popups] Enabled:', settings.enabled);
    
    if (!settings.enabled) {
      console.log('[Sales Popups] Disabled in settings, not starting');
      return;
    }
    
    // Load products for popups
    db.ref('products').once('value').then(snap => {
      productsForPopups = [];
      snap.forEach(child => {
        const p = child.val();
        if (p.active !== false) {
          productsForPopups.push({id: child.key, ...p});
        }
      });
      
      console.log(`[Sales Popups] Loaded ${productsForPopups.length} products`);
      
      if (productsForPopups.length > 0) {
        isPopupsRunning = true;
        
        // Show first popup after 5 seconds
        setTimeout(() => {
          if (isPopupsRunning && notificationSettings.enabled) {
            showSalesPopup(getRandomItem(productsForPopups));
          }
        }, 5000);
        
        // Then show at interval
        const intervalTime = notificationSettings.interval || 30000;
        popupInterval = setInterval(() => {
          if (isPopupsRunning && notificationSettings.enabled) {
            showSalesPopup(getRandomItem(productsForPopups));
          }
        }, intervalTime);
        
        console.log(`[Sales Popups] Started! Interval: ${intervalTime}ms`);
      } else {
        console.warn('[Sales Popups] No products found to show popups for');
      }
    }).catch(err => {
      console.error('[Sales Popups] Error loading products:', err);
    });
  }).catch(err => {
    console.error('[Sales Popups] Error:', err);
  });
}

// Stop popups
function stopSalesPopups() {
  isPopupsRunning = false;
  if (popupInterval) {
    clearInterval(popupInterval);
    popupInterval = null;
  }
  console.log('[Sales Popups] Stopped');
}


// ====== INTEGRATION WITH EXISTING CODE ======

// Override saveProduct to include stock
const originalSaveProduct = typeof saveProduct === 'function' ? saveProduct : null;

// Enhanced saveProduct that includes stock
function saveProductWithStock() {
  // Call original saveProduct first if exists
  if (originalSaveProduct) {
    originalSaveProduct();
  }
  
  // Then save stock
  const editId = document.getElementById('editProductId')?.value;
  if (editId && Object.keys(stockMatrix).length > 0) {
    db.ref(`products/${editId}/stock`).set(stockMatrix).then(() => {
      console.log('Stock saved successfully');
    });
  }
}

// Hook into existing functions after DOM loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('Tiger Jeans Admin Enhancements Loaded');
  
  // Hook into chip rendering to update stock table
  const originalRenderChips = typeof renderChips === 'function' ? renderChips : null;
  if (originalRenderChips) {
    window.renderChips = function(type) {
      originalRenderChips(type);
      if (type === 'sizes' || type === 'colors') {
        setTimeout(initStockMatrix, 100);
      }
    };
  }
});

// Export functions for global use
window.initStockMatrix = initStockMatrix;
window.renderStockTable = renderStockTable;
window.updateStockCell = updateStockCell;
window.fillAllStock = fillAllStock;
window.loadProductStock = loadProductStock;
window.getProductStock = getProductStock;
window.checkStock = checkStock;
window.deductStock = deductStock;
window.addStockBack = addStockBack;
window.showPreorderModal = showPreorderModal;
window.openPreorderModal = showPreorderModal; // Alias for product.html
window.closePreorderModal = closePreorderModal;
window.submitPreorder = submitPreorder;
window.loadPreorders = loadPreorders;
window.updatePreorderStatus = updatePreorderStatus;
window.deletePreorder = deletePreorder;
window.loadNotificationSettings = loadNotificationSettings;
window.saveNotificationSettings = saveNotificationSettings;
window.startSalesPopups = startSalesPopups;
window.stopSalesPopups = stopSalesPopups;
window.showSalesPopup = showSalesPopup;
