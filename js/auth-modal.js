/* ==========================================================
   Tiger Jeans - Shared Auth Modal
   ----------------------------------------------------------
   Drop-in login/signup modal logic for any page that includes
   the #authModal markup (see index.html for the reference
   markup, copied verbatim onto this page).

   Requires (already loaded before this file on any page that
   uses it): firebase compat SDK + js/config.js (defines
   `auth`, `db`, `showToast`).

   Provides: openAuthModal(), closeAuthModal(), doEmailLogin(),
   doEmailSignup(), googleLogin() — same names/behavior as the
   ones previously duplicated inline in index.html, so existing
   onclick="..." handlers in the shared modal markup keep working
   unchanged on every page.
   ========================================================== */

function openAuthModal() {
  const modal = document.getElementById("authModal");
  if (modal) {
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
  }
}

function closeAuthModal() {
  const modal = document.getElementById("authModal");
  if (modal) {
    modal.classList.remove("show");
    document.body.style.overflow = "";
  }
}

// Auth tabs (login / signup)
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".auth-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const formId = tab.dataset.tab === "login" ? "loginForm" : "signupForm";
      document.querySelectorAll(".auth-form").forEach(f => f.classList.add("hidden"));
      const target = document.getElementById(formId);
      if (target) target.classList.remove("hidden");
    });
  });

  // Other pages redirect here with ?auth=login when they don't carry their
  // own copy of the modal — kept for any page still using that pattern.
  if (new URLSearchParams(location.search).get("auth") === "login") {
    openAuthModal();
    history.replaceState(null, "", location.pathname);
  }
});

// Email Login
async function doEmailLogin() {
  const emailEl = document.getElementById("loginEmail");
  const passEl = document.getElementById("loginPass");
  const email = emailEl ? emailEl.value.trim() : "";
  const pass = passEl ? passEl.value.trim() : "";

  if (!email || !pass) {
    if (typeof showToast === "function") showToast("أدخل البريد وكلمة المرور");
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, pass);
    closeAuthModal();
    if (typeof showToast === "function") showToast("تم تسجيل الدخول بنجاح!");
  } catch (err) {
    if (typeof showToast === "function") showToast("خطأ: " + err.message);
  }
}

// Email Signup
async function doEmailSignup() {
  const nameEl = document.getElementById("signupName");
  const emailEl = document.getElementById("signupEmail");
  const phoneEl = document.getElementById("signupPhone");
  const passEl = document.getElementById("signupPass");

  const name = nameEl ? nameEl.value.trim() : "";
  const email = emailEl ? emailEl.value.trim() : "";
  const phone = phoneEl ? phoneEl.value.trim() : "";
  const pass = passEl ? passEl.value.trim() : "";

  if (!email || !pass) {
    if (typeof showToast === "function") showToast("أدخل البريد وكلمة المرور");
    return;
  }
  if (pass.length < 6) {
    if (typeof showToast === "function") showToast("كلمة المرور 6 أحرف على الأقل");
    return;
  }

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    if (name && cred.user) {
      await cred.user.updateProfile({ displayName: name });
    }
    if (phone && cred.user && typeof db !== "undefined" && db) {
      db.ref("users/" + cred.user.uid).update({ phone, name, email });
    }
    closeAuthModal();
    if (typeof showToast === "function") showToast("تم إنشاء الحساب بنجاح!");
  } catch (err) {
    if (typeof showToast === "function") showToast("خطأ: " + err.message);
  }
}

// Google Login/Signup
async function googleLogin() {
  if (window.location.protocol === "file:") {
    if (typeof showToast === "function") showToast("⚠️ Google Login يعمل فقط على خادم HTTP (مثل GitHub Pages أو Netlify)");
    if (typeof auth !== "undefined") {
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        const result = await auth.signInWithPopup(provider);
        closeAuthModal();
        if (typeof showToast === "function") showToast("مرحباً " + (result.user.displayName || "") + "! 👋");
      } catch (err) {
        console.log("Google Auth Error:", err);
        if (typeof showToast === "function") {
          showToast(err.code === "auth/operation-not-supported-in-this-environment"
            ? "يرجى رفع الموقع على استضافة لدعم تسجيل الدخول"
            : "حدث خطأ في تسجيل الدخول");
        }
      }
    }
    return;
  }

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await auth.signInWithPopup(provider);
    closeAuthModal();
    if (typeof showToast === "function") showToast("مرحباً " + (result.user.displayName || "") + "! 👋");
  } catch (err) {
    console.log("Google Auth Error:", err);
    if (err.code !== "auth/popup-closed-by-user" && typeof showToast === "function") {
      showToast("حدث خطأ: " + err.message);
    }
  }
}
