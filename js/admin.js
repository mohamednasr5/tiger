// js/admin.js

async function uploadProductImage(fileInput) {
    const file = fileInput.files[0];
    if (!file) {
        alert("الرجاء اختيار صورة أولاً");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
        // ✅ تم وضع رابط الوركر الخاص بك هنا مع إضافة مسار الرفع
        const response = await fetch("https://tiger-upload.studegy10.workers.dev/upload", {
            method: "POST",
            headers: {
                // يجب أن تتطابق هذه الكلمة مع ADMIN_TOKEN الموجودة في إعدادات Cloudflare
                "x-admin-token": "521988" 
            },
            body: formData
        });

        const data = await response.json();
        
        if (data.success) {
            console.log("تم الرفع بنجاح! الرابط:", data.url);
            
            // يمكنك الآن استخدام هذا الرابط (data.url) لحفظه في Firebase Firestore
            // مع باقي بيانات المنتج (اسم المنتج، السعر، المقاسات)
            return data.url; 
            
        } else {
            console.error("خطأ:", data.error);
            alert("حدث خطأ أثناء الرفع: " + data.error);
        }
    } catch (error) {
        console.error("فشل الاتصال بخادم الصور", error);
        alert("تعذر الاتصال بخادم Cloudflare");
    }
}
