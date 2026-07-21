// ============================================================
// Tiger Jeans Admin — Gift Cards management
// Reads/writes: giftCardRequests/{id}  and  giftCards/{CARDNUMBER}
// ============================================================

let gcAdminTab = "pending";
let gcAdminRequests = [];
let gcAdminCards = [];

function genGiftCardNumber() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0,O,1,I)
  function block() {
    let s = "";
    for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }
  return `TG${block().slice(0, 2)}-${block()}-${block()}-${block()}`;
}

function genGiftCardPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ---------- Real-time sync (mirrors initOrdersRealtime) ----------
// Runs from the moment the admin logs in — not only when the "بطاقات الهدايا"
// tab is opened — so new requests update the nav badge and pop a toast
// immediately, the same way new orders already do.
let gcRealtimeStarted = false;
let gcRequestsLoaded = false;
let gcCardsLoaded = false;

function initGiftCardsRealtime() {
  if (gcRealtimeStarted) return;
  gcRealtimeStarted = true;

  db.ref("giftCardRequests").on("value", (snap) => {
    const val = snap.val() || {};
    const newList = Object.entries(val).map(([id, r]) => ({ id, ...r }));
    const prevIds = new Set(gcAdminRequests.map((r) => r.id));
    const isFirstLoad = !gcRequestsLoaded;
    const addedPending = isFirstLoad ? [] : newList.filter((r) => !prevIds.has(r.id) && r.status === "pending");

    gcAdminRequests = newList;
    gcRequestsLoaded = true;

    updateGcBadge();
    if (addedPending.length) {
      const msg = addedPending.length > 1
        ? `🎁 وصلت ${addedPending.length} طلبات بطاقات هدايا جديدة!`
        : `🎁 وصل طلب بطاقة هدايا جديد من ${addedPending[0].senderName || "عميل"} بقيمة ${fmtPrice(addedPending[0].amount)}`;
      showToast(msg);
      pulseGcNav();
    }

    if (typeof currentTab !== "undefined" && currentTab === "giftcards") {
      renderGcKpis();
      renderGcAdminTable();
    }
  }, (err) => console.error("giftCardRequests realtime error", err));

  db.ref("giftCards").on("value", (snap) => {
    const val = snap.val() || {};
    gcAdminCards = Object.entries(val).map(([id, c]) => ({ id, ...c }));
    gcCardsLoaded = true;

    if (typeof currentTab !== "undefined" && currentTab === "giftcards") {
      renderGcKpis();
      renderGcAdminTable();
    }
  }, (err) => console.error("giftCards realtime error", err));
}

function updateGcBadge() {
  const pendingCount = gcAdminRequests.filter((r) => r.status === "pending").length;
  ["navGiftCardsBadge", "navGiftCardsBadgeMobile"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = pendingCount > 0 ? "inline-block" : "none";
    el.textContent = pendingCount;
  });
}

function pulseGcNav() {
  ["navGiftCardsBadge", "navGiftCardsBadgeMobile"].forEach((id) => {
    const b = document.getElementById(id);
    if (!b) return;
    b.classList.remove("pulse");
    void b.offsetWidth;
    b.classList.add("pulse");
  });
}

// Called when the "بطاقات الهدايا" tab is opened. If the real-time
// listeners are already running (normal case, started at login) this just
// renders the current in-memory data instantly. It also acts as a safety
// net: if for any reason the listeners haven't started yet, it starts them.
async function loadGiftCards() {
  if (!gcRealtimeStarted) {
    document.getElementById("gcTableBody").innerHTML =
      `<tr><td colspan="8" style="text-align:center;color:var(--text-dim);padding:2rem">جاري التحميل...</td></tr>`;
    initGiftCardsRealtime();
  }
  try {
    // Give the just-started listeners a brief moment to deliver their first
    // snapshot if this is the very first load.
    if (!gcRequestsLoaded || !gcCardsLoaded) {
      await new Promise((resolve) => {
        const check = () => {
          if (gcRequestsLoaded && gcCardsLoaded) resolve();
          else setTimeout(check, 100);
        };
        check();
        setTimeout(resolve, 4000); // failsafe timeout
      });
    }

    renderGcKpis();
    renderGcAdminTable();
    updateGcBadge();
  } catch (e) {
    console.error(e);
    document.getElementById("gcTableBody").innerHTML =
      `<tr><td colspan="8" style="text-align:center;color:var(--danger);padding:2rem">تعذر تحميل البيانات</td></tr>`;
  }
}

