import { db } from '../firebase-config.js';
import { ref, get, set, remove, onValue, off } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";
import Utils from '../utils.js';

const Wishlist = {
  items: [],
  listeners: [],
  userId: null,

  init() {
    import('../modules/auth.js').then(({ default: Auth }) => {
      Auth.onUpdate(({ user }) => {
        this.userId = user?.uid || null;
        if (this.userId) {
          this.syncFromFirebase();
        } else {
          this.loadFromLocal();
        }
      });
    });
  },

  async syncFromFirebase() {
    if (!this.userId) return;
    try {
      const wishRef = ref(db, `wishlist/${this.userId}`);
      onValue(wishRef, (snapshot) => {
        this.items = [];
        if (snapshot.exists()) {
          snapshot.forEach(child => {
            this.items.push(child.key);
          });
        }
        this.saveToLocal();
        this.notify();
        this.updateUI();
      });
    } catch {
      this.loadFromLocal();
    }
  },

  loadFromLocal() {
    try {
      this.items = JSON.parse(localStorage.getItem('tiger_wishlist') || '[]');
    } catch {
      this.items = [];
    }
    this.notify();
    this.updateUI();
  },

  saveToLocal() {
    localStorage.setItem('tiger_wishlist', JSON.stringify(this.items));
  },

  async toggle(productId) {
    const index = this.items.indexOf(productId);
    if (index > -1) {
      this.items.splice(index, 1);
      Utils.showToast('Removed from wishlist', 'info');
    } else {
      this.items.push(productId);
      Utils.showToast('Added to wishlist', 'success');
    }
    this.saveToLocal();
    this.notify();
    this.updateUI();
    if (this.userId) {
      try {
        await set(ref(db, `wishlist/${this.userId}`), Object.fromEntries(this.items.map(id => [id, true])));
      } catch {}
    }
  },

  isWishlisted(productId) {
    return this.items.includes(productId);
  },

  getCount() {
    return this.items.length;
  },

  onUpdate(callback) {
    this.listeners.push(callback);
    return () => { this.listeners = this.listeners.filter(l => l !== callback); };
  },

  notify() {
    this.listeners.forEach(cb => cb(this.items));
  },

  updateUI() {
    const count = this.getCount();
    document.querySelectorAll('.wishlist-count').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
    // Update heart icons on product cards
    document.querySelectorAll('[data-wishlist-btn]').forEach(btn => {
      const pid = btn.dataset.wishlistBtn;
      if (this.isWishlisted(pid)) {
        btn.classList.add('active');
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
      } else {
        btn.classList.remove('active');
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
      }
    });
  }
};

Wishlist.init();
export default Wishlist;