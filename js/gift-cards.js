// ============================================================
// Tiger Jeans — Gift Cards (client logic)
// Firebase schema used:
//   giftCardRequests/{pushId}   -> purchase requests (pending/approved/rejected)
//   giftCards/{CARDNUMBER}      -> the actual activated card (balance, pin, status)
// ============================================================

const GC_TEMPLATES = [500, 1000, 2000, 2500, 3000, 5000];
const GC_MIN = 100;
const GC_MAX = 50000;
const GC_EXPIRY_DAYS = 365;

let gcSelectedAmount = 500;
let gcMethod = "vodafone";
let gcReceiptUrl = "";
let gcPaySettings = {};
let gcMyCardsTab = "all";
let gcMyRequests = [];
let gcMyCards = [];

// ---------- Hero decorative effects (floating boxes / particles / ribbons) ----------
function initGcHeroEffects() {
  const glow = document.getElementById("gcHeroGlow");
  if (!glow) return;
  const icons = ["🎁", "🎀", "✨", "🎉"];
  for (let i = 0; i < 10; i++) {
    const el = document.createElement("span");
    el.className = "gc-float-box";
    el.textContent = icons[i % icons.length];
    el.style.left = Math.random() * 95 + "%";
    el.style.top = Math.random() * 80 + "%";
    el.style.animationDelay = Math.random() * 5 + "s";
    el.style.animationDuration = 6 + Math.random() * 4 + "s";
    glow.appendChild(el);
  }
  for (let i = 0; i < 14; i++) {
    const p = document.createElement("span");
    p.className = "gc-particle";
    p.style.left = Math.random() * 100 + "%";
    p.style.bottom = Math.random() * 40 + "px";
    p.style.animationDelay = Math.random() * 6 + "s";
    glow.appendChild(p);
  }
}

// ---------- Templates ----------
function renderGcTemplates() {
  const grid = document.getElementById("gcTemplatesGrid");
  if (!grid) return;
  grid.innerHTML = GC_TEMPLATES.map((amt, i) => `
    <div class="gc-template ${amt === gcSelectedAmount ? "active" : ""}" data-amt="${amt}" onclick="selectGcTemplate(${amt})">
      <div class="gc-tpl-top">
        <span class="gc-tpl-logo">TIGER</span>
        <i class='bx bxs-gift gc-ribbon-icon'></i>
      </div>
      <div>
        <div class="gc-tpl-amount">${amt.toLocaleString("ar-EG")} <small>ج.م</small></div>
        <div class="gc-tpl-label">بطاقة هدايا فاخرة</div>
      </div>
    </div>
  `).join("");
}

function selectGcTemplate(amt) {
  gcSelectedAmount = amt;
  document.getElementById("gcCustomAmount").value = amt;
  document.getElementById("gcRange").value = Math.min(amt, GC_MAX);
  renderGcTemplates();
  updateGcPreview();
}

// ---------- Custom amount ----------
function onCustomAmountInput() {
  let v = parseInt(document.getElementById("gcCustomAmount").value, 10) || 0;
  gcSelectedAmount = v;
  document.getElementById("gcRange").value = Math.max(GC_MIN, Math.min(v, GC_MAX));
  renderGcTemplates();
  updateGcPreview();
}

function onRangeInput() {
  const v = parseInt(document.getElementById("gcRange").value, 10);
  gcSelectedAmount = v;
  document.getElementById("gcCustomAmount").value = v;
  renderGcTemplates();
  updateGcPreview();
}

function onOccasionChange() {
  updateGcPreview();
}

function updateGcPreview() {
  const amountEl = document.getElementById("gcPreviewAmount");
  const occasionEl = document.getElementById("gcPreviewOccasion");
  const finalEl = document.getElementById("gcFinalAmount");
  const occasionSel = document.getElementById("gcOccasion");

  // animated counter
  animateGcCounter(amountEl, gcSelectedAmount);
  if (occasionEl && occasionSel) occasionEl.textContent = occasionSel.value + " 🎉";
  if (finalEl) finalEl.textContent = fmtPrice(gcSelectedAmount);
}

function animateGcCounter(el, target) {
  if (!el) return;
  const start = parseInt(el.dataset.val || "0", 10) || 0;
  const duration = 300;
  const startTime = performance.now();
  function step(now) {
    const p = Math.min(1, (now - startTime) / duration);
    const val = Math.round(start + (target - start) * p);
    el.textContent = val.toLocaleString("ar-EG");
    if (p < 1) requestAnimationFrame(step);
    else el.dataset.val = target;
  }
  requestAnimationFrame(step);
}

