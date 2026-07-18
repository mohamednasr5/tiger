import { auth } from '../firebase-config.js';
import {
  signInWithPopup, GoogleAuthProvider, onAuthStateChanged,
  signOut, getIdTokenResult
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { ref, get, set, update, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";
import Utils from '../utils.js';

const Auth = {
  currentUser: null,
  isAdmin: false,
  listeners: [],

  init() {
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      if (user) {
        await this.syncUserToDatabase(user);
        await this.checkAdminStatus(user);
      } else {
        this.isAdmin = false;
      }
      this.notifyListeners();
      this.updateUI();
    });
  },

  async loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await this.syncUserToDatabase(result.user);
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  },

  async syncUserToDatabase(user) {
    if (!user) return;
    const userRef = ref(db, `users/${user.uid}`);
    const snapshot = await get(userRef);
    if (!snapshot.exists()) {
      await set(userRef, {
        uid: user.uid,
        name: user.displayName || '',
        email: user.email || '',
        phone: user.phoneNumber || '',
        photo: user.photoURL || '',
        addresses: {},
        wishlist: {},
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });
    } else {
      await update(userRef, {
        name: user.displayName || '',
        email: user.email || '',
        photo: user.photoURL || '',
        lastLogin: serverTimestamp()
      });
    }
  },

  async checkAdminStatus(user) {
    try {
      const tokenResult = await getIdTokenResult(user, true);
      this.isAdmin = !!tokenResult.claims.admin;
    } catch {
      const adminRef = ref(db, `admins/${user.uid}`);
      const snapshot = await get(adminRef);
      this.isAdmin = snapshot.exists();
    }
  },

  async logout() {
    try {
      await signOut(auth);
      this.currentUser = null;
      this.isAdmin = false;
      Utils.showToast('Logged out successfully', 'success');
      window.location.href = window.location.pathname.includes('/admin/') ? '/' : '/';
    } catch (error) {
      Utils.showToast('Logout failed', 'error');
    }
  },

  requireAuth() {
    return new Promise((resolve, reject) => {
      if (this.currentUser) return resolve(this.currentUser);
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        if (user) resolve(user);
        else {
          Utils.showToast('Please login first', 'warning');
          reject(new Error('Not authenticated'));
        }
      });
    });
  },

  requireAdmin() {
    return new Promise(async (resolve, reject) => {
      try {
        const user = await this.requireAuth();
        if (this.isAdmin) return resolve(user);
        Utils.showToast('Access denied. Admin only.', 'error');
        reject(new Error('Not admin'));
      } catch (e) {
        reject(e);
      }
    });
  },

  onUpdate(callback) {
    this.listeners.push(callback);
    return () => { this.listeners = this.listeners.filter(l => l !== callback); };
  },

  notifyListeners() {
    this.listeners.forEach(cb => cb({ user: this.currentUser, isAdmin: this.isAdmin }));
  },

  updateUI() {
    document.querySelectorAll('[data-auth-name]').forEach(el => {
      el.textContent = this.currentUser?.displayName || 'Account';
    });
    document.querySelectorAll('[data-auth-photo]').forEach(el => {
      el.src = this.currentUser?.photoURL || '';
      el.style.display = this.currentUser ? 'block' : 'none';
    });
    document.querySelectorAll('[data-auth-show]').forEach(el => {
      el.style.display = this.currentUser ? '' : 'none';
    });
    document.querySelectorAll('[data-auth-hide]').forEach(el => {
      el.style.display = this.currentUser ? 'none' : '';
    });
    document.querySelectorAll('[data-admin-show]').forEach(el => {
      el.style.display = this.isAdmin ? '' : 'none';
    });
    // Update header user menu
    const userMenu = document.querySelector('.user-menu-dropdown');
    const loginBtn = document.querySelector('.login-btn');
    if (userMenu && loginBtn) {
      userMenu.style.display = this.currentUser ? 'block' : 'none';
      loginBtn.style.display = this.currentUser ? 'none' : 'flex';
    }
  }
};

Auth.init();
export default Auth;