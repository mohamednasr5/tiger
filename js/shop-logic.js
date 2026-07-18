// js/shop-logic.js
import { db, collection, getDocs } from './firebase-config.js';

async function fetchAllProducts() {
    const container = document.getElementById('allProductsContainer');
    
    try {
        const querySnapshot = await getDocs(collection(db, "Products"));
        container.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            // نستخدم نفس دالة بناء البطاقة التي صممناها في app.js
            container.innerHTML += createProductCard(doc.id, product);
        });
    } catch (error) {
        container.innerHTML = '<p>حدث خطأ في تحميل المنتجات.</p>';
    }
}

// استدعاء الدالة عند فتح الصفحة
document.addEventListener("DOMContentLoaded", fetchAllProducts);
