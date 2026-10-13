// app.js — WebKasir Kebab
// Fitur: Multi-Order, Varian Rasa & Sayur, QR/Cash, Histori per Hari (7 hari), Export Excel

// ===== HELPERS: TANGGAL =====
function todayKey() {
  // Format: "2026-10-07"
  const d = new Date();
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

function fmtDateLabel(dateKey) {
  // "2026-10-07" → tampil sebagai "Selasa, 7 Oktober 2026"
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// ===== STATE =====
let orders    = [];
let orderSeq  = 0;
let activeId  = null;

// historyDays: { "2026-10-07": [ {order}, ... ], ... }
let historyDays = {};

let isMobile  = false;
let mobileTab = "menu";
let panelTab  = "orders";

// Tab aktif di histori (dateKey)
let historyActiveDay = todayKey();

// Modal state
let modalItem   = null;
let modalRasa   = "Saos Tomat";
let modalSayur  = "Lengkap";
let modalQtyVal = 1;

// ===== STORAGE HELPERS =====
function saveState() {
  try {
    localStorage.setItem("wk_orders",     JSON.stringify(orders));
    localStorage.setItem("wk_orderSeq",   String(orderSeq));
    localStorage.setItem("wk_historyDays",JSON.stringify(historyDays));
    localStorage.setItem("wk_activeId",   activeId ? String(activeId) : "");
    localStorage.setItem("wk_date",       todayKey()); // simpan tanggal terakhir
  } catch (e) {
    console.warn("Storage save error:", e);
  }
}

function loadState() {
  try {
    const sOrders = localStorage.getItem("wk_orders");
    const sSeq    = localStorage.getItem("wk_orderSeq");
    const sHist   = localStorage.getItem("wk_historyDays");
    const sAct    = localStorage.getItem("wk_activeId");
    const sDate   = localStorage.getItem("wk_date");

    if (sOrders) orders      = JSON.parse(sOrders);
    if (sSeq)    orderSeq    = parseInt(sSeq, 10) || 0;
    if (sHist)   historyDays = JSON.parse(sHist);
    if (sAct)    activeId    = parseInt(sAct, 10) || null;

    // ── Cek ganti hari: jika tanggal berubah, hapus antrian aktif
    const today = todayKey();
    if (sDate && sDate !== today) {
      // Hari baru: bersihkan antrian pesanan
      orders   = [];
      orderSeq = 0;
      activeId = null;
    }

    // ── Auto-hapus histori lebih dari 7 hari
    purgeOldHistory();

  } catch (e) {
    console.warn("Storage load error:", e);
  }
}

function purgeOldHistory() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  Object.keys(historyDays).forEach(key => {
    const [y, m, d] = key.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    if (dt < cutoff) {
      delete historyDays[key];
    }
  });
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  checkMobile();
  renderCategories();
  renderMenu(0);
  updateTime();
  setInterval(updateTime, 1000);
  // Cek ganti hari setiap menit
  setInterval(checkDayChange, 60000);
  window.addEventListener("resize", checkMobile);

  // Pastikan ada 1 pesanan aktif
  const activeOrder = orders.find(o => o.status !== "done");
  if (!activeOrder && orders.length === 0) {
    createNewOrder(false);
  } else if (!activeId && activeOrder) {
    activeId = activeOrder.id;
  }

  renderOrders();
  updateActiveLabel();
  updateBadge();

  // Set tab histori ke hari ini
  historyActiveDay = todayKey();
});

// ===== CEK GANTI HARI =====
function checkDayChange() {
  const today = todayKey();
  const saved = localStorage.getItem("wk_date") || "";
  if (saved && saved !== today) {
    // Hari baru! Reset pesanan
    orders   = [];
    orderSeq = 0;
    activeId = null;
    purgeOldHistory();
    saveState();
    createNewOrder(false);
    renderOrders();
    updateActiveLabel();
    updateBadge();
    historyActiveDay = today;
    showToast("🌅 Hari baru! Antrian pesanan direset");
  }
}

// ===== MOBILE DETECTION =====
function checkMobile() {
  const was = isMobile;
  isMobile = window.innerWidth <= 768;
  if (isMobile !== was) {
    if (isMobile) applyMobileTab(mobileTab);
    else {
      document.getElementById("view-menu").classList.remove("tab-active","tab-inactive","tab-inactive-l");
      document.getElementById("view-right").classList.remove("tab-active","tab-inactive","tab-inactive-l");
    }
  }
}

// ===== MOBILE TAB =====
function switchMobileTab(tab) {
  mobileTab = tab;
  applyMobileTab(tab);
}

