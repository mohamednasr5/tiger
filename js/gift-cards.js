// ============================================================
// Tiger Jeans — Gift Cards page: motion + sound layer ("gc-fx")
// Purely additive: does not touch gift-cards.js logic or IDs.
// - Hero "unboxing" reveal animation
// - Synthesized UI sounds (no audio files — generated with WebAudio)
// - 3D tilt on template / preview cards
// - Confetti bursts on success + scratch-card reveal
// Respects prefers-reduced-motion and requires a real user gesture
// before any sound plays (browser autoplay rules).
// ============================================================

(function () {
  "use strict";

  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------
  // Sound manager — everything synthesized, nothing downloaded
  // ---------------------------------------------------------
  const Sound = (function () {
    let ctx = null;
    let enabled = localStorage.getItem("tj_gc_sound") === "1";

    function ensureCtx() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }

    function tone(freq, dur, type, delay, gain) {
      if (!enabled) return;
      const c = ensureCtx();
      if (!c) return;
      const t0 = c.currentTime + (delay || 0);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain || 0.16, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }

    function chime() {
      tone(1046, 0.16, "sine", 0, 0.14);
      tone(1568, 0.18, "sine", 0.05, 0.09);
    }

    function select() {
      tone(880, 0.09, "triangle", 0, 0.12);
    }

    function success() {
      tone(784, 0.14, "sine", 0, 0.14);
      tone(988, 0.14, "sine", 0.09, 0.13);
      tone(1318, 0.22, "sine", 0.18, 0.14);
    }

    function soft404() {
      tone(220, 0.22, "sine", 0, 0.12);
      tone(180, 0.26, "sine", 0.08, 0.1);
    }

    function seal() {
      if (!enabled) return;
      const c = ensureCtx();
      if (!c) return;
      const t0 = c.currentTime;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(120, t0);
      osc.frequency.exponentialRampToValueAtTime(60, t0 + 0.18);
      g.gain.setValueAtTime(0.2, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      osc.connect(g).connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + 0.22);
    }

    function ribbonWhoosh() {
      if (!enabled) return;
      const c = ensureCtx();
      if (!c) return;
      const bufSize = c.sampleRate * 0.5;
      const buffer = c.createBuffer(1, bufSize, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
      const noise = c.createBufferSource();
      noise.buffer = buffer;
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(2200, c.currentTime);
      bp.frequency.exponentialRampToValueAtTime(500, c.currentTime + 0.5);
      const g = c.createGain();
      g.gain.setValueAtTime(0.25, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.5);
      noise.connect(bp).connect(g).connect(c.destination);
      noise.start();
    }

    function setEnabled(v) {
      enabled = v;
      localStorage.setItem("tj_gc_sound", v ? "1" : "0");
      if (v) ensureCtx();
    }

    return { chime, select, success, soft404, seal, ribbonWhoosh, setEnabled, isEnabled: () => enabled, ensureCtx };
  })();

  // ---------------------------------------------------------
  // Sound toggle button
  // ---------------------------------------------------------
  function initSoundToggle() {
    const btn = document.getElementById("gcSoundToggle");
    if (!btn) return;
    const icon = btn.querySelector("i");
    const label = btn.querySelector("span");

    function paint() {
      const on = Sound.isEnabled();
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      icon.className = on ? "bx bx-volume-full" : "bx bx-volume-mute";
      label.textContent = on ? "صوت الهدايا مفعّل" : "فعّل صوت الهدايا";
    }
    paint();

    btn.addEventListener("click", () => {
      const next = !Sound.isEnabled();
      Sound.setEnabled(next);
      paint();
      if (next) Sound.chime();
    });
  }

  // ---------------------------------------------------------
  // Hero unboxing sequence (purely visual — runs once per tab)
  // ---------------------------------------------------------
  function initUnbox() {
    const box = document.getElementById("gcUnbox");
    const body = document.getElementById("gcHeroBody");
    const spark = document.getElementById("gcUnboxSpark");
    if (!box || !body) return;

    if (reduceMotion || sessionStorage.getItem("tj_gc_unboxed") === "1") {
      box.style.display = "none";
      body.classList.add("gc-in");
      return;
    }
    sessionStorage.setItem("tj_gc_unboxed", "1");

    // sparkle burst particles
    if (spark) {
      const icons = ["✨", "🎉", "⭐"];
      for (let i = 0; i < 10; i++) {
        const s = document.createElement("i");
        s.textContent = icons[i % icons.length];
        const angle = (Math.PI * 2 * i) / 10;
        s.style.setProperty("--bx", Math.cos(angle) * 70 + "px");
        s.style.setProperty("--by", Math.sin(angle) * 70 - 30 + "px");
        s.style.animationDelay = i * 0.02 + "s";
        spark.appendChild(s);
      }
    }

    setTimeout(() => box.classList.add("gc-open"), 250);
    setTimeout(() => body.classList.add("gc-in"), 900);
    setTimeout(() => box.classList.add("gc-hide"), 1300);
  }

  // ---------------------------------------------------------
  // 3D tilt for template + preview cards
  // ---------------------------------------------------------
  function applyTilt(el, e) {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg) translateY(-4px)`;
  }
  function resetTilt(el) {
    el.style.transform = "";
  }

  function initTilt() {
    if (reduceMotion) return;
    const grid = document.getElementById("gcTemplatesGrid");
    if (grid) {
      grid.addEventListener("mousemove", (e) => {
        const card = e.target.closest(".gc-template");
        if (card) applyTilt(card, e);
      });
      grid.addEventListener("mouseleave", () => {
        grid.querySelectorAll(".gc-template").forEach(resetTilt);
      }, true);
    }
    const preview = document.getElementById("gcPreviewCard");
    if (preview) {
      preview.addEventListener("mousemove", (e) => applyTilt(preview, e));
      preview.addEventListener("mouseleave", () => resetTilt(preview));
    }
  }

  // ---------------------------------------------------------
  // Click feedback: template select chime + pop
  // ---------------------------------------------------------
  function initClickFeedback() {
    const grid = document.getElementById("gcTemplatesGrid");
    if (grid) {
      grid.addEventListener("click", (e) => {
        const card = e.target.closest(".gc-template");
        if (!card) return;
        Sound.select();
        card.classList.remove("gc-pop");
        // eslint-disable-next-line no-unused-expressions
        void card.offsetWidth;
        card.classList.add("gc-pop");
      });
    }

    document.querySelectorAll(".gc-pay-option").forEach((opt) => {
      opt.addEventListener("click", () => Sound.select());
    });

    const submitBtn = document.getElementById("gcSubmitBtn");
    if (submitBtn) {
      submitBtn.addEventListener("click", () => {
        Sound.seal();
        submitBtn.classList.remove("gc-sealing");
        void submitBtn.offsetWidth;
        submitBtn.classList.add("gc-sealing");
      });
    }
  }

  // ---------------------------------------------------------
  // Hook into the site-wide showToast() to add sound + confetti
  // on success messages, without touching the original function.
  // ---------------------------------------------------------
  function initToastHook() {
    if (typeof window.showToast !== "function") return;
    const original = window.showToast;
    window.showToast = function (msg) {
      original(msg);
      const text = String(msg || "");
      const isError = /خطأ|تعذر|غير صحيح|من فضلك/.test(text);
      if (isError) {
        Sound.soft404();
      } else if (/✓|تم إرسال|تم الحفظ|تم النسخ/.test(text)) {
        Sound.success();
        burstConfetti();
      }
    };
  }

  // ---------------------------------------------------------
  // Confetti burst (canvas, transient)
  // ---------------------------------------------------------
  function burstConfetti(originX, originY) {
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

    const cx = originX != null ? originX : window.innerWidth / 2;
    const cy = originY != null ? originY : window.innerHeight * 0.35;
    const colors = ["#d4af37", "#f5d97c", "#e8cc6f", "#7c2233", "#ffffff"];
    const pieces = Array.from({ length: 70 }, () => ({
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
        p.life -= 0.012;
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
      if (alive && frame < 240) {
        requestAnimationFrame(step);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    }
    requestAnimationFrame(step);
  }

  // ---------------------------------------------------------
  // Scratch-card reveal detection (poll canvas alpha coverage)
  // ---------------------------------------------------------
  function watchScratchReveal() {
    const modal = document.getElementById("gcCardModal");
    if (!modal) return;
    let watching = false;
    let revealedFired = false;

    const observer = new MutationObserver(() => {
      const canvas = document.getElementById("gcScratchCanvas");
      if (canvas && !watching) {
        watching = true;
        revealedFired = false;
        pollScratch(canvas);
      }
      if (modal.style.display === "none") {
        watching = false;
      }
    });
    observer.observe(modal, { attributes: true, childList: true, subtree: true, attributeFilter: ["style"] });

    function pollScratch(canvas) {
      const ctx = canvas.getContext("2d");
      const timer = setInterval(() => {
        if (!document.body.contains(canvas) || modal.style.display === "none") {
          clearInterval(timer);
          return;
        }
        let cleared = 0;
        const total = 200;
        try {
          const w = canvas.width, h = canvas.height;
          for (let i = 0; i < total; i++) {
            const x = Math.floor(Math.random() * w);
            const y = Math.floor(Math.random() * h);
            const alpha = ctx.getImageData(x, y, 1, 1).data[3];
            if (alpha < 40) cleared++;
          }
        } catch (e) {
          clearInterval(timer);
          return;
        }
        if (cleared / total > 0.55 && !revealedFired) {
          revealedFired = true;
          clearInterval(timer);
          const wrap = document.getElementById("gcScratchWrap");
          if (wrap) wrap.classList.add("gc-revealed");
          Sound.success();
          const r = canvas.getBoundingClientRect();
          burstConfetti(r.left + r.width / 2, r.top + r.height / 2);
        }
      }, 350);
    }
  }

  // ---------------------------------------------------------
  // Init
  // ---------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    initSoundToggle();
    initUnbox();
    initTilt();
    initClickFeedback();
    initToastHook();
    watchScratchReveal();
  });
})();