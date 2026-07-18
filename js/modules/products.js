import { db } from '../firebase-config.js';
import { ref, get, push, set, update, remove, query, orderByChild, equalTo, limitToFirst, limitToLast, startAt, endAt } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";
import { getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js";
import Utils from '../utils.js';

const Products = {
  allProducts: [],
  categories: [],
  listeners: [],

  // Fetch all published products
  async fetchAll() {
    try {
      const productsRef = ref(db, 'products');
      const snapshot = await get(productsRef);
      this.allProducts = [];
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          const product = { id: child.key, ...child.val() };
          if (product.status === 'published' || product.status === undefined) {
            this.allProducts.push(product);
          }
        });
      }
      this.notify();
      return this.allProducts;
    } catch (error) {
      console.error('Fetch products error:', error);
      return [];
    }
  },

  // Fetch single product by ID
  async fetchById(productId) {
    try {
      const productRef = ref(db, `products/${productId}`);
      const snapshot = await get(productRef);
      if (!snapshot.exists()) return null;
      return { id: snapshot.key, ...snapshot.val() };
    } catch (error) {
      console.error('Fetch product error:', error);
      return null;
    }
  },

  // Fetch categories
  async fetchCategories() {
    try {
      const catRef = ref(db, 'categories');
      const snapshot = await get(catRef);
      this.categories = [];
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          this.categories.push({ id: child.key, ...child.val() });
        });
      }
      return this.categories;
    } catch (error) {
      console.error('Fetch categories error:', error);
      return [];
    }
  },

  // Get products by category
  async getByCategory(categoryId) {
    const all = await this.fetchAll();
    return all.filter(p => p.category === categoryId);
  },

  // Get featured products
  getFeatured() {
    return this.allProducts.filter(p => p.featured);
  },

  // Get best sellers
  getBestSellers() {
    return this.allProducts.filter(p => p.bestSeller);
  },

  // Get new arrivals
  getNewArrivals() {
    return this.allProducts.filter(p => p.newArrival);
  },

  // Get products on sale
  getOnSale() {
    return this.allProducts.filter(p => p.salePrice && p.salePrice < p.originalPrice);
  },

  // Search products
  search(query) {
    if (!query) return this.allProducts;
    const q = query.toLowerCase().trim();
    return this.allProducts.filter(p =>
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q))) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  },

  // Filter products
  filter(products, filters) {
    let result = [...products];

    if (filters.category && filters.category !== 'all') {
      result = result.filter(p => p.category === filters.category);
    }
    if (filters.minPrice) {
      result = result.filter(p => {
        const price = p.salePrice || p.originalPrice;
        return price >= filters.minPrice;
      });
    }
    if (filters.maxPrice) {
      result = result.filter(p => {
        const price = p.salePrice || p.originalPrice;
        return price <= filters.maxPrice;
      });
    }
    if (filters.sizes && filters.sizes.length) {
      result = result.filter(p => p.sizes && p.sizes.some(s => filters.sizes.includes(s)));
    }
    if (filters.colors && filters.colors.length) {
      result = result.filter(p => p.colors && p.colors.some(c => filters.colors.includes(c)));
    }
    if (filters.onSale) {
      result = result.filter(p => p.salePrice && p.salePrice < p.originalPrice);
    }
    if (filters.newArrival) {
      result = result.filter(p => p.newArrival);
    }
    if (filters.inStock) {
      result = result.filter(p => p.stock && p.stock > 0);
    }

    // Sort
    switch (filters.sort) {
      case 'newest':
        result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        break;
      case 'oldest':
        result.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        break;
      case 'price_low':
        result.sort((a, b) => (a.salePrice || a.originalPrice) - (b.salePrice || b.originalPrice));
        break;
      case 'price_high':
        result.sort((a, b) => (b.salePrice || b.originalPrice) - (a.salePrice || a.originalPrice));
        break;
      case 'popular':
        result.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
        break;
      case 'rating':
        result.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
        break;
      case 'discount':
        result.sort((a, b) => Utils.calcDiscount(b.originalPrice, b.salePrice) - Utils.calcDiscount(a.originalPrice, a.salePrice));
        break;
      default:
        break;
    }

    return result;
  },

  // Get related products
  getRelated(product, limit = 4) {
    return this.allProducts
      .filter(p => p.id !== product.id && (p.category === product.category || p.tags?.some(t => product.tags?.includes(t))))
      .slice(0, limit);
  },

  // Get reviews for a product
  async getReviews(productId) {
    try {
      const reviewsRef = ref(db, `reviews/${productId}`);
      const snapshot = await get(reviewsRef);
      const reviews = [];
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          reviews.push({ id: child.key, ...child.val() });
        });
      }
      return reviews.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
      console.error('Fetch reviews error:', error);
      return [];
    }
  },

  // Add review
  async addReview(productId, review) {
    if (!Auth?.currentUser) throw new Error('Please login to add a review');
    const reviewData = {
      userId: Auth.currentUser.uid,
      userName: Auth.currentUser.displayName || 'Anonymous',
      userPhoto: Auth.currentUser.photoURL || '',
      rating: review.rating,
      title: review.title || '',
      comment: review.comment,
      createdAt: Date.now()
    };
    const reviewsRef = ref(db, `reviews/${productId}`);
    await push(reviewsRef, reviewData);
    // Update product average rating
    const allReviews = await this.getReviews(productId);
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await update(ref(db, `products/${productId}`), {
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount: allReviews.length
    });
    return reviewData;
  },

  onUpdate(callback) {
    this.listeners.push(callback);
    return () => { this.listeners = this.listeners.filter(l => l !== callback); };
  },

  notify() {
    this.listeners.forEach(cb => cb(this.allProducts));
  }
};

export default Products;