function applyMobileTab(tab) {
  if (!isMobile) return;
  const menu  = document.getElementById("view-menu");
  const right = document.getElementById("view-right");
  const bMenu = document.getElementById("bnav-menu");
  const bOrd  = document.getElementById("bnav-orders");
  const bHist = document.getElementById("bnav-history");

  [menu, right].forEach(e => e.classList.remove("tab-active","tab-inactive","tab-inactive-l"));
  [bMenu, bOrd, bHist].forEach(e => e.classList.remove("active"));

  if (tab === "menu") {
    menu.classList.add("tab-active");
    right.classList.add("tab-inactive");
    bMenu.classList.add("active");
    switchPanelTab(panelTab);
  } else if (tab === "orders") {
    right.classList.add("tab-active");
    menu.classList.add("tab-inactive-l");
    bOrd.classList.add("active");
    switchPanelTab("orders");
  } else {
    right.classList.add("tab-active");
    menu.classList.add("tab-inactive-l");
    bHist.classList.add("active");
    switchPanelTab("history");
  }
}

// ===== PANEL TAB =====
function switchPanelTab(tab) {
  panelTab = tab;
  document.getElementById("panel-orders").classList.toggle("hidden", tab !== "orders");
  document.getElementById("panel-history").classList.toggle("hidden", tab !== "history");
  document.getElementById("ptab-orders").classList.toggle("active", tab === "orders");
  document.getElementById("ptab-history").classList.toggle("active", tab === "history");
  if (tab === "history") renderHistory();
}

// ===== JAM =====
function updateTime() {
  const now = new Date();
  const jam = now.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false });
  const tgl = now.toLocaleDateString("id-ID", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
  const tm = document.getElementById("time-main");
  const td = document.getElementById("time-date");
  if (tm) tm.textContent = jam;
  if (td) td.textContent = tgl;
}

// ===== PESANAN BARU =====
function createNewOrder(switchTab = true) {
  orderSeq++;
  const now = new Date();
  const timeStr = now.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit" });
  const order = {
    id:           orderSeq,
    label:        "Pesanan #" + orderSeq,
    time:         timeStr,
    customerType: "Reguler", // "Reguler" | "BCL"
    items:        [],
    cash:         0,
    payMethod:    "Cash", // default
    status:       "active"
  };
  orders.push(order);
  activeId = order.id;
  renderOrders();
  updateActiveLabel();
  updateBadge();
  saveState();
  showToast("📋 " + order.label + " dibuat");
  if (switchTab && isMobile) switchMobileTab("menu");
  return order;
}

// ===== SET ACTIVE ORDER =====
function setActiveOrder(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order || order.status === "done") return;
  activeId = orderId;
  renderOrders();
  updateActiveLabel();
  saveState();
  showToast("✏️ Tambahkan ke Pesanan #" + orderId);
  if (isMobile) switchMobileTab("menu");
}

function updateActiveLabel() {
  const el = document.getElementById("active-order-label");
  if (!el) return;
  const order = orders.find(o => o.id === activeId);
  el.textContent = (order && order.status !== "done")
    ? "➕ Tambah ke Pesanan #" + activeId
    : "Pilih pesanan aktif";
}

// ===== SET METODE BAYAR =====
function setPayMethod(orderId, method) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  order.payMethod = method;

  // Jika QR dipilih, sembunyikan input uang & kembalian (tidak perlu hitung)
  const cashSection = document.getElementById("cash-section-" + orderId);
  if (cashSection) {
    cashSection.classList.toggle("hidden-pay", method === "QR");
  }

  // Update tombol aktif
  const btnCash = document.getElementById("pm-cash-" + orderId);
  const btnQr   = document.getElementById("pm-qr-" + orderId);
  if (btnCash) btnCash.classList.toggle("active", method === "Cash");
  if (btnQr)   btnQr.classList.toggle("active", method === "QR");

  saveState();
}

// ===== SET TIPE PEMBELI (Reguler / BCL) =====
function setCustomerType(orderId, type) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  order.customerType = type;

  const btnReg = document.getElementById("ct-reg-" + orderId);
  const btnBcl = document.getElementById("ct-bcl-" + orderId);
  if (btnReg) btnReg.classList.toggle("active", type === "Reguler");
  if (btnBcl) btnBcl.classList.toggle("active", type === "BCL");

  const badge = document.getElementById("ct-badge-" + orderId);
  if (badge) {
    badge.className = "cust-type-badge " + (type === "BCL" ? "ct-badge-bcl" : "ct-badge-reg");
    badge.textContent = type === "BCL" ? "🏡 BCL" : "👤 Reguler";
  }

  saveState();
}

