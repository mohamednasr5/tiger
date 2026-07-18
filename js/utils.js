// ============================================================
// TIGER E-Commerce - Utility Functions
// ============================================================

const Utils = {
  // Format currency
  formatPrice(price) {
    return 'EGP ' + Number(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  },

  // Calculate discount percentage
  calcDiscount(original, sale) {
    if (!original || !sale || original <= sale) return 0;
    return Math.round(((original - sale) / original) * 100);
  },

  // Generate unique ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  // Debounce function
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  },

  // Throttle function
  throttle(func, limit = 100) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Sanitize HTML
  sanitize(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // Validate email
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  // Validate phone (Egyptian)
  isValidPhone(phone) {
    return /^(01|+201|00201)[0-9]{9}$/.test(phone.replace(/\s/g, ''));
  },

  // Show toast notification
  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container') || this.createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${Utils.sanitize(message)}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-show'));
    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
    return container;
  },

  // Skeleton loading
  showSkeleton(container, count = 4) {
    if (!container) return;
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `<div class="skeleton-card">
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton skeleton-text skeleton-title"></div>
        <div class="skeleton skeleton-text skeleton-price"></div>
      </div>`;
    }
    container.innerHTML = html;
  },

  // Smooth scroll to element
  scrollTo(selector, offset = 80) {
    const el = document.querySelector(selector);
    if (el) {
      window.scrollTo({ top: el.offsetTop - offset, behavior: 'smooth' });
    }
  },

  // Format date
  formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  },

  // Format date time
  formatDateTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  },

  // Truncate text
  truncate(str, len = 100) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
  },

  // Get URL parameter
  getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  },

  // Set URL parameter without reload
  setParam(name, value) {
    const url = new URL(window.location);
    url.searchParams.set(name, value);
    window.history.replaceState({}, '', url);
  },

  // Animate counter
  animateCounter(el, target, duration = 2000) {
    if (!el) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        el.textContent = target.toLocaleString();
        clearInterval(timer);
      } else {
        el.textContent = Math.floor(start).toLocaleString();
      }
    }, 16);
  },

  // Lazy load images
  lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          img.addEventListener('load', () => img.classList.add('loaded'));
          observer.unobserve(img);
        }
      });
    }, { rootMargin: '200px' });
    images.forEach(img => observer.observe(img));
  },

  // Create shimmer loading effect
  createShimmer(type = 'card') {
    const templates = {
      card: `<div class="shimmer-card"><div class="shimmer shimmer-img"></div><div class="shimmer shimmer-line w80"></div><div class="shimmer shimmer-line w60"></div></div>`,
      text: `<div class="shimmer shimmer-line w100"></div><div class="shimmer shimmer-line w80"></div><div class="shimmer shimmer-line w60"></div>`,
      product: `<div class="shimmer-product"><div class="shimmer shimmer-img-lg"></div><div class="shimmer shimmer-line w100"></div><div class="shimmer shimmer-line w80"></div><div class="shimmer shimmer-line w40"></div></div>`
    };
    return templates[type] || templates.card;
  },

  // Check if mobile
  isMobile() {
    return window.innerWidth <= 768;
  },

  // Copy to clipboard
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      Utils.showToast('Copied to clipboard', 'success');
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      Utils.showToast('Copied to clipboard', 'success');
      return true;
    }
  },

  // Share functionality
  async shareProduct(data) {
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch {}
    } else {
      Utils.copyToClipboard(data.url || window.location.href);
    }
  },

  // Get order status color
  getStatusColor(status) {
    const colors = {
      'pending': '#f39c12',
      'payment_review': '#e67e22',
      'confirmed': '#3498db',
      'preparing': '#9b59b6',
      'packed': '#1abc9c',
      'shipped': '#2ecc71',
      'out_for_delivery': '#27ae60',
      'delivered': '#27ae60',
      'cancelled': '#e74c3c',
      'returned': '#e74c3c',
      'refunded': '#95a5a6'
    };
    return colors[status] || '#95a5a6';
  },

  // Get order status label
  getStatusLabel(status) {
    const labels = {
      'pending': 'Pending',
      'payment_review': 'Payment Under Verification',
      'confirmed': 'Confirmed',
      'preparing': 'Preparing',
      'packed': 'Packed',
      'shipped': 'Shipped',
      'out_for_delivery': 'Out For Delivery',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled',
      'returned': 'Returned',
      'refunded': 'Refunded'
    };
    return labels[status] || status;
  }
};

export default Utils;