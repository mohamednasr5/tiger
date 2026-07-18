import { messaging } from '../firebase-config.js';
import { getToken, onMessage } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging.js";

const Notifications = {
  vapidKey: 'YOUR_VAPID_KEY', // Admin should set this

  async requestPermission() {
    if (!messaging) {
      console.log('Messaging not supported');
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await this.getToken();
        if (token) await this.saveToken(token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Notification permission error:', error);
      return false;
    }
  },

  async getToken() {
    if (!messaging) return null;
    try {
      const currentToken = await getToken(messaging, { vapidKey: this.vapidKey });
      if (currentToken) return currentToken;
      return null;
    } catch (error) {
      console.error('Get token error:', error);
      return null;
    }
  },

  async saveToken(token) {
    if (!Auth?.currentUser) return;
    try {
      const { ref, set } = await import("https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js");
      const { db: database } = await import('../firebase-config.js');
      await set(ref(database, `fcmTokens/${Auth.currentUser.uid}`), { token, updatedAt: Date.now() });
    } catch (error) {
      console.error('Save token error:', error);
    }
  },

  listenForMessages() {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      const { title, body, icon, click_action } = payload.notification || payload.data || {};
      if (Notification.permission === 'granted') {
        new Notification(title || 'TIGER', {
          body: body || 'You have a new notification',
          icon: icon || '/assets/icons/icon-192.png',
          data: { click_action }
        });
      }
      // Also show in-app toast
      Utils.showToast(body || 'New notification', 'info');
    });
  }
};

export default Notifications;