// ===== BATALKAN PESANAN =====
function cancelOrder(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  if (order.items.length > 0 && !confirm("Batalkan & hapus " + order.label + "?")) return;
  orders = orders.filter(o => o.id !== orderId);
  if (activeId === orderId) {
    const next = orders.find(o => o.status !== "done");
    activeId = next ? next.id : null;
    updateActiveLabel();
  }
  renderOrders();
  updateBadge();
  saveState();
  showToast("🗑️ " + order.label + " dibatalkan");
}

// ===== RENDER KATEGORI =====
function renderCategories() {
  const c = document.getElementById("category-tabs");
  if (!c) return;
  c.innerHTML = "";
  MENU_KATEGORI.forEach((cat, i) => {
    const btn = document.createElement("button");
    btn.className = "cat-btn" + (i === 0 ? " active" : "");
    btn.id = "cat-btn-" + i;
    btn.innerHTML = cat.emoji + " " + cat.nama;
    btn.onclick = () => switchCategory(i);
    c.appendChild(btn);
  });
}

function switchCategory(index) {
  document.querySelectorAll(".cat-btn").forEach((b, i) => b.classList.toggle("active", i === index));
  renderMenu(index);
}

// ===== RENDER MENU GRID =====
function renderMenu(catIndex) {
  const grid = document.getElementById("menu-grid");
  if (!grid) return;
  grid.innerHTML = "";
  MENU_KATEGORI[catIndex].items.forEach(item => {
    const card = document.createElement("div");
    card.className = "menu-card";
    card.id = "menu-item-" + item.id;
    card.innerHTML =
      '<div class="menu-card-name">' + item.nama + '</div>' +
      '<div class="menu-card-price">' + fmt(item.harga) + '</div>' +
      '<div class="menu-card-add">+</div>';
    card.addEventListener("click", () => showItemModal(item));
    grid.appendChild(card);
  });
}

// ============================================================
// MODAL VARIAN (Rasa & Sayur)
// ============================================================

function showItemModal(item) {
  let order = orders.find(o => o.id === activeId && o.status !== "done");
  if (!order) {
    order = orders.find(o => o.status !== "done");
    if (order) {
      activeId = order.id;
      updateActiveLabel();
    } else {
      order = createNewOrder(false);
    }
  }

  modalItem   = item;
  modalRasa   = "Saos Tomat";
  modalSayur  = "Lengkap";
  modalQtyVal = 1;

  document.getElementById("modal-item-name").textContent  = item.nama;
  document.getElementById("modal-item-price").textContent = fmt(item.harga);
  document.getElementById("modal-qty-num").textContent     = 1;
  document.getElementById("btn-confirm-add").textContent   = "Tambahkan ke " + order.label;

  document.querySelectorAll("#opt-rasa  .opt-btn").forEach(b => b.classList.toggle("active", b.dataset.val === modalRasa));
  document.querySelectorAll("#opt-sayur .opt-btn").forEach(b => b.classList.toggle("active", b.dataset.val === modalSayur));

  document.getElementById("modal-overlay").classList.add("open");
  document.getElementById("modal-sheet").classList.add("open");
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
  document.getElementById("modal-sheet").classList.remove("open");
  modalItem = null;
}

function selectOpt(group, btn) {
  const parent = btn.parentElement;
  parent.querySelectorAll(".opt-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  if (group === "rasa")  modalRasa  = btn.dataset.val;
  if (group === "sayur") modalSayur = btn.dataset.val;
}

function modalQtyChange(delta) {
  modalQtyVal = Math.max(1, modalQtyVal + delta);
  document.getElementById("modal-qty-num").textContent = modalQtyVal;
}

function confirmAdd() {
  if (!modalItem || !activeId) { closeModal(); return; }
  const order = orders.find(o => o.id === activeId);
  if (!order) { closeModal(); return; }

  const existing = order.items.find(i =>
    i.id === modalItem.id && i.rasa === modalRasa && i.sayur === modalSayur
  );

  if (existing) {
    existing.qty += modalQtyVal;
  } else {
    order.items.push({
      id:    modalItem.id,
      nama:  modalItem.nama,
      harga: modalItem.harga,
      rasa:  modalRasa,
      sayur: modalSayur,
      qty:   modalQtyVal,
    });
  }

  closeModal();
  renderOrders();
  updateBadge();
  saveState();

  showToast("+ " + modalItem.nama + " (" + modalRasa + ", " + modalSayur + ") → #" + activeId);
}

// ============================================================
// ORDER LOGIC
// ============================================================

function changeQty(orderId, itemIndex, delta) {
  const order = orders.find(o => o.id === orderId);
  if (!order || order.status === "done") return;
  order.items[itemIndex].qty += delta;
  if (order.items[itemIndex].qty <= 0) order.items.splice(itemIndex, 1);
  renderOrderCard(order);
  updateBadge();
  saveState();
}

function setCash(orderId, value) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  order.cash = parseInt(value, 10) || 0;
  updateChangeBox(order);
  saveState();
}

