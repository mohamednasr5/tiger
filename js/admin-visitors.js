// ============================================================
// Tiger Jeans Admin — Visitors analytics & IP blocking
// Reads: visitors/{ipKey}   Reads/writes: blockedIPs/{ipKey}
// ============================================================

let adminVisitors = [];
let adminBlockedIps = [];
let pendingBlockIp = null;

function ipToKeyAdmin(ip) {
  return String(ip || "").replace(/[.:]/g, "_");
}

async function loadVisitors() {
  const vBody = document.getElementById("visitorsTable");
  vBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:2rem">جاري التحميل...</td></tr>`;
  try {
    const [visitorsSnap, blockedSnap] = await Promise.all([
      db.ref("visitors").once("value"),
      db.ref("blockedIPs").once("value")
    ]);

    const visitorsVal = visitorsSnap.val() || {};
    adminVisitors = Object.entries(visitorsVal)
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));

    const blockedVal = blockedSnap.val() || {};
    adminBlockedIps = Object.entries(blockedVal).map(([key, b]) => ({ key, ...b }));

    renderVisitorsKpis();
    renderVisitorsTable(adminVisitors);
    renderBlockedIpsTable();
  } catch (e) {
    vBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger);padding:2rem">تعذر تحميل بيانات الزوار</td></tr>`;
  }
}

function renderVisitorsKpis() {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const today = adminVisitors.filter(v => (now - (v.lastSeen || 0)) <= dayMs).length;
  const week = adminVisitors.filter(v => (now - (v.lastSeen || 0)) <= dayMs * 7).length;

  document.getElementById("kpiTotalVisitors").textContent = adminVisitors.length;
  document.getElementById("kpiTodayVisitors").textContent = today;
  document.getElementById("kpiWeekVisitors").textContent = week;
  document.getElementById("kpiBlockedIps").textContent = adminBlockedIps.length;
}

function locationLabel(v) {
  const parts = [v.city, v.region, v.country].filter(Boolean);
  return parts.length ? parts.join("، ") : "غير معروف";
}

function renderVisitorsTable(list) {
  document.getElementById("visitorsTable").innerHTML = list.map(v => `
    <tr>
      <td style="direction:ltr;text-align:left;font-family:monospace">${v.ip || v.key}</td>
      <td>${locationLabel(v)}</td>
      <td style="font-size:.78rem;color:var(--text-dim)">${v.firstSeen ? new Date(v.firstSeen).toLocaleString("ar-EG") : "-"}</td>
      <td style="font-size:.78rem;color:var(--text-dim)">${v.lastSeen ? new Date(v.lastSeen).toLocaleString("ar-EG") : "-"}</td>
      <td>${v.visitCount || 1}</td>
      <td>
        <button class="action-btn" style="width:32px;height:32px;font-size:.9rem;color:var(--danger)" onclick="openBlockIpModal('${v.ip || v.key}')" title="حظر"><i class='bx bx-block'></i></button>
      </td>
    </tr>`).join("") || '<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:2rem">لا يوجد زوار مسجلين بعد</td></tr>';
}

function filterVisitors(q) {
  if (!q) { renderVisitorsTable(adminVisitors); return; }
  q = q.toLowerCase();
  renderVisitorsTable(adminVisitors.filter(v =>
    (v.ip || "").toLowerCase().includes(q) ||
    (v.city || "").toLowerCase().includes(q) ||
    (v.country || "").toLowerCase().includes(q)
  ));
}

function renderBlockedIpsTable() {
  document.getElementById("blockedIpsTable").innerHTML = adminBlockedIps.map(b => `
    <tr>
      <td style="direction:ltr;text-align:left;font-family:monospace">${b.ip || b.key}</td>
      <td>${b.reason || "-"}</td>
      <td style="font-size:.78rem;color:var(--text-dim)">${b.blockedAt ? new Date(b.blockedAt).toLocaleString("ar-EG") : "-"}</td>
      <td>
        <button class="action-btn" style="width:32px;height:32px;font-size:.9rem" onclick="unblockIp('${b.key}')" title="إلغاء الحظر"><i class='bx bx-lock-open-alt'></i></button>
      </td>
    </tr>`).join("") || '<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:2rem">لا توجد عناوين محظورة</td></tr>';
}

function openBlockIpModal(ip) {
  pendingBlockIp = ip;
  document.getElementById("blockIpValue").value = ip;
  document.getElementById("blockIpLabel").textContent = ip;
  document.getElementById("blockIpReason").value = "";
  document.getElementById("blockIpModal").classList.add("show");
}

async function confirmBlockIp() {
  const ip = document.getElementById("blockIpValue").value;
  const reason = document.getElementById("blockIpReason").value.trim();
  if (!ip) return;
  try {
    await db.ref("blockedIPs/" + ipToKeyAdmin(ip)).set({
      ip,
      reason: reason || "",
      blockedAt: Date.now()
    });
    showToast("تم حظر العنوان بنجاح");
    closeModal("blockIpModal");
    loadVisitors();
  } catch (e) {
    showToast("حدث خطأ أثناء الحظر");
  }
}

async function unblockIp(key) {
  if (!confirm("إلغاء حظر هذا العنوان؟")) return;
  try {
    await db.ref("blockedIPs/" + key).remove();
    showToast("تم إلغاء الحظر");
    loadVisitors();
  } catch (e) {
    showToast("حدث خطأ");
  }
}