// ---------- Payment method selection (mirrors checkout.html) ----------
function gcSelectPay(method, el) {
  gcMethod = method;
  document.querySelectorAll(".gc-pay-option").forEach((p) => p.classList.remove("active"));
  el.classList.add("active");

  const label = document.getElementById("gcPayLabel");
  const val = document.getElementById("gcPayNumberVal");
  const box = document.getElementById("gcPayNumberBox");
  const receiptField = document.getElementById("gcReceiptField");

  if (method === "vodafone") {
    label.textContent = "حوّل المبلغ على رقم فودافون كاش:";
    val.textContent = gcPaySettings.vodafone || "01012345678";
    box.style.display = "block";
    receiptField.style.display = "block";
  } else if (method === "instapay") {
    label.textContent = "حوّل المبلغ عبر إنستاباي:";
    val.textContent = "@" + (gcPaySettings.instapay || "engmohamednasr");
    box.style.display = "block";
    receiptField.style.display = "block";
  } else {
    label.textContent = "سيتم تحصيل المبلغ نقدًا عند التفعيل / التسليم";
    val.textContent = "—";
    box.style.display = "block";
    receiptField.style.display = "none";
  }
}

async function loadGcPaySettings() {
  try {
    const snap = await db.ref("settings/payment").once("value");
    gcPaySettings = snap.val() || {};
    gcSelectPay(gcMethod, document.querySelector('.gc-pay-option[data-method="vodafone"]'));
  } catch (e) {
    console.error("gift-card pay settings error", e);
  }
}

// ---------- Receipt upload ----------
async function onGcReceiptChange() {
  const input = document.getElementById("gcReceiptInput");
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById("gcReceiptPreview").src = e.target.result;
    document.getElementById("gcReceiptPreview").style.display = "block";
    document.getElementById("gcReceiptPlaceholder").style.display = "none";
  };
  reader.readAsDataURL(file);
  await handleImageInput(input, (url) => { gcReceiptUrl = url; }, document.getElementById("gcReceiptStatus"));
}