function setQuickCash(orderId, amount) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  order.cash = amount;
  const el = document.getElementById("cash-" + orderId);
  if (el) el.value = amount;
  updateChangeBox(order);
  saveState();
}

function updateChangeBox(order) {
  const total  = orderTotal(order);
  const change = order.cash - total;
  const box    = document.getElementById("chbox-" + order.id);
  const amt    = document.getElementById("chamt-" + order.id);
  if (!box || !amt) return;
  box.className = "change-box";
  if (order.cash === 0 || total === 0) {
    amt.textContent = fmt(0);
  } else if (change >= 0) {
    box.classList.add("ok");
    amt.textContent = fmt(change);
  } else {
    box.classList.add("kurang");
    amt.textContent = "Kurang " + fmt(Math.abs(change));
  }
}

function orderTotal(order) {
  return order.items.reduce((s, i) => s + i.harga * i.qty, 0);
}

function markDone(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  if (order.items.length === 0) { showToast("⚠️ Pesanan #" + orderId + " kosong!"); return; }

  order.status   = "done";
  order.doneTime = new Date().toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit" });
  order.date     = todayKey();

  // Simpan ke historyDays
  const dk = todayKey();
  if (!historyDays[dk]) historyDays[dk] = [];
  historyDays[dk].push(JSON.parse(JSON.stringify(order)));

  if (activeId === orderId) {
    const next = orders.find(o => o.status !== "done");
    activeId = next ? next.id : null;
    updateActiveLabel();
  }

  renderOrders();
  updateBadge();
  saveState();

  const payIcon = order.payMethod === "QR" ? "📱" : "💵";
  showToast("✅ Pesanan #" + orderId + " selesai! " + payIcon + " " + order.payMethod);
}

// ===== RENDER ALL ORDERS =====
function renderOrders() {
  const c = document.getElementById("orders-list");
  if (!c) return;
  c.innerHTML = "";
  if (orders.length === 0) {
    c.innerHTML = '<div class="empty-orders"><div class="empty-icon">📋</div><p>Belum ada pesanan</p><small>Tap "+ Pesanan Baru" untuk mulai</small></div>';
    return;
  }
  const active = orders.filter(o => o.status !== "done");
  const done   = orders.filter(o => o.status === "done");
  [...active, ...done].forEach(o => c.appendChild(buildOrderCard(o)));
}

function renderOrderCard(order) {
  const old = document.getElementById("oc-" + order.id);
  if (old) old.replaceWith(buildOrderCard(order));
}

