import { db } from '../firebase-config.js';
import { ref, get, push, set, update, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";
import Utils from '../utils.js';

const Orders = {
  async create(orderData) {
    try {
      const ordersRef = ref(db, 'orders');
      const newOrderRef = push(ordersRef);
      const order = {
        ...orderData,
        id: newOrderRef.key,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        statusHistory: {
          pending: Date.now()
        }
      };
      await set(newOrderRef, order);
      return { success: true, orderId: order.id };
    } catch (error) {
      console.error('Create order error:', error);
      return { success: false, error: error.message };
    }
  },

  async getById(orderId) {
    try {
      const orderRef = ref(db, `orders/${orderId}`);
      const snapshot = await get(orderRef);
      return snapshot.exists() ? { id: snapshot.key, ...snapshot.val() } : null;
    } catch (error) {
      console.error('Get order error:', error);
      return null;
    }
  },

  async getByUser(userId) {
    try {
      const ordersRef = ref(db, 'orders');
      const q = query(ordersRef, orderByChild('userId'), equalTo(userId));
      const snapshot = await get(q);
      const orders = [];
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          orders.push({ id: child.key, ...child.val() });
        });
      }
      return orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
      console.error('Get user orders error:', error);
      return [];
    }
  },

  async getAll() {
    try {
      const ordersRef = ref(db, 'orders');
      const snapshot = await get(ordersRef);
      const orders = [];
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          orders.push({ id: child.key, ...child.val() });
        });
      }
      return orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
      console.error('Get all orders error:', error);
      return [];
    }
  },

  async updateStatus(orderId, newStatus, note = '') {
    try {
      const statusUpdate = {
        status: newStatus,
        updatedAt: Date.now()
      };
      const statusHistoryRef = ref(db, `orders/${orderId}/statusHistory/${newStatus}`);
      await set(statusHistoryRef, Date.now());
      if (note) {
        await update(ref(db, `orders/${orderId}/notes`), {
          [Utils.generateId()]: { text: note, createdAt: Date.now(), by: 'admin' }
        });
      }
      await update(ref(db, `orders/${orderId}`), statusUpdate);
      return { success: true };
    } catch (error) {
      console.error('Update order status error:', error);
      return { success: false, error: error.message };
    }
  },

  async submitPaymentConfirmation(orderId, paymentData) {
    try {
      const paymentRef = ref(db, `paymentConfirmations/${orderId}`);
      await set(paymentRef, {
        ...paymentData,
        orderId,
        status: 'pending_review',
        submittedAt: Date.now()
      });
      await update(ref(db, `orders/${orderId}`), {
        status: 'payment_review',
        paymentMethod: paymentData.method,
        updatedAt: Date.now()
      });
      return { success: true };
    } catch (error) {
      console.error('Submit payment error:', error);
      return { success: false, error: error.message };
    }
  }
};

export default Orders;