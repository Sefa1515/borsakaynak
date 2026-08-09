# BorsaKaynak — Mobil İyileştirmeler Raporu

Bu rapor, **borsakaynak.com** web sitesinin mobil cihazlardaki kullanıcı deneyimini (UX), duyarlılığını (responsiveness) ve performansını artırmak amacıyla hazırlanan denetim bulgularını ve çözüm önerilerini içerir.

---

## 📱 Tespit Edilen Mobil Sorunlar ve Çözüm Önerileri

### 1. Sektörel Isı Haritasının Mobilde Gizlenmesi
*   **Mevcut Durum:** `sektorler.html` sayfasında yer alan treemap tabanlı sektörel ısı haritası (`.sh-grid`), 768px altındaki cihazlarda `@media(max-width:768px) { .sh-grid { display:none!important } }` kuralıyla tamamen gizlenmekte ve yerine sade bir mobil sektör tablosu (`.mob-sektor-tbl`) getirilmektedir.
*   **Öneri:** Mobil ekranlarda treemap hücreleri çok küçük ve okunamaz hale geldiği için tablonun gösterilmesi doğru bir karardır. Ancak kullanıcıya ısı haritasını görme seçeneği sunmak adına, tablo üzerinde dikey tasarlanmış, basitleştirilmiş ve sadece en büyük 10 hisseyi içeren mobil uyumlu dikey bir ısı haritası (örneğin CSS Flexbox tabanlı dikey sütunlar halinde) yerleştirilebilir.

### 2. Finansal Veri Tablolarında Yatay Taşmalar ve Kesilmeler
*   **Mevcut Durum:** Piyasalar, bilançolar ve analiz tablolarında çok sayıda sütun (Fiyat, Günlük Fark %, Alış, Satış, Hacim vb.) yer almaktadır. Mobilde `.tbl-wrap` ile yatay kaydırma verilmiş olsa da, kullanıcıların tüm satırı görebilmesi için sürekli sağa sola kaydırma yapması gerekmektedir.
*   **Öneri:**
    *   Önem derecesi düşük sütunlar (örneğin gün içi en yüksek/en düşük) mobilde `@media` sorgusuyla gizlenmeye devam edilmeli.
    *   Yatay kaydırma yerine, mobilde her hisseyi birer "kart" (`card`) şeklinde dikey listeleyen bir kart tasarımı kullanılmalıdır. (Örn: Sol üstte hisse kodu ve logosu, sağ üstte fiyat ve değişim yüzdesi rozeti, alt kısımda ise küçük fontla hacim ve alış/satış bilgisi).

### 3. Açık Tema (Light Mode) Kontrast ve Okunabilirlik Sorunları
*   **Mevcut Durum:** Açık tema aktif edildiğinde, bazı grafiklerin stroke çizgileri, mini sparkline'lar ve yeşil/kırmızı rozetlerin (`.up`, `.dn` badge) arka plan renk kontrastı yetersiz kalmaktadır.
*   **Öneri:**
    *   Light Mode CSS kurallarında, pozitif yeşil metin rengi (`--G`) için biraz daha koyu bir ton (örn: `#00873E`), negatif kırmızı metin rengi (`--R`) için ise daha belirgin bir kırmızı (`#C0392B`) seçilmelidir.
    *   Açık temada sparkline SVG çizgilerinin opaklığı (`opacity`) artırılmalıdır.

### 4. Hamburger Menü İçindeki Mini Veri Akışı (Ticker) Taşması
*   **Mevcut Durum:** Mobil cihazlarda Hamburger menü açıldığında, menünün en üstünde yer alan mini canlı ticker grid alanı dikey olarak ciddi bir alan kaplamakta ve küçük ekranlı telefonlarda (örn. iPhone SE) menü linklerinin aşağıya doğru kayarak ekran dışına çıkmasına ve kaydırma zorluğuna yol açmaktadır.
*   **Öneri:** Menü açıldığında ticker alanının yüksekliği azaltılmalı, veri kutuları yan yana daha kompakt hale getirilmeli veya dikey yüksekliği kısıtlı cihazlar için menü içi kaydırma (`overflow-y: auto`) özelliği eklenmelidir.