// ===== BUILD ORDER CARD =====
function buildOrderCard(order) {
  const total    = orderTotal(order);
  const isDone   = order.status === "done";
  const isAct    = order.id === activeId;
  const custType = order.customerType || "Reguler";

  const card = document.createElement("div");
  card.className = "order-card" + (isAct && !isDone ? " is-active" : "") + (isDone ? " is-done" : "");
  card.id = "oc-" + order.id;

  let bClass = "badge-pending", bText = "Menunggu";
  if (isDone) { bClass = "badge-done";   bText = "Selesai"; }
  if (isAct)  { bClass = "badge-active"; bText = "Aktif"; }

  const custBadgeClass = custType === "BCL" ? "ct-badge-bcl" : "ct-badge-reg";
  const custBadgeText  = custType === "BCL" ? "🏡 BCL" : "👤 Reguler";

  // Header
  card.innerHTML =
    '<div class="order-card-header" onclick="' + (isDone ? "" : "setActiveOrder(" + order.id + ")") + '">' +
      '<div class="order-card-left">' +
        '<span class="order-num">' + order.label + '</span>' +
        '<span class="order-status-badge ' + bClass + '">' + bText + '</span>' +
        '<span class="cust-type-badge ' + custBadgeClass + '" id="ct-badge-' + order.id + '">' + custBadgeText + '</span>' +
        '<span class="active-indicator">✏️ Tambah di sini</span>' +
      '</div>' +
      '<span class="order-time">⏰ ' + order.time + (isDone ? " → " + order.doneTime : "") + '</span>' +
    '</div>';

  // Body
  const body = document.createElement("div");
  body.className = "order-card-body";

  // Items table
  const table = document.createElement("div");
  table.className = "order-items-table";

  if (order.items.length === 0) {
    table.innerHTML = '<div style="font-size:12px;color:var(--dim);padding:6px 4px;">Belum ada item — pilih dari menu</div>';
  } else {
    order.items.forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "order-row";

      let rasaClass = "rasa-tomat";
      let rasaIcon  = "🍅";
      if (item.rasa === "No Saos")       { rasaClass = "rasa-nosaos"; rasaIcon = "🚫"; }
      else if (item.rasa === "Sedang")   { rasaClass = "rasa-sedang"; rasaIcon = "🌶️"; }
      else if (item.rasa === "Pedas")    { rasaClass = "rasa-pedas";  rasaIcon = "🔥"; }

      let sayurClass = "sayur-ok";
      let sayurIcon  = "🥗";
      let sayurLabel = item.sayur;
      if (item.sayur === "No Sayur") {
        sayurClass = "sayur-no";
        sayurIcon  = "🚫";
        sayurLabel = "No Sayur";
      } else if (item.sayur === "No Mayo") {
        sayurClass = "sayur-nomayo";
        sayurIcon  = "🥛";
        sayurLabel = "No Mayo";
      } else if (item.sayur === "No Sayur & Mayo") {
        sayurClass = "sayur-no";
        sayurIcon  = "⛔";
        sayurLabel = "Polos (No Sayur & Mayo)";
      } else {
        sayurClass = "sayur-ok";
        sayurIcon  = "🥗";
        sayurLabel = "Lengkap";
      }

      row.innerHTML =
        '<div class="order-row-top">' +
          '<div class="order-row-name">' + item.nama + '</div>' +
          '<div class="order-row-qty">' +
            (isDone ? '' : '<button class="qbtn minus" onclick="changeQty(' + order.id + ',' + idx + ',-1)">&#8722;</button>') +
            '<span class="qnum">' + item.qty + '</span>' +
            (isDone ? '' : '<button class="qbtn plus" onclick="changeQty(' + order.id + ',' + idx + ',1)">+</button>') +
          '</div>' +
          '<div class="order-row-sub">' + fmt(item.harga * item.qty) + '</div>' +
        '</div>' +
        '<div class="order-row-variants">' +
          '<span class="vtag ' + rasaClass + '">' + rasaIcon + ' ' + item.rasa + '</span>' +
          '<span class="vtag ' + sayurClass + '">' + sayurIcon + ' ' + sayurLabel + '</span>' +
        '</div>';
      table.appendChild(row);
    });
  }
  body.appendChild(table);

  // Divider + Total
  const d = document.createElement("div"); d.className = "card-divider"; body.appendChild(d);
  const tRow = document.createElement("div");
  tRow.className = "order-total-row";
  tRow.innerHTML = '<span class="ot-label">Total</span><span class="ot-amount" id="ot-' + order.id + '">' + fmt(total) + '</span>';
  body.appendChild(tRow);

  // === PAYMENT SECTION (hanya kalau belum done) ===
  if (!isDone) {
    const pay = document.createElement("div");
    pay.className = "order-payment";

    // ── Pilihan Tipe Pembeli: Reguler / BCL ──
    const ctRow = document.createElement("div");
    ctRow.className = "cust-type-row";
    ctRow.innerHTML = '<span class="pay-label">Tipe Pembeli</span>';

    const ctBtns = document.createElement("div");
    ctBtns.className = "cust-type-btns";

    const btReg = document.createElement("button");
    btReg.id        = "ct-reg-" + order.id;
    btReg.className = "ct-btn" + (custType === "Reguler" ? " active" : "");
    btReg.innerHTML = "👤 Reguler";
    btReg.onclick   = () => setCustomerType(order.id, "Reguler");

    const btBcl = document.createElement("button");
    btBcl.id        = "ct-bcl-" + order.id;
    btBcl.className = "ct-btn" + (custType === "BCL" ? " active ct-bcl" : "");
    btBcl.innerHTML = "🏡 BCL (Owner)";
    btBcl.onclick   = () => setCustomerType(order.id, "BCL");

    ctBtns.appendChild(btReg);
    ctBtns.appendChild(btBcl);
    ctRow.appendChild(ctBtns);
    pay.appendChild(ctRow);

    // ── Pilihan metode bayar: QR / Cash ──
    const pmRow = document.createElement("div");
    pmRow.className = "pay-method-row";
    pmRow.innerHTML = '<span class="pay-label">Metode Bayar</span>';

    const pmBtns = document.createElement("div");
    pmBtns.className = "pay-method-btns";

    const btCash = document.createElement("button");
    btCash.id        = "pm-cash-" + order.id;
    btCash.className = "pm-btn" + (order.payMethod !== "QR" ? " active" : "");
    btCash.innerHTML = "💵 Cash";
    btCash.onclick   = () => setPayMethod(order.id, "Cash");

    const btQr = document.createElement("button");
    btQr.id        = "pm-qr-" + order.id;
    btQr.className = "pm-btn" + (order.payMethod === "QR" ? " active pm-qr" : "");
    btQr.innerHTML = "📱 QR";
    btQr.onclick   = () => setPayMethod(order.id, "QR");

    pmBtns.appendChild(btCash);
    pmBtns.appendChild(btQr);
    pmRow.appendChild(pmBtns);
    pay.appendChild(pmRow);

    // ── Seksi uang & kembalian (disembunyikan kalau QR) ──
    const cashSection = document.createElement("div");
    cashSection.id        = "cash-section-" + order.id;
    cashSection.className = "cash-section" + (order.payMethod === "QR" ? " hidden-pay" : "");

    // Label
    const lbl = document.createElement("div"); lbl.className = "pay-label"; lbl.textContent = "Uang Diterima";
    cashSection.appendChild(lbl);

    // Input
    const wrap = document.createElement("div"); wrap.className = "pay-input-wrap";
    const pfx  = document.createElement("span"); pfx.className = "pay-prefix"; pfx.textContent = "Rp";
    const inp  = document.createElement("input");
    inp.type = "number"; inp.className = "pay-input"; inp.placeholder = "0";
    inp.id = "cash-" + order.id; inp.inputMode = "numeric";
    inp.value = order.cash || "";
    inp.oninput = function() { setCash(order.id, this.value); };
    wrap.appendChild(pfx); wrap.appendChild(inp);
    cashSection.appendChild(wrap);

    // Quick cash
    const qcRow = document.createElement("div"); qcRow.className = "quick-cash-row";
    const sugg  = new Set();
    const steps = [1000, 2000, 5000, 10000, 20000, 50000, 100000];
    for (const step of steps) {
      const r = Math.ceil(total / step) * step;
      if (r >= total && r <= total * 3) sugg.add(r);
      if (sugg.size >= 4) break;
    }
    sugg.forEach(amt => {
      const btn = document.createElement("button");
      btn.className = "qc-btn"; btn.textContent = fmt(amt);
      btn.onclick = () => setQuickCash(order.id, amt);
      qcRow.appendChild(btn);
    });
    if (sugg.size > 0) cashSection.appendChild(qcRow);

    // Change box
    const box = document.createElement("div"); box.className = "change-box"; box.id = "chbox-" + order.id;
    const cbL = document.createElement("div"); cbL.className = "cb-label"; cbL.textContent = "Kembalian";
    const cbA = document.createElement("div"); cbA.className = "cb-amount"; cbA.id = "chamt-" + order.id; cbA.textContent = fmt(0);
    box.appendChild(cbL); box.appendChild(cbA);
    cashSection.appendChild(box);

    pay.appendChild(cashSection);
    body.appendChild(pay);

    if (order.cash > 0 && order.payMethod !== "QR") updateChangeBox(order);
  } else if (isDone) {
    // Tampilkan metode bayar & tipe pembeli di kartu done
    const payIcon = order.payMethod === "QR" ? "📱" : "💵";
    const custBadge = custType === "BCL" ? "🏡 BCL" : "👤 Reguler";
    const pmStamp = document.createElement("div");
    pmStamp.className = "pay-method-stamp";
    pmStamp.innerHTML = payIcon + " " + order.payMethod + " • " + custBadge + " — " + fmt(total);
    body.appendChild(pmStamp);
  }

  card.appendChild(body);

  // Footer actions
  if (isDone) {
    const stamp = document.createElement("div");
    stamp.className = "done-stamp";
    stamp.innerHTML = "✅ Selesai — " + order.doneTime;
    card.appendChild(stamp);
  } else {
    const actions = document.createElement("div");
    actions.className = "order-card-actions";
    if (!isAct) {
      const ba = document.createElement("button");
      ba.className = "btn-set-active"; ba.textContent = "✏️ Pilih";
      ba.onclick = () => setActiveOrder(order.id);
      actions.appendChild(ba);
    }
    const bc = document.createElement("button");
    bc.className = "btn-cancel-order"; bc.title = "Batalkan pesanan ini"; bc.textContent = "🗑️";
    bc.onclick = () => cancelOrder(order.id);
    actions.appendChild(bc);

    const bd = document.createElement("button");
    bd.className = "btn-done"; bd.innerHTML = "✅ Tandai Selesai";
    bd.onclick = () => markDone(order.id);
    actions.appendChild(bd);
    card.appendChild(actions);
  }

  return card;
}

