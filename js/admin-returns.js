// ============================================================
// Tiger Jeans Admin — Return Requests management
// Reads/writes: returns/{id}   and mirrors status onto orders/{orderId}/returnRequest
// ============================================================

let adminReturns = [];
let returnsActiveFilter = "all";
let returnDecisionTargetId = null;

const RETURN_STATUS_LABELS = {
  pending: "قيد المراجعة",
  approved: "تمت الموافقة",
  rejected: "مرفوض"
};

async function loadReturns() {
  const tbody = document.getElementById("returnsTable");
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:2rem">جاري التحميل...</td></tr>`;
  try {
    const snap = await db.ref("returns").once("value");
    const val = snap.val() || {};
    adminReturns = Object.entries(val)
      .map(([id, r]) => ({ id, ...r }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    renderReturnsTable();
    updateReturnsBadge();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--danger);padding:2rem">تعذر تحميل طلبات الاسترجاع</td></tr>`;
  }
}

function updateReturnsBadge() {
  const pendingCount = adminReturns.filter(r => r.status === "pending").length;
  ["navReturnsBadge", "navReturnsBadgeMobile"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = pendingCount > 0 ? "inline-block" : "none";
    el.textContent = pendingCount;
  });
}

function filterReturnsByStatus(status, btn) {
  returnsActiveFilter = status;
  document.querySelectorAll("#tab-returns .tabs-row button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderReturnsTable();
}

function renderReturnsTable() {
  const list = returnsActiveFilter === "all" ? adminReturns : adminReturns.filter(r => r.status === returnsActiveFilter);
  document.getElementById("returnsTable").innerHTML = list.map(r => `
    <tr>
      <td><b>${r.orderCode || "-"}</b></td>
      <td>${r.name || "-"}<br><span style="color:var(--text-dim);font-size:.78rem">${r.phone || ""}</span></td>
      <td style="max-width:220px">${r.reason || "-"}${r.details ? `<div style="color:var(--text-dim);font-size:.78rem;margin-top:.2rem">${r.details}</div>` : ""}</td>
      <td>${r.imageUrl ? `<a href="${r.imageUrl}" target="_blank" class="action-btn" style="width:32px;height:32px;font-size:.9rem"><i class='bx bx-image'></i></a>` : "—"}</td>
      <td><span class="status-badge ${r.status === 'approved' ? 'status-confirmed' : r.status === 'rejected' ? 'status-cancelled' : 'status-pending'}">${RETURN_STATUS_LABELS[r.status] || r.status}</span></td>
      <td style="font-size:.78rem;color:var(--text-dim)">${r.createdAt ? new Date(r.createdAt).toLocaleDateString("ar-EG") : "-"}</td>
      <td>
        <button class="action-btn" style="width:32px;height:32px;font-size:.9rem" onclick="openReturnDecisionModal('${r.id}')" title="مراجعة"><i class='bx bx-show'></i></button>
      </td>
    </tr>`).join("") || '<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:2rem">لا توجد طلبات استرجاع</td></tr>';
}

function openReturnDecisionModal(id) {
  const r = adminReturns.find(x => x.id === id);
  if (!r) return;
  returnDecisionTargetId = id;
  document.getElementById("returnDecisionInfo").innerHTML = `
    <div><b style="color:var(--text)">رقم الطلب:</b> ${r.orderCode || "-"}</div>
    <div><b style="color:var(--text)">العميل:</b> ${r.name || "-"} — ${r.phone || "-"}</div>
    <div><b style="color:var(--text)">السبب:</b> ${r.reason || "-"}</div>
    ${r.details ? `<div><b style="color:var(--text)">تفاصيل:</b> ${r.details}</div>` : ""}
    ${r.imageUrl ? `<div style="margin-top:.6rem"><img src="${r.imageUrl}" style="max-width:100%;border-radius:8px;border:1px solid var(--line)" /></div>` : ""}
    <div style="margin-top:.6rem"><b style="color:var(--text)">الحالة الحالية:</b> ${RETURN_STATUS_LABELS[r.status] || r.status}</div>`;
  document.getElementById("returnAdminNote").value = r.adminNote || "";
  document.getElementById("returnDecisionModal").classList.add("show");
}

async function decideReturn(newStatus) {
  const r = adminReturns.find(x => x.id === returnDecisionTargetId);
  if (!r) return;
  const note = document.getElementById("returnAdminNote").value.trim();

  try {
    await db.ref("returns/" + r.id).update({
      status: newStatus,
      adminNote: note,
      decidedAt: Date.now()
    });
    if (r.orderId) {
      await db.ref("orders/" + r.orderId + "/returnRequest").update({
        status: newStatus,
        adminNote: note
      });
    }
    showToast(newStatus === "approved" ? "تمت الموافقة على طلب الاسترجاع" : "تم رفض طلب الاسترجاع");
    closeModal("returnDecisionModal");
    loadReturns();
  } catch (e) {
    showToast("حدث خطأ أثناء حفظ القرار");
  }
}
