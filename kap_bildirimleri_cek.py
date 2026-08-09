#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
kap_bildirimleri_cek.py
========================
Takip edilen BIST şirketlerinin son "Faaliyet Raporu" (FAR) türü KAP
bildirimlerini çeker ve kap-bildirimleri.json dosyasına yazar.

Bu dosya, borsakaynak.com sitesindeki Node.js sunucusu (server.js)
tarafından okunup /api/kap-bildirimleri üzerinden servis edilir.

NEDEN PYTHON + pykap: KAP'ın ham API'sini (POST + tam bilmediğimiz JSON
gövdesi) tahmin ederek Node.js'te yeniden yazmak yerine, zaten test
edilmiş, MIT lisanslı "pykap" kütüphanesi kullanılıyor -- daha güvenilir.

KULLANIM:
    pip install pykap
    python3 kap_bildirimleri_cek.py

Bu scripti DÜZENLİ ARALIKLARLA (örn. günde 1-2 kez) çalıştırmanız
gerekir -- otomatik/canlı değildir, her çalıştırdığınızda o anki
KAP verisiyle dosyayı günceller. cron ile otomatikleştirilebilir
(örnek: en alttaki not).
"""
import json
from datetime import datetime, timezone

import pykap

# Takip edilecek hisseler -- istediğiniz gibi genişletebilir/daraltabilirsiniz.
# Ne kadar çok hisse eklerseniz script o kadar uzun sürer (KAP'a çok sık
# istek atmamak için hisseler arasında kısa bir bekleme var).
TAKIP_EDILEN_HISSELER = [
    "THYAO", "GARAN", "AKBNK", "ASELS", "BIMAS", "EREGL", "TUPRS", "SASA",
    "KCHOL", "SAHOL", "TCELL", "YKBNK", "ISCTR", "FROTO", "PGSUS", "KOZAL",
    "PETKM", "TOASO", "ARCLK", "ENJSA", "SISE", "MGROS", "VESTL", "HEKTS",
    "KONTR", "ASTOR", "ALARK", "ODAS", "EKGYO", "TAVHL",
]

CIKTI_DOSYASI = "kap-bildirimleri.json"


def main():
    sonuclar = []
    hatalar = []

    print(f"{len(TAKIP_EDILEN_HISSELER)} hisse için KAP bildirimleri çekiliyor...\n")

    for i, ticker in enumerate(TAKIP_EDILEN_HISSELER, 1):
        try:
            comp = pykap.BISTCompany(ticker)
            bildirimler = comp.get_disclosures("FAR")  # Faaliyet Raporu
            for b in bildirimler[:3]:  # her hisseden en fazla 3 tane
                disc_index = b.get("disclosureIndex")
                sonuclar.append({
                    "hisse": ticker,
                    "sirketAdi": comp.name,
                    "baslik": b.get("title", ""),
                    "tarih": b.get("publishDate", ""),
                    "ozet": (b.get("summary") or "")[:300],
                    "kapLink": f"https://www.kap.org.tr/tr/Bildirim/{disc_index}" if disc_index else None,
                })
            print(f"[{i}/{len(TAKIP_EDILEN_HISSELER)}] {ticker}: {len(bildirimler)} bildirim bulundu")
        except Exception as e:
            print(f"[{i}/{len(TAKIP_EDILEN_HISSELER)}] {ticker}: HATA - {e}")
            hatalar.append({"hisse": ticker, "hata": str(e)})
            continue

    # En yeni bildirim en üstte
    sonuclar.sort(key=lambda x: x["tarih"], reverse=True)

    cikti = {
        "success": True,
        "guncellemeZamani": datetime.now(timezone.utc).isoformat(),
        "adet": len(sonuclar),
        "bildirimler": sonuclar,
        "hatalar": hatalar,
    }

    with open(CIKTI_DOSYASI, "w", encoding="utf-8") as f:
        json.dump(cikti, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*50}")
    print(f"TOPLAM: {len(sonuclar)} bildirim, {len(hatalar)} hatalı hisse")
    print(f"Yazıldı: {CIKTI_DOSYASI}")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()

# ---------------------------------------------------------------
# OTOMATİKLEŞTİRME (opsiyonel) -- cPanel'de "Cron Jobs" bölümünden:
#   Her gün 08:00'de çalıştırmak için:
#   0 8 * * *  cd /home/KULLANICI/kap-bot && python3 kap_bildirimleri_cek.py
# ---------------------------------------------------------------
