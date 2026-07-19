#!/usr/bin/env python3
"""
Tiger Jeans - Firebase Connection Test Script
اختبار الاتصال بقاعدة البيانات والتحقق من جميع الخدمات
"""

import json
import urllib.request
import urllib.error
from datetime import datetime

# ====== Configuration ======
FIREBASE_DB_URL = "https://tiger-d1433-default-rtdb.firebaseio.com"
TELEGRAM_API = "https://api.telegram.org"

def print_header(title):
    """Print a formatted header"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def print_result(test_name, status, details=""):
    """Print test result"""
    icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️ "
    print(f"  {icon} {test_name}")
    if details:
        print(f"      └─ {details}")

def fetch_firebase(path):
    """Fetch data from Firebase"""
    try:
        url = f"{FIREBASE_DB_URL}/{path}.json"
        with urllib.request.urlopen(url, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        return {"error": str(e)}

def main():
    print_header("🐯 Tiger Jeans - اختبار قاعدة البيانات والخدمات")
    print(f"📅 وقت الاختبار: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = {"pass": 0, "fail": 0, "warn": 0}
    
    # ====== Test 1: Firebase Connection ======
    print_header("اختبار 1: الاتصال بـ Firebase")
    
    # Test basic connection
    data = fetch_firebase(".info")
    if "error" in data:
        print_result("Firebase Connection", "FAIL", f"Error: {data['error']}")
        results["fail"] += 1
    else:
        print_result("Firebase Connection", "PASS", f"Database: {data.get('database', 'N/A')}")
        results["pass"] += 1
    
    # ====== Test 2: Products Collection ======
    print_header("اختبار 2: مجموعة المنتجات")
    
    products = fetch_firebase("products")
    if "error" in products:
        print_result("Products Fetch", "FAIL", f"Error: {products['error']}")
        results["fail"] += 1
    elif isinstance(products, dict) and len(products) > 0:
        active_products = [p for p in products.values() if p.get("active") != False]
        print_result("Products Count", "PASS", f"Found {len(active_products)} active product(s)")
        results["pass"] += 1
        
        # Show product names
        for pid, p in list(products.items())[:5]:
            name = p.get("name", "N/A")
            price = p.get("price", 0)
            category = p.get("category", "N/A")
            print(f"      📦 {name} - {price} ج.م ({category})")
        
        if len(products) > 5:
            print(f"      ... و {len(products) - 5} منتجات أخرى")
    else:
        print_result("Products Count", "WARN", "No products found (will use sample data)")
        results["warn"] += 1
    
    # ====== Test 3: Banners Configuration ======
    print_header("اختبار 3: إعدادات البانر")
    
    banners = fetch_firebase("banners")
    if "error" in banners:
        print_result("Banners Fetch", "FAIL", f"Error: {banners['error']}")
        results["fail"] += 1
    else:
        hero = banners.get("hero", {})
        marquee = banners.get("marquee", [])
        
        if hero.get("title"):
            print_result("Hero Banner Title", "PASS", f'"{hero["title"]}"')
            results["pass"] += 1
        else:
            print_result("Hero Banner Title", "WARN", "No custom title (will use default)")
            results["warn"] += 1
        
        if hero.get("subtitle"):
            print_result("Hero Banner Subtitle", "PASS", f'"{hero["subtitle"]}"')
            results["pass"] += 1
        
        if marquee and len(marquee) > 0:
            print_result("Marquee Messages", "PASS", f"{len(marquee)} message(s)")
            for msg in marquee[:3]:
                print(f"      💬 {msg}")
            results["pass"] += 1
        else:
            print_result("Marquee Messages", "WARN", "No custom messages (will use default)")
            results["warn"] += 1
    
    # ====== Test 4: Telegram Settings ======
    print_header("اختبار 4: إعدادات تليجرام")
    
    telegram_settings = fetch_firebase("settings/telegram")
    if "error" in telegram_settings:
        print_result("Telegram Settings", "FAIL", f"Error: {telegram_settings['error']}")
        results["fail"] += 1
    else:
        bot_token = telegram_settings.get("botToken", "")
        chat_id = telegram_settings.get("chatId", "")
        enabled = telegram_settings.get("enabled", False)
        
        if bot_token and bot_token != "YOUR_BOT_TOKEN_HERE":
            # Show masked token for security
            masked_token = bot_token[:10] + "..." + bot_token[-6:]
            print_result("Bot Token", "PASS", f"Configured: {masked_token}")
            results["pass"] += 1
            
            # Test actual Telegram API connection
            try:
                test_url = f"{TELEGRAM_API}/bot{bot_token}/getMe"
                with urllib.request.urlopen(test_url, timeout=10) as response:
                    bot_info = json.loads(response.read().decode('utf-8'))
                    if bot_info.get("ok"):
                        bot_name = bot_info["result"].get("first_name", "N/A")
                        print_result("Telegram Bot API", "PASS", f"Bot Name: @{bot_info['result'].get('username', 'N/A')}")
                        results["pass"] += 1
                    else:
                        print_result("Telegram Bot API", "FAIL", f"Invalid token: {bot_info.get('description')}")
                        results["fail"] += 1
            except Exception as e:
                print_result("Telegram Bot API", "WARN", f"Cannot verify: {str(e)[:50]}")
                results["warn"] += 1
        else:
            print_result("Bot Token", "WARN", "Not configured (using placeholder)")
            results["warn"] += 1
        
        if chat_id and chat_id != "YOUR_CHAT_ID_HERE":
            print_result("Chat ID", "PASS", f"Configured: {chat_id}")
            results["pass"] += 1
        else:
            print_result("Chat ID", "WARN", "Not configured (using placeholder)")
            results["warn"] += 1
        
        print_result("Notifications Enabled", "PASS" if enabled else "WARN", 
                   "Enabled" if enabled else "Disabled")
    
    # ====== Test 5: Social Media Links ======
    print_header("اختبار 5: روابط التواصل الاجتماعي")
    
    social = fetch_firebase("settings/social")
    if "error" in social:
        print_result("Social Settings", "FAIL", f"Error: {social['error']}")
        results["fail"] += 1
    else:
        links = {
            "Facebook": social.get("facebook"),
            "Instagram": social.get("instagram"),
            "TikTok": social.get("tiktok"),
            "WhatsApp": social.get("whatsapp")
        }
        
        for platform, url in links.items():
            if url:
                print_result(platform, "PASS", url[:50] + "..." if len(url) > 50 else url)
                results["pass"] += 1
            else:
                print_result(platform, "WARN", "Not configured")
                results["warn"] += 1
    
    # ====== Test 6: Payment Settings ======
    print_header("اختبار 6: إعدادات الدفع")
    
    payment = fetch_firebase("settings/payment")
    payment_methods = fetch_firebase("settings/paymentMethods")
    
    if "error" not in payment:
        vodafone = payment.get("vodafone", "")
        instapay = payment.get("instapay", "")
        
        if vodafone:
            print_result("Vodafone Cash", "PASS", f"Number: {vodafone}")
            results["pass"] += 1
        else:
            print_result("Vodafone Cash", "WARN", "Not configured")
            results["warn"] += 1
        
        if instapay:
            print_result("InstaPay", "PASS", f"Username: {instapay}")
            results["pass"] += 1
        else:
            print_result("InstaPay", "WARN", "Not configured")
            results["warn"] += 1
    
    if "error" not in payment_methods:
        cod = payment_methods.get("cod", True)
        print_result("Cash on Delivery", "PASS" if cod else "WARN", 
                   "Enabled" if cod else "Disabled")
    
    # ====== Test 7: Promo Codes ======
    print_header("اختبار 7: أكواد الخصم")
    
    promo_codes = fetch_firebase("promoCodes")
    if "error" in promo_codes:
        print_result("Promo Codes Fetch", "WARN", f"Error: {promo_codes['error']}")
        results["warn"] += 1
    elif isinstance(promo_codes, dict) and len(promo_codes) > 0:
        for code, info in promo_codes.items():
            if info.get("active"):
                discount_type = info.get("discountType", "fixed")
                discount_value = info.get("discountValue", 0)
                used = info.get("usedCount", 0)
                
                if discount_type == "fixed":
                    disc_text = f"{discount_value} ج.م خصم"
                else:
                    disc_text = f"{discount_value}% خصم"
                
                print_result(f"Promo Code: {code}", "PASS", 
                           f"{disc_text} - Used {used} times")
                results["pass"] += 1
    else:
        print_result("Promo Codes", "INFO", "No promo codes found")
    
    # ====== Test 8: Shipping Rates ======
    print_header("اختبار 8: أسعار الشحن")
    
    shipping = fetch_firebase("shippingRates")
    if "error" in shipping:
        print_result("Shipping Rates", "WARN", f"Error: {shipping['error']}")
        results["warn"] += 1
    elif isinstance(shipping, dict) and len(shipping) > 0:
        for rate_id, rate in shipping.items():
            if rate.get("active"):
                gov = rate.get("governorate", "N/A")
                cost = rate.get("cost", 0)
                print_result(f"Shipping: {gov}", "PASS", f"{cost} ج.م")
                results["pass"] += 1
    else:
        print_result("Shipping Rates", "INFO", "No rates configured (will use defaults)")
    
    # ====== Test 9: Notifications ======
    print_header("اختبار 9: الإشعارات المخزنة")
    
    notifications = fetch_firebase("notifications")
    if "error" in notifications:
        print_result("Notifications Fetch", "WARN", f"Error: {notifications['error']}")
        results["warn"] += 1
    elif isinstance(notifications, dict) and len(notifications) > 0:
        unread = sum(1 for n in notifications.values() if not n.get("read"))
        print_result("Notifications Count", "PASS", f"{len(notifications)} total, {unread} unread")
        results["pass"] += 1
        
        # Show latest notification
        latest = max(notifications.values(), key=lambda x: x.get("createdAt", 0))
        print(f"      📢 Latest: {latest.get('title', 'N/A')} - {latest.get('message', '')[:40]}...")
    else:
        print_result("Notifications", "INFO", "No notifications found")
    
    # ====== Summary ======
    print_header("📊 ملخص الاختبارات")
    
    total = results["pass"] + results["fail"] + results["warn"]
    print(f"\n  ✅ نجاح: {results['pass']}")
    print(f"  ❌ فشل: {results['fail']}")
    print(f"  ⚠️ تحذيرات: {results['warn']}")
    print(f"\n  📈 المجموع الكلي: {total} اختبار")
    
    success_rate = (results["pass"] / total * 100) if total > 0 else 0
    print(f"  🎯 نسبة النجاح: {success_rate:.1f}%")
    
    if results["fail"] == 0:
        print("\n  🎉 كل الاختبارات الأساسية اجتازت! المشروع جاهز للتشغيل.")
    else:
        print("\n  ⚠️ هناك بعض الأخطاء تحتاج إلى تصحيح.")
    
    print("\n" + "="*60)
    print("  نهاية التقرير")
    print("="*60 + "\n")
    
    return results

if __name__ == "__main__":
    main()
