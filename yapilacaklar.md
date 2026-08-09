# BorsaKaynak — Genel Yapılacaklar ve Hata Tespit Raporu

Bu rapor, **borsakaynak.com** web sitesinde yapılan detaylı kod incelemesi ve denetim sonucunda tespit edilen hataları, eksiklikleri ve yapılan düzeltmeleri içermektedir.

---

## 🛠️ Düzeltilen Hatalar ve Sorunlar

Aşağıdaki kritik hatalar ve yanlışlıklar kod seviyesinde tespit edilmiş ve başarıyla giderilmiştir:

### 1. Sektörel Isı Haritası Canlı Entegrasyon Eksikliği (`sektorler.html`)
*   **Sorun:** Sektörler sayfasındaki treemap (ısı haritası) yapısı, canlı veri motoruna (`bk-live.js`) bağlı olmayıp tamamen statik hisse verilerini listeliyordu.
*   **Düzeltme:**
    *   `SEKTOREL_DATA` dizisindeki tüm hisseler taranarak dinamik olarak `window.STOCKS` listesine dahil edildi.
    *   Arka planda sunucudan (`/api/live`) canlanan tüm hisse değişim oranları (`farkP`) dinamik olarak ısı haritasının beslendiği veri kümesine aktarıldı.
    *   Mobil tabloyu dolduran `buildMobTable` fonksiyonu global kapsama çıkarıldı.
    *   Canlı veri güncelleme döngüsünde tetiklenen `window.refresh` fonksiyonu genişletilerek hem ısı haritasını (`renderSektorelHarita`) hem de mobil tabloyu (`window.buildMobTable`) canlı verilerle yeniden çizmesi sağlandı.

### 2. Sistem Durumu Sayfası Kripto Gösterim Hatası (`status.html`)
*   **Sorun:** Sistem sağlığı tablosunda Bitcoin verisi için sunucunun `/api/fx` endpoint'inden `BTCUSDT` anahtarıyla dönen değer aranırken, kod içerisinde `fx.BTCUSD` kontrol ediliyordu. Bu tanımsızlık nedeniyle Bitcoin satırı sürekli kırmızı renkte **"Canlı Çekilemedi"** uyarısı veriyordu.
*   **Düzeltme:** Bitcoin fiyatı doğrulama satırı `fx.BTCUSDT || fx.BTCUSD` kontrolüyle değiştirilerek canlı fiyatın başarıyla gösterilmesi sağlandı.

### 3. Sistem Durumu Sayfası Yazım Hatası (`status.html`)
*   **Sorun:** Sayfanın altındaki "Veri Doğruluk Güvencesi" başlıklı Türkçe açıklama paragrafında dil bütünlüğünü bozan İngilizce bir bağlaç yer alıyordu: `...veri reddedilir and Borsa tablonuzun...` (Satır: 244).
*   **Düzeltme:** Kelime Türkçe dil yapısına uygun olarak `ve` şeklinde düzeltildi.

---

## 📋 İleride Yapılması Önerilenler ve Eksik Modüller

Sitenin tamamen dinamik ve profesyonel bir yapıya kavuşması için yapılması gereken diğer iyileştirmeler aşağıda listelenmiştir:

### 1. Eksik Alt Sektör Sayfaları Entegrasyonu
*   Sektör kartlarına tıklandığında gidilen tekil sektör sayfaları (örneğin `sektor-bankacilik.html`, `sektor-holding.html` vb.) statik hisse verileri içermektedir. Bu alt sayfaların da `sektorler.html`'de yaptığımız gibi `window.STOCKS` listesine dinamik olarak hisseleri beslemesi ve `window.refresh` ile canlı fiyatları yansıtması gerekmektedir.

### 2. Sanal Portföy Modülü Canlılığı (`sanal-portfoy.html`)
*   Sanal portföy modülü şu anda `localStorage` üzerinde simüle edilmiştir. Kullanıcının portföyündeki hisselerin maliyet ve güncel değer takipleri statik formüllerle yapılmaktadır. Portföy hisselerinin güncel borsa fiyatlarıyla dinamik olarak değerlenmesi için canlı veri motoru entegrasyonu tamamlanmalıdır.

### 3. Logolar Klasörü ve Resim Kontrolleri
*   Hisse logoları için `logolar_png` ve `logolar_png_40` klasörleri bulunmaktadır. Canlı veriler çekilirken eğer bir hissenin PNG logosu sunucuda bulunamazsa, kırık resim ikonu yerine otomatik olarak hisse kodunun ilk iki harfini gösteren bir fallback (yedek görsel/harf) mekanizması eklenmesi kullanıcı deneyimini iyileştirecektir.

### 4. API Sağlık Kontrolleri Geliştirmesi
*   `status.html` sayfasında sunucunun çevrimdışı olması ya da API bağlantısının kopması durumunda tarayıcı konsoluna sadece `fetch failed` hatası düşmektedir. Ekranda kullanıcıya daha açıklayıcı bir *"Sunucuya bağlanılamıyor, lütfen internet bağlantınızı veya API durumunu kontrol edin."* uyarısı verilmesi sağlanmalıdır.