// ===== BADGE =====
function updateBadge() {
  const n = orders.filter(o => o.status !== "done").length;
  const bb = document.getElementById("bnav-badge");
  if (bb) { bb.textContent = n || ""; bb.classList.toggle("show", n > 0); }
  const pb = document.getElementById("ptab-badge");
  if (pb) pb.textContent = n || "";
}

// ===== HISTORI =====
function renderHistory() {
  const c = document.getElementById("history-content");
  if (!c) return;
  c.innerHTML = "";

  // Ambil semua hari yang ada, diurutkan terbaru
  const dayKeys = Object.keys(historyDays).sort().reverse();
  const today   = todayKey();

  if (dayKeys.length === 0) {
    c.innerHTML = '<div class="empty-orders" style="flex:1"><div class="empty-icon">📊</div><p>Belum ada riwayat</p><small>Tandai pesanan selesai untuk menyimpan</small></div>';
    return;
  }

  // ── Navigasi hari (tabs) ──
  const dayNav = document.createElement("div");
  dayNav.className = "history-day-nav";
  dayKeys.forEach(dk => {
    const btn = document.createElement("button");
    btn.className = "history-day-btn" + (dk === historyActiveDay ? " active" : "");
    btn.textContent = dk === today ? "Hari Ini" : fmtDateShort(dk);
    btn.onclick = () => { historyActiveDay = dk; renderHistory(); };
    dayNav.appendChild(btn);
  });
  c.appendChild(dayNav);

  // ── Isi hari aktif ──
  const dayOrders = historyDays[historyActiveDay] || [];

  if (dayOrders.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-orders";
    empty.innerHTML = '<div class="empty-icon">📭</div><p>Tidak ada transaksi</p>';
    c.appendChild(empty);
    return;
  }

  // Hitung total & breakdown
  let totalAll  = 0, totalCash = 0, totalQR = 0;
  let totalReguler = 0, countReguler = 0;
  let totalBCL = 0, countBCL = 0;
  const itemMap = {};

  dayOrders.forEach(order => {
    const ord_total = order.items.reduce((s, i) => s + i.harga * i.qty, 0);
    totalAll += ord_total;
    if (order.payMethod === "QR") totalQR   += ord_total;
    else                          totalCash += ord_total;

    const custType = order.customerType || "Reguler";
    if (custType === "BCL") {
      totalBCL += ord_total;
      countBCL++;
    } else {
      totalReguler += ord_total;
      countReguler++;
    }

    order.items.forEach(item => {
      if (!itemMap[item.id]) {
        itemMap[item.id] = { nama: item.nama, harga: item.harga, qty: 0, total: 0 };
      }
      itemMap[item.id].qty   += item.qty;
      itemMap[item.id].total += item.harga * item.qty;
    });
  });

  const totalItems = Object.values(itemMap).reduce((s, i) => s + i.qty, 0);

  // Summary card
  const sum = document.createElement("div"); sum.className = "history-summary";
  sum.innerHTML =
    '<div><div class="hs-label">Total Pendapatan</div><div class="hs-total">' + fmt(totalAll) + '</div><div class="hs-meta">' + dayOrders.length + ' transaksi</div></div>' +
    '<div class="hs-right"><div class="hs-label">Item Terjual</div><div class="hs-orders-count">' + totalItems + '</div><div class="hs-meta">pcs</div></div>';
  c.appendChild(sum);

  // QR vs Cash breakdown
  const breakdown = document.createElement("div"); breakdown.className = "pay-breakdown";
  breakdown.innerHTML =
    '<div class="pb-item pb-cash"><div class="pb-icon">💵</div><div class="pb-info"><div class="pb-label">Cash</div><div class="pb-amount">' + fmt(totalCash) + '</div></div></div>' +
    '<div class="pb-divider"></div>' +
    '<div class="pb-item pb-qr"><div class="pb-icon">📱</div><div class="pb-info"><div class="pb-label">QR / QRIS</div><div class="pb-amount pb-qr-amount">' + fmt(totalQR) + '</div></div></div>';
  c.appendChild(breakdown);

  // Reguler vs BCL breakdown
  const custBreakdown = document.createElement("div"); custBreakdown.className = "pay-breakdown";
  custBreakdown.style.marginTop = "6px";
  custBreakdown.innerHTML =
    '<div class="pb-item pb-reg"><div class="pb-icon">👤</div><div class="pb-info"><div class="pb-label">Reguler (' + countReguler + 'x)</div><div class="pb-amount">' + fmt(totalReguler) + '</div></div></div>' +
    '<div class="pb-divider"></div>' +
    '<div class="pb-item pb-bcl"><div class="pb-icon">🏡</div><div class="pb-info"><div class="pb-label">BCL (' + countBCL + 'x)</div><div class="pb-amount pb-bcl-amount">' + fmt(totalBCL) + '</div></div></div>';
  c.appendChild(custBreakdown);

  // Rincian tabel
  const title = document.createElement("div"); title.className = "history-table-title"; title.textContent = "Rincian Item Terjual";
  c.appendChild(title);

  const hdr = document.createElement("div"); hdr.className = "history-table-header";
  hdr.innerHTML = "<span>Menu</span><span style='text-align:center'>Qty</span><span style='text-align:right'>Harga</span><span style='text-align:right'>Total</span>";
  c.appendChild(hdr);

  const table = document.createElement("div"); table.className = "history-table";
  Object.values(itemMap).sort((a, b) => b.total - a.total).forEach(row => {
    const el = document.createElement("div"); el.className = "history-row";
    el.innerHTML =
      '<span class="hr-name">' + row.nama + '</span>' +
      '<span class="hr-qty">' + row.qty + 'x</span>' +
      '<span class="hr-price">' + fmt(row.harga) + '</span>' +
      '<span class="hr-total">' + fmt(row.total) + '</span>';
    table.appendChild(el);
  });
  c.appendChild(table);

  // ── Tombol Export Excel ──
  const btnExcel = document.createElement("button");
  btnExcel.className = "btn-export-excel";
  btnExcel.innerHTML = "📥 Export Excel (" + (historyActiveDay === today ? "Hari Ini" : fmtDateShort(historyActiveDay)) + ")";
  btnExcel.onclick = () => exportExcel(historyActiveDay);
  c.appendChild(btnExcel);
}

