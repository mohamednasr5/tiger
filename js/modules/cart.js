import { db } from '../firebase-config.js';
import { ref, get, set, remove, update, push, onValue, off } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";
import Utils from '../utils.js';

const Cart = {
  items: [],
  listeners: [],
  userId: null,
  useFirebase: false,

  init() {
    // Import Auth dynamically to avoid circular dependency
    import('../modules/auth.js').then(({ default: Auth }) => {
      Auth.onUpdate(({ user }) => {
        this.userId = user?.uid || null;
        if (this.userId) {
          this.useFirebase = true;
          this.syncFromFirebase();
        } else {
          this.useFirebase = false;
          this.loadFromLocal();
        }
      });
    });
  },

  async syncFromFirebase() {
    if (!this.userId) return;
    try {
      const cartRef = ref(db, `cart/${this.userId}`);
      onValue(cartRef, (snapshot) => {
        this.items = [];
        if (snapshot.exists()) {
          snapshot.forEach(child => {
            this.items.push({ id: child.key, ...child.val() });
          });
        }
        this.saveToLocal();
        this.notify();
        this.updateUI();
      });
    } catch (error) {
      console.error('Sync cart error:', error);
      this.loadFromLocal();
    }
  },

  loadFromLocal() {
    try {
      const data = localStorage.getItem('tiger_cart');
      this.items = data ? JSON.parse(data) : [];
    } catch {
      this.items = [];
    }
    this.notify();
    this.updateUI();
  },

  saveToLocal() {
    localStorage.setItem('tiger_cart', JSON.stringify(this.items));
  },

  async addItem(product, size, color, quantity = 1) {
    // Check if same product+size+color exists
    const existingIndex = this.items.findIndex(
      item => item.productId === product.id && item.size === size && item.color === color
    );

    if (existingIndex > -1) {
      this.items[existingIndex].quantity += quantity;
    } else {
      this.items.push({
        productId: product.id,
        name: product.name,
        image: product.images?.[0] || '',
        price: product.salePrice || product.originalPrice,
        originalPrice: product.originalPrice,
        size: size || '',
        color: color || '',
        quantity,
        shippingCost: product.shippingCost || 0,
        weight: product.weight || 0
      });
    }

    this.saveToLocal();
    this.notify();
    this.updateUI();
    Utils.showToast('Added to cart', 'success');

    if (this.useFirebase && this.userId) {
      await this.saveToFirebase();
    }
  },

  async updateQuantity(itemId, quantity) {
    if (quantity <= 0) {
      return this.removeItem(itemId);
    }
    const item = this.items.find(i => i.id === itemId);
    if (item) {
      item.quantity = quantity;
      this.saveToLocal();
      this.notify();
      this.updateUI();
      if (this.useFirebase && this.userId) {
        await this.saveToFirebase();
      }
    }
  },

  async removeItem(itemId) {
    this.items = this.items.filter(i => i.id !== itemId);
    this.saveToLocal();
    this.notify();
    this.updateUI();
    Utils.showToast('Removed from cart', 'info');
    if (this.useFirebase && this.userId) {
      await this.saveToFirebase();
    }
  },

  async clear() {
    this.items = [];
    this.saveToLocal();
    this.notify();
    this.updateUI();
    if (this.useFirebase && this.userId) {
      try {
        await remove(ref(db, `cart/${this.userId}`));
      } catch {}
    }
  },

  async saveToFirebase() {
    if (!this.userId) return;
    try {
      const cartData = {};
      this.items.forEach(item => {
        const key = item.id || Utils.generateId();
        cartData[key] = { ...item };
        cartData[key].id = key;
      });
      await set(ref(db, `cart/${this.userId}`), cartData);
    } catch (error) {
      console.error('Save cart error:', error);
    }
  },

  getCount() {
    return this.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  },

  getSubtotal() {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  },

  getShippingTotal() {
    return this.items.reduce((sum, item) => sum + ((item.shippingCost || 0) * item.quantity), 0);
  },

  getTotal() {
    return this.getSubtotal() + this.getShippingTotal();
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
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
    document.querySelectorAll('.cart-total-display').forEach(el => {
      el.textContent = Utils.formatPrice(this.getSubtotal());
    });
  }
};

Cart.init();
export default Cart;