// ---------- Submit purchase request ----------
async function submitGiftCardOrder() {
  const senderName = document.getElementById("gcSenderName").value.trim();
  const senderPhone = document.getElementById("gcSenderPhone").value.trim();
  const senderEmail = document.getElementById("gcSenderEmail").value.trim();
  const occasion = document.getElementById("gcOccasion").value;
  const recipientName = document.getElementById("gcRecipientName").value.trim();
  const message = document.getElementById("gcMessage").value.trim();
  const amount = gcSelectedAmount;

  if (!senderName || !senderPhone) {
    showToast("من فضلك أدخل اسمك ورقم موبايلك");
    return;
  }
  if (!/^01[0125][0-9]{8}$/.test(senderPhone)) {
    showToast("رقم الموبايل غير صحيح");
    return;
  }
  if (!amount || amount < GC_MIN || amount > GC_MAX) {
    showToast(`قيمة البطاقة يجب أن تكون بين ${GC_MIN} و ${GC_MAX} ج.م`);
    return;
  }
  if (gcMethod !== "cod" && !gcReceiptUrl) {
    showToast("من فضلك ارفع صورة إيصال التحويل");
    return;
  }

  const btn = document.getElementById("gcSubmitBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> جاري إرسال الطلب...';

  const request = {
    senderName, senderPhone, senderEmail: senderEmail || null,
    occasion, recipientName: recipientName || null, message: message || null,
    amount,
    payment: { method: gcMethod, receiptImage: gcReceiptUrl || null },
    uid: (typeof currentUser !== "undefined" && currentUser) ? currentUser.uid : null,
    status: "pending",
    createdAt: Date.now(),
  };

  try {
    const ref = await db.ref("giftCardRequests").push(request);
    localStorage.setItem("tj_gc_phone", senderPhone);
    showToast("تم إرسال طلب شراء البطاقة ✓ سيتم مراجعته قريبًا");
    document.getElementById("gcSenderName").value = "";
    document.getElementById("gcRecipientName").value = "";
    document.getElementById("gcMessage").value = "";
    document.getElementById("gcReceiptPreview").style.display = "none";
    document.getElementById("gcReceiptPlaceholder").style.display = "block";
    gcReceiptUrl = "";
    if (typeof currentUser !== "undefined" && currentUser) loadMyGiftCards();
  } catch (err) {
    console.error(err);
    showToast("حدث خطأ أثناء إرسال الطلب");
  } finally {
    btn.disabled = false;
    btn.innerHTML = "إرسال طلب الشراء <i class='bx bx-check-double'></i>";
  }
}

// ---------- My Gift Cards ----------
async function loadMyGiftCards() {
  const wrap = document.getElementById("gcMyCardsWrap");
  if (!currentUser) return; // login note stays as-is
  const phone = localStorage.getItem("tj_gc_phone");

  wrap.innerHTML = `
    <div class="gc-tabs">
      <button class="gc-tab-btn active" data-t="all" onclick="setGcMyTab('all',this)">الكل</button>
      <button class="gc-tab-btn" data-t="pending" onclick="setGcMyTab('pending',this)">قيد المراجعة</button>
      <button class="gc-tab-btn" data-t="active" onclick="setGcMyTab('active',this)">متاحة</button>
      <button class="gc-tab-btn" data-t="used" onclick="setGcMyTab('used',this)">مستخدمة</button>
      <button class="gc-tab-btn" data-t="expired" onclick="setGcMyTab('expired',this)">منتهية</button>
    </div>
    <div id="gcMyCardsList"><div class="gc-empty">جاري التحميل...</div></div>
  `;

  try {
    const [reqSnap, cardsSnap] = await Promise.all([
      db.ref("giftCardRequests").orderByChild("uid").equalTo(currentUser.uid).once("value"),
      db.ref("giftCards").orderByChild("ownerUid").equalTo(currentUser.uid).once("value"),
    ]);

    gcMyRequests = [];
    reqSnap.forEach((c) => gcMyRequests.push({ id: c.key, ...c.val() }));
    gcMyCards = [];
    cardsSnap.forEach((c) => gcMyCards.push({ id: c.key, ...c.val() }));

    // Fallback: also match by phone for requests made before login
    if (phone) {
      const byPhoneSnap = await db.ref("giftCardRequests").orderByChild("senderPhone").equalTo(phone).once("value");
      byPhoneSnap.forEach((c) => {
        if (!gcMyRequests.find((r) => r.id === c.key)) gcMyRequests.push({ id: c.key, ...c.val() });
      });
    }

    renderGcMyCards();
  } catch (e) {
    console.error(e);
    document.getElementById("gcMyCardsList").innerHTML = `<div class="gc-empty">تعذر تحميل البطاقات الآن</div>`;
  }
}

function setGcMyTab(tab, el) {
  gcMyCardsTab = tab;
  document.querySelectorAll(".gc-tab-btn").forEach((b) => b.classList.remove("active"));
  el.classList.add("active");
  renderGcMyCards();
}

function renderGcMyCards() {
  const list = document.getElementById("gcMyCardsList");
  if (!list) return;

  let items = [];
  gcMyRequests.forEach((r) => {
    if (r.status === "pending" || r.status === "rejected") {
      items.push({ kind: "request", data: r });
    }
  });
  gcMyCards.forEach((c) => items.push({ kind: "card", data: c }));

  if (gcMyCardsTab !== "all") {
    items = items.filter((it) => {
      const status = it.kind === "request" ? it.data.status : it.data.status;
      if (gcMyCardsTab === "pending") return status === "pending";
      if (gcMyCardsTab === "active") return status === "active";
      if (gcMyCardsTab === "used") return status === "used";
      if (gcMyCardsTab === "expired") return status === "expired";
      return true;
    });
  }

  if (!items.length) {
    list.innerHTML = `<div class="gc-empty">لا توجد بطاقات في هذا القسم</div>`;
    return;
  }

  list.innerHTML = items.map((it) => {
    const d = it.data;
    if (it.kind === "request") {
      const label = d.status === "rejected" ? "مرفوض" : "قيد المراجعة";
      const cls = d.status === "rejected" ? "gc-status-rejected" : "gc-status-pending";
      return `
        <div class="gc-my-card">
          <div>
            <b style="font-family:'Cairo',sans-serif">${fmtPrice(d.amount)}</b>
            <div style="color:var(--text-dim);font-size:.82rem;margin-top:.2rem">طلب شراء بطاقة هدايا — ${new Date(d.createdAt).toLocaleDateString("ar-EG")}</div>
          </div>
          <span class="gc-status-pill ${cls}">${label}</span>
        </div>`;
    }
    const cls = "gc-status-" + (d.status || "active");
    const labels = { active: "متاحة", used: "مستخدمة بالكامل", expired: "منتهية", frozen: "موقوفة" };
    return `
      <div class="gc-my-card">
        <div>
          <b style="font-family:'Cairo',sans-serif">${fmtPrice(d.balance)}</b>
          <div style="color:var(--text-dim);font-size:.82rem;margin-top:.2rem">من أصل ${fmtPrice(d.originalAmount)} · تنتهي ${d.expiresAt ? new Date(d.expiresAt).toLocaleDateString("ar-EG") : "-"}</div>
        </div>
        <div style="display:flex;align-items:center;gap:.6rem">
          <span class="gc-status-pill ${cls}">${labels[d.status] || d.status}</span>
          <button class="btn-secondary" style="padding:.5rem 1rem;font-size:.8rem" onclick="openGcCardModal('${d.id}')">عرض</button>
        </div>
      </div>`;
  }).join("");
}

// ---------- Card modal: scratch reveal + share ----------
function openGcCardModal(cardId) {
  const card = gcMyCards.find((c) => c.id === cardId);
  if (!card) return;
  const modal = document.getElementById("gcCardModal");
  const body = document.getElementById("gcModalBody");

  body.innerHTML = `
    <div class="gc-scratch-wrap" id="gcScratchWrap">
      <div class="gc-scratch-reveal">
        <div style="color:var(--text-dim);font-size:.8rem">رقم البطاقة</div>
        <div style="font-family:'Cairo',sans-serif;font-size:1.2rem;color:var(--gold);letter-spacing:1px;direction:ltr;margin:.3rem 0 .8rem">${card.cardNumber}</div>
        <div style="color:var(--text-dim);font-size:.8rem">الرقم السري (PIN)</div>
        <div style="font-family:'Cairo',sans-serif;font-size:1.4rem;color:#fff;letter-spacing:4px;margin:.3rem 0 .8rem">${card.pin}</div>
        <div style="color:var(--text-dim);font-size:.8rem">الرصيد المتبقي</div>
        <div style="font-family:'Cairo',sans-serif;font-size:1.6rem;color:var(--success);margin:.3rem 0">${fmtPrice(card.balance)}</div>
      </div>
      <canvas class="gc-scratch-canvas" id="gcScratchCanvas"></canvas>
    </div>
    <div style="display:flex;gap:.6rem;margin-top:1.2rem;flex-wrap:wrap">
      <button class="btn-secondary" style="flex:1" onclick="copyToClipboard('${card.cardNumber}', this)"><i class='bx bx-copy'></i> نسخ الرقم</button>
      <button class="btn-primary" style="flex:1" onclick="shareGcCardWhatsapp('${card.id}')"><i class='bx bxl-whatsapp'></i> مشاركة واتساب</button>
    </div>
  `;
  modal.style.display = "flex";
  setTimeout(() => initScratchCanvas(), 30);
}

function closeGcModal() {
  document.getElementById("gcCardModal").style.display = "none";
}

function initScratchCanvas() {
  const wrap = document.getElementById("gcScratchWrap");
  const canvas = document.getElementById("gcScratchCanvas");
  if (!wrap || !canvas) return;
  const rect = wrap.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, "#b8942e");
  grad.addColorStop(1, "#d4af37");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#1a1400";
  ctx.font = "bold 16px Cairo, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("امسح هنا لإظهار البطاقة 🎁", canvas.width / 2, canvas.height / 2);

  let drawing = false;
  function scratch(x, y) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();
  }
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }
  function start(e) { drawing = true; const p = pos(e); scratch(p.x, p.y); }
  function move(e) { if (!drawing) return; const p = pos(e); scratch(p.x, p.y); }
  function end() { drawing = false; }

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  window.addEventListener("mouseup", end);
  canvas.addEventListener("touchstart", start, { passive: true });
  canvas.addEventListener("touchmove", move, { passive: true });
  canvas.addEventListener("touchend", end);
}

