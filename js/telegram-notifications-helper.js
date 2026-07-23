// استبدل الدالة القديمة بهذه الدالة
async function sendTelegramNotification(messageText) {
    const workerUrl = "https://telegram.studegy10.workers.dev"; // ضع رابط الـ Worker هنا
    
    try {
        const response = await fetch(workerUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text: messageText })
        });
        const data = await response.json();
        return data.ok;
    } catch (error) {
        console.error("Telegram Notification Failed:", error);
        return false;
    }
}