function renderGcKpis() {
  const grid = document.getElementById("gcKpiGrid");
  if (!grid) return;
  const sold = gcAdminRequests.filter((r) => r.status !== "rejected").length;
  const activeCards = gcAdminCards.filter((c) => c.status === "active");
  const totalRevenue = gcAdminRequests.filter((r) => r.status === "approved" || r.status === "activated").reduce((s, r) => s + (r.amount || 0), 0);
  const outstanding = activeCards.reduce((s, c) => s + (c.balance || 0), 0);
  const redeemed = gcAdminCards.filter((c) => c.status === "used").length;

  grid.innerHTML = `
    <div class="gc-kpi"><b>${gcAdminRequests.length}</b><span>إجمالي الطلبات</span></div>
    <div class="gc-kpi"><b>${activeCards.length}</b><span>بطاقات مفعّلة</span></div>
    <div class="gc-kpi"><b>${redeemed}</b><span>بطاقات مستخدمة بالكامل</span></div>
    <div class="gc-kpi"><b>${fmtPrice(totalRevenue)}</b><span>إجمالي الإيرادات</span></div>
    <div class="gc-kpi"><b>${fmtPrice(outstanding)}</b><span>رصيد متبقٍ في التداول</span></div>
  `;
}

function setGcAdminTab(tab, el) {
  gcAdminTab = tab;
  document.querySelectorAll(".gc-admin-tab-btn").forEach((b) => b.classList.remove("active"));
  el.classList.add("active");
  renderGcAdminTable();
}

function renderGcAdminTable() {
  const head = document.getElementById("gcTableHead");
  const body = document.getElementById("gcTableBody");

  if (gcAdminTab === "pending" || gcAdminTab === "rejected") {
    head.innerHTML = `<tr>
      <th>المرسل</th><th>الموبايل</th><th>المبلغ</th><th>طريقة الدفع</th><th>إيصال</th><th>المناسبة</th><th>التاريخ</th><th>إجراءات</th>
    </tr>`;
    const rows = gcAdminRequests.filter((r) => r.status === gcAdminTab);
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-dim);padding:2rem">لا توجد طلبات</td></tr>`;
      return;
    }
    body.innerHTML = rows.map((r) => `
      <tr>
        <td>${r.senderName || "-"}</td>
        <td dir="ltr">${r.senderPhone || "-"}</td>
        <td><b>${fmtPrice(r.amount)}</b></td>
        <td>${paymentMethodLabel(r.payment?.method)}</td>
        <td>${r.payment?.receiptImage ? `<a href="${r.payment.receiptImage}" target="_blank"><i class='bx bx-image'></i> عرض</a>` : "—"}</td>
        <td>${r.occasion || "-"}</td>
        <td>${new Date(r.createdAt).toLocaleDateString("ar-EG")}</td>
        <td style="display:flex;gap:.4rem;flex-wrap:wrap">
          ${gcAdminTab === "pending" ? `
            <button class="btn-primary" style="padding:.4rem .8rem;font-size:.78rem" onclick="approveGiftCardRequest('${r.id}')"><i class='bx bx-check'></i> موافقة وتوليد</button>
            <button class="btn-secondary" style="padding:.4rem .8rem;font-size:.78rem" onclick="rejectGiftCardRequest('${r.id}')"><i class='bx bx-x'></i> رفض</button>
          ` : ""}
          <button class="btn-secondary" style="padding:.4rem .8rem;font-size:.78rem" onclick="deleteGiftCardRequest('${r.id}')"><i class='bx bx-trash'></i></button>
        </td>
      </tr>
    `).join("");
    return;
  }

  // active / used / expired -> show real cards
  head.innerHTML = `<tr>
    <th>رقم البطاقة</th><th>المستلم</th><th>الرصيد</th><th>القيمة الأصلية</th><th>الحالة</th><th>تاريخ التفعيل</th><th>الانتهاء</th><th>إجراءات</th>
  </tr>`;
  const rows = gcAdminCards.filter((c) => c.status === gcAdminTab);
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-dim);padding:2rem">لا توجد بطاقات</td></tr>`;
    return;
  }
  body.innerHTML = rows.map((c) => `
    <tr>
      <td dir="ltr" style="font-family:'Cairo',sans-serif">${c.cardNumber}</td>
      <td>${c.recipientName || c.ownerPhone || "-"}</td>
      <td><b>${fmtPrice(c.balance)}</b></td>
      <td>${fmtPrice(c.originalAmount)}</td>
      <td><span class="gc-status gc-status-${c.status}">${gcStatusLabel(c.status)}</span></td>
      <td>${c.activatedAt ? new Date(c.activatedAt).toLocaleDateString("ar-EG") : "-"}</td>
      <td>${c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("ar-EG") : "-"}</td>
      <td style="display:flex;gap:.4rem;flex-wrap:wrap">
        ${c.status === "active" ? `<button class="btn-secondary" style="padding:.4rem .8rem;font-size:.78rem" onclick="freezeGiftCard('${c.id}')"><i class='bx bx-pause'></i> إيقاف</button>` : ""}
        ${c.status === "frozen" ? `<button class="btn-primary" style="padding:.4rem .8rem;font-size:.78rem" onclick="unfreezeGiftCard('${c.id}')"><i class='bx bx-play'></i> تفعيل</button>` : ""}
        <button class="btn-secondary" style="padding:.4rem .8rem;font-size:.78rem" onclick="viewGiftCardDetail('${c.id}')"><i class='bx bx-show'></i></button>
        <button class="btn-secondary" style="padding:.4rem .8rem;font-size:.78rem" onclick="deleteGiftCardRecord('${c.id}')"><i class='bx bx-trash'></i></button>
      </td>
    </tr>
  `).join("");
}