function fmtDateShort(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

// ===== EXPORT EXCEL (CSV + download) =====
function exportExcel(dateKey) {
  const dayOrders = historyDays[dateKey] || [];
  if (dayOrders.length === 0) { showToast("Tidak ada data untuk di-export"); return; }

  const label = fmtDateLabel(dateKey);

  // Build CSV
  let csv = "\uFEFF"; // BOM untuk Excel
  csv += "WebKasir Kebab — Rekap Penjualan\r\n";
  csv += "Tanggal:," + label + "\r\n\r\n";

  csv += "=== RINGKASAN ===\r\n";
  let totalAll = 0, totalCash = 0, totalQR = 0;
  let totalReg = 0, countReg = 0, totalBCL = 0, countBCL = 0;
  dayOrders.forEach(o => {
    const t = o.items.reduce((s, i) => s + i.harga * i.qty, 0);
    totalAll += t;
    if (o.payMethod === "QR") totalQR += t; else totalCash += t;
    if ((o.customerType || "Reguler") === "BCL") {
      totalBCL += t;
      countBCL++;
    } else {
      totalReg += t;
      countReg++;
    }
  });
  csv += "Total Transaksi:," + dayOrders.length + "\r\n";
  csv += "Total Pendapatan:," + totalAll + "\r\n";
  csv += "Cash:," + totalCash + "\r\n";
  csv += "QR/QRIS:," + totalQR + "\r\n";
  csv += "Pelanggan Reguler (" + countReg + " transaksi):," + totalReg + "\r\n";
  csv += "Owner BCL (" + countBCL + " transaksi):," + totalBCL + "\r\n\r\n";

  csv += "=== DETAIL TRANSAKSI ===\r\n";
  csv += "No. Pesanan,Waktu,Tipe Pembeli,Menu,Qty,Harga Satuan,Subtotal,Rasa,Sayur,Metode Bayar\r\n";
  dayOrders.forEach(o => {
    const custType = o.customerType || "Reguler";
    o.items.forEach(item => {
      csv += [
        o.label,
        o.doneTime,
        custType,
        '"' + item.nama + '"',
        item.qty,
        item.harga,
        item.harga * item.qty,
        item.rasa,
        item.sayur,
        o.payMethod
      ].join(",") + "\r\n";
    });
  });

  csv += "\r\n=== REKAP PER ITEM ===\r\n";
  csv += "Nama Menu,Total Qty,Harga Satuan,Total Pendapatan\r\n";
  const itemMap = {};
  dayOrders.forEach(o => {
    o.items.forEach(item => {
      if (!itemMap[item.id]) itemMap[item.id] = { nama: item.nama, harga: item.harga, qty: 0, total: 0 };
      itemMap[item.id].qty   += item.qty;
      itemMap[item.id].total += item.harga * item.qty;
    });
  });
  Object.values(itemMap).sort((a, b) => b.total - a.total).forEach(r => {
    csv += ['"' + r.nama + '"', r.qty, r.harga, r.total].join(",") + "\r\n";
  });

  // Download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "WebKasir_" + dateKey + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast("📥 Excel berhasil di-download!");
}

// ===== FORMAT =====
function fmt(amount) {
  return "Rp\u00a0" + amount.toLocaleString("id-ID");
}

// ===== TOAST =====
let toastTimer;
function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2500);
}