function shareGcCardWhatsapp(cardId) {
  const card = gcMyCards.find((c) => c.id === cardId);
  if (!card) return;
  const occasion = card.occasion || "مناسبة سعيدة";
  const recipient = card.recipientName || "";
  let msg = `🎁 ${occasion} ${recipient ? "يا " + recipient : ""}!\n\n`;
  msg += `لم أجد شيئًا يعبّر عن سعادتي بهذه المناسبة أكثر من إهدائك بطاقة هدايا من متجر Tiger.\n`;
  msg += `يمكنك استخدام البطاقة لشراء أفضل الملابس والماركات العالمية.\n\n`;
  msg += `رقم البطاقة: ${card.cardNumber}\n`;
  msg += `الرصيد: ${fmtPrice(card.balance)}\n\n`;
  msg += `رابط المتجر: https://tiger-jeans.com/gift-cards.html`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
}

function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    showToast("تم النسخ ✓");
    if (btn) {
      const original = btn.innerHTML;
      btn.innerHTML = "<i class='bx bx-check'></i> تم النسخ";
      setTimeout(() => (btn.innerHTML = original), 1500);
    }
  }).catch(() => showToast("تعذر النسخ"));
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  initGcHeroEffects();
  renderGcTemplates();
  updateGcPreview();
  loadGcPaySettings();

  // Wait briefly for auth state (config.js sets currentUser on onAuthStateChanged)
  setTimeout(() => {
    if (typeof currentUser !== "undefined" && currentUser) loadMyGiftCards();
  }, 400);
});

if (typeof auth !== "undefined") {
  auth.onAuthStateChanged((user) => {
    if (user) loadMyGiftCards();
  });
}
