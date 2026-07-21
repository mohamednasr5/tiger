// ============================================================
// Tiger Jeans — Gift Cards page: motion layer ("gc-fx")
// Purely additive: does not touch gift-cards.js logic or IDs.
// - Hero "envelope unseal" reveal animation (letter slides out)
// - Wax-stamp pop when a template value is selected
// - Full-screen envelope + confetti on successful purchase
// Respects prefers-reduced-motion.
// ============================================================

(function () {
  "use strict";

  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------
  // Generic "open envelope" animator — works on any .gc-env-stage
  // ---------------------------------------------------------
  function openEnvelope(stageId, envId, crackId, onMid) {
    const stage = document.getElementById(stageId);
    const env = document.getElementById(envId);
    const crack = document.getElementById(crackId);
    if (!stage || !env) return;

    if (crack) {
      crack.innerHTML = "";
      const icons = ["✨", "💌", "⭐"];
      for (let i = 0; i < 8; i++) {
        const s = document.createElement("i");
        s.textContent = icons[i % icons.length];
        const angle = (Math.PI * 2 * i) / 8;
        s.style.setProperty("--bx", Math.cos(angle) * 60 + "px");
        s.style.setProperty("--by", Math.sin(angle) * 60 - 20 + "px");
        s.style.animationDelay = i * 0.02 + "s";
        crack.appendChild(s);
      }
    }

    if (reduceMotion) {
      env.classList.add("gc-open");
      if (typeof onMid === "function") onMid();
      return;
    }

    setTimeout(() => env.classList.add("gc-open"), 200);
    setTimeout(() => { if (typeof onMid === "function") onMid(); }, 900);
  }

  // ---------------------------------------------------------
  // Hero envelope — opens once per tab, then tucks itself away
  // ---------------------------------------------------------
  function initHeroEnvelope() {
    const stage = document.getElementById("gcEnvStage");
    const body = document.getElementById("gcHeroBody");
    if (!stage || !body) return;

    if (reduceMotion || sessionStorage.getItem("tj_gc_unsealed") === "1") {
      stage.style.display = "none";
      body.classList.add("gc-in");
      return;
    }
    sessionStorage.setItem("tj_gc_unsealed", "1");

    openEnvelope("gcEnvStage", "gcEnv", "gcEnvCrack", () => {
      body.classList.add("gc-in");
    });
    setTimeout(() => stage.classList.add("gc-hide"), 1550);
  }

  // ---------------------------------------------------------
  // Hero decorative floating icons live inside #gcHeroGlow,
  // populated by gift-cards.js (initGcHeroEffects) — nothing to do here.
  // ---------------------------------------------------------

  // ---------------------------------------------------------
  // Wax-stamp pop when a template card becomes selected.
  // The grid is fully re-rendered by gift-cards.js on every click,
  // so we detect the new .active card right after the click settles.
  // ---------------------------------------------------------
  function initTemplateStamp() {
    const grid = document.getElementById("gcTemplatesGrid");
    if (!grid || reduceMotion) return;
    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".gc-template");
      if (!card) return;
      setTimeout(() => {
        const active = grid.querySelector(".gc-template.active");
        if (!active) return;
        active.classList.remove("gc-stamped");
        void active.offsetWidth;
        active.classList.add("gc-stamped");
        setTimeout(() => active.classList.remove("gc-stamped"), 750);
      }, 0);
    });
  }

  // ---------------------------------------------------------
  // Success envelope overlay + confetti, triggered by hooking
  // the site-wide showToast() — fires only on the gift-card
  // purchase success message, without touching submitGiftCardOrder().
  // ---------------------------------------------------------
  function initSuccessHook() {
    if (typeof window.showToast !== "function") return;
    const original = window.showToast;
    window.showToast = function (msg) {
      original(msg);
      const text = String(msg || "");
      if (/تم إرسال طلب شراء البطاقة/.test(text)) {
        showSuccessEnvelope();
      }
    };
  }

  function showSuccessEnvelope() {
    const overlay = document.getElementById("gcSuccessOverlay");
    const env = document.getElementById("gcSuccessEnv");
    if (!overlay || !env) return;

    env.classList.remove("gc-open");
    overlay.classList.add("show");

    openEnvelope("gcSuccessEnvStage", "gcSuccessEnv", "gcSuccessEnvCrack", () => {
      burstConfetti();
    });

    // Auto-dismiss after a while if the person doesn't tap "تمام"
    clearTimeout(window.__gcSuccessTimer);
    window.__gcSuccessTimer = setTimeout(() => overlay.classList.remove("show"), 6000);
  }

  // ---------------------------------------------------------
  // Confetti burst (canvas, transient)
  // ---------------------------------------------------------
  function burstConfetti() {
    if (reduceMotion) return;
    const canvas = document.getElementById("gcConfettiCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.4;
    const colors = ["#d4af37", "#f5d97c", "#e8cc6f", "#9c2b2b", "#f4e9d1"];
    const pieces = Array.from({ length: 80 }, () => ({
      x: cx,
      y: cy,
      vx: (Math.random() - 0.5) * 9,
      vy: Math.random() * -8 - 3,
      size: 4 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      life: 1,
    }));

    let frame = 0;
    function step() {
      frame++;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      let alive = false;
      pieces.forEach((p) => {
        if (p.life <= 0) return;
        p.vy += 0.28;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= 0.011;
        if (p.life > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(p.life, 0);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      });
      if (alive && frame < 260) {
        requestAnimationFrame(step);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    }
    requestAnimationFrame(step);
  }

  // ---------------------------------------------------------
  // Init
  // ---------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    initHeroEnvelope();
    initTemplateStamp();
    initSuccessHook();
  });
})();