function paymentMethodLabel(m) {
  return { vodafone: "فودافون كاش", instapay: "إنستاباي", cod: "عند الاستلام" }[m] || m || "-";
}
function gcStatusLabel(s) {
  return { active: "مفعّلة", used: "مستخدمة", expired: "منتهية", frozen: "موقوفة" }[s] || s;
}

// ---------- Approve request -> generate a unique card number + PIN ----------
async function approveGiftCardRequest(requestId) {
  const request = gcAdminRequests.find((r) => r.id === requestId);
  if (!request) return;
  if (!confirm(`تأكيد الموافقة على طلب بقيمة ${fmtPrice(request.amount)} وتوليد بطاقة جديدة؟`)) return;

  try {
    // Ensure the generated card number doesn't already exist (retry a few times)
    let cardNumber, cardKey, exists = true, attempts = 0;
    while (exists && attempts < 8) {
      cardNumber = genGiftCardNumber();
      cardKey = cardNumber.replace(/-/g, "");
      const check = await db.ref("giftCards/" + cardKey).once("value");
      exists = check.exists();
      attempts++;
    }
    if (exists) { showToast("تعذر توليد رقم بطاقة فريد، حاول مرة أخرى"); return; }

    const pin = genGiftCardPin();
    const now = Date.now();
    const expiresAt = now + GC_ADMIN_EXPIRY_MS;

    const card = {
      cardNumber, pin,
      originalAmount: request.amount,
      balance: request.amount,
      status: "active",
      ownerUid: request.uid || null,
      ownerPhone: request.senderPhone || null,
      recipientName: request.recipientName || null,
      occasion: request.occasion || null,
      message: request.message || null,
      requestId,
      createdAt: request.createdAt,
      activatedAt: now,
      expiresAt,
      timeline: [
        { event: "created", ts: request.createdAt },
        { event: "payment_received", ts: request.createdAt },
        { event: "approved", ts: now },
        { event: "activated", ts: now },
      ],
    };

    await db.ref("giftCards/" + cardKey).set(card);
    await db.ref("giftCardRequests/" + requestId).update({ status: "approved", cardNumber, approvedAt: now });

    showToast(`تم توليد البطاقة ${cardNumber} بنجاح ✓`);
    loadGiftCards();
  } catch (e) {
    console.error(e);
    showToast("حدث خطأ أثناء توليد البطاقة");
  }
}

async function rejectGiftCardRequest(requestId) {
  if (!confirm("تأكيد رفض هذا الطلب؟")) return;
  try {
    await db.ref("giftCardRequests/" + requestId).update({ status: "rejected", rejectedAt: Date.now() });
    showToast("تم رفض الطلب");
    loadGiftCards();
  } catch (e) {
    console.error(e);
    showToast("حدث خطأ");
  }
}

async function deleteGiftCardRequest(requestId) {
  if (!confirm("حذف هذا الطلب نهائيًا؟")) return;
  try {
    await db.ref("giftCardRequests/" + requestId).remove();
    showToast("تم الحذف");
    loadGiftCards();
  } catch (e) {
    console.error(e);
    showToast("حدث خطأ");
  }
}

async function deleteGiftCardRecord(cardId) {
  if (!confirm("حذف هذه البطاقة نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.")) return;
  try {
    await db.ref("giftCards/" + cardId).remove();
    showToast("تم الحذف");
    loadGiftCards();
  } catch (e) {
    console.error(e);
    showToast("حدث خطأ");
  }
}

async function freezeGiftCard(cardId) {
  try {
    await db.ref("giftCards/" + cardId).update({ status: "frozen" });
    showToast("تم إيقاف البطاقة مؤقتًا");
    loadGiftCards();
  } catch (e) { console.error(e); showToast("حدث خطأ"); }
}

async function unfreezeGiftCard(cardId) {
  try {
    await db.ref("giftCards/" + cardId).update({ status: "active" });
    showToast("تم إعادة تفعيل البطاقة");
    loadGiftCards();
  } catch (e) { console.error(e); showToast("حدث خطأ"); }
}

function viewGiftCardDetail(cardId) {
  const c = gcAdminCards.find((x) => x.id === cardId);
  if (!c) return;
  const body = document.getElementById("gcAdminModalBody");
  body.innerHTML = `
    <div style="display:grid;gap:.6rem">
      <div><span style="color:var(--text-dim);font-size:.82rem">رقم البطاقة</span><br><b dir="ltr" style="font-family:'Cairo',sans-serif;color:var(--gold)">${c.cardNumber}</b></div>
      <div><span style="color:var(--text-dim);font-size:.82rem">الرقم السري</span><br><b>${c.pin}</b></div>
      <div><span style="color:var(--text-dim);font-size:.82rem">الرصيد الحالي / القيمة الأصلية</span><br><b>${fmtPrice(c.balance)} / ${fmtPrice(c.originalAmount)}</b></div>
      <div><span style="color:var(--text-dim);font-size:.82rem">المستلم / المناسبة</span><br>${c.recipientName || "-"} — ${c.occasion || "-"}</div>
      <div><span style="color:var(--text-dim);font-size:.82rem">تاريخ التفعيل / الانتهاء</span><br>${new Date(c.activatedAt).toLocaleString("ar-EG")} → ${new Date(c.expiresAt).toLocaleString("ar-EG")}</div>
      ${(c.redemptions || []).length ? `
        <div>
          <span style="color:var(--text-dim);font-size:.82rem">سجل الاستخدام</span>
          <div style="margin-top:.4rem;display:grid;gap:.3rem">
            ${c.redemptions.map(r => `<div style="background:var(--bg-alt);border-radius:8px;padding:.5rem .7rem;font-size:.82rem;display:flex;justify-content:space-between"><span>طلب #${r.orderId || "-"}</span><b>${fmtPrice(r.amount)}</b></div>`).join("")}
          </div>
        </div>` : ""}
    </div>
  `;
  document.getElementById("gcAdminModal").classList.add("show");
}

const GC_ADMIN_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000;
