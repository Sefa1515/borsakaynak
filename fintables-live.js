/**
 * fintables-live.js — BorsaKaynak Gerçek Veri Motoru (Fintables kaynaklı)
 * ------------------------------------------------------------------
 * Bu modül, Node.js hosting üzerinde (cPanel Passenger / herhangi bir Node
 * ortamı) çalışırken Fintables'ın herkese açık piyasa verisi API'sinden
 * BIST hisse ve endeks verilerini periyodik olarak çeker, bellekte
 * önbelleğe alır ve server.js'in HTTP dispatcher'ına /api/fintables/*
 * uç noktaları üzerinden sunar.
 *
 * ÖNEMLİ TASARIM KARARI: Bu modül, sitenin geri kalanındaki bazı eski
 * kod parçalarının aksine (bkz. server.js içindeki "defaultIndices" ve
 * "{ son:100, onceki:99 ... }" gibi sabit/uydurma yedek değerler), veri
 * çekilemediğinde ASLA uydurma sayı üretmez. Çekme başarısız olursa
 * en son bilinen gerçek veri "stale:true" bayrağıyla birlikte döner;
 * hiç veri yoksa boş sonuç ve açık bir hata mesajı döner.
 */

'use strict';

const https = require('https');

const EQUITY_URL =
  'https://markets.fintables.com/barbar/server/query?fields=C,CP,V,YLD1w,YLD1m,YLD3m,YLD6m,YLDytd,YLD1y,YLD3y,YLD5y&type=equity';
const INDEX_URL = 'https://markets.fintables.com/barbar/server/?type=index';

const EQUITY_FIELD_NAMES = [
  'fiyat', 'gunPct', 'hacim',
  'yuzde1Hafta', 'yuzde1Ay', 'yuzde3Ay', 'yuzde6Ay',
  'yuzdeYilbasi', 'yuzde1Yil', 'yuzde3Yil', 'yuzde5Yil'
];
// DUZELTME (canli API testiyle dogrulandi -- 2026-08-03): Bu alanlarin son
// 9'u eskiden "yuzde1Hafta", "yuzde1Ay" vb. gercek YUZDE degerler sanilip
// oyle adlandirilmisti. Ama markets.fintables.com/barbar/server/?type=index
// uc noktasina canli istek atilip XU100/XU030 verisiyle elle dogrulandiginda,
// bu pozisyonlarin aslinda o GECMIS TARIHTEKI FIYAT SEVIYESI (yuzde degil)
// oldugu goruldu -- ornegin XU100 icin gunPct=-0.35 (dogru, kucuk bir yuzde)
// ama "yuzde1Hafta" pozisyonunda 13943.87 gibi guncel fiyata yakin buyuk bir
// sayi vardi; bu ancak 1 hafta onceki XU100 FIYATI olabilir (13410.54 guncel
// fiyattan -3.82% degisim = fintables.com'un kendi sitesinde gosterdigi
// haftalik yuzdeyle neredeyse birebir orttu). Asagida once dogru isimlerle
// (fiyatXOnce) etiketlendi, sonra refreshIndices() icinde bunlardan gercek
// yuzde degisim hesaplaniyor -- boylece hem ham fiyat hem dogru yuzde elde
// ediliyor, hicbir sayi tahmin/uydurma degil.
const INDEX_FIELD_NAMES = [
  'timestamp', 'fiyat', 'gunPct', 'alis', 'satis', 'hacimLot', 'hacim',
  'fiyat1HaftaOnce', 'fiyat1AyOnce', 'fiyat3AyOnce', 'fiyat6AyOnce', 'fiyatYilBasi',
  'fiyat1YilOnce', 'fiyat3YilOnce', 'fiyat5YilOnce', 'fiyatIlkGun'
];

// Ham fiyat seviyesinden gercek yuzde degisim hesaplar. Baz fiyat yoksa/0 ise
// (bazi yeni endekslerde 5 yillik gecmis olmayabilir) null doner -- asla
// uydurma/varsayilan bir yuzde uretmez.
function pctFrom(current, past) {
  if (typeof current !== 'number' || typeof past !== 'number' || !past) return null;
  return ((current - past) / past) * 100;
}

function enrichIndexRow(row) {
  const f = row.fiyat;
  return Object.assign({}, row, {
    yuzde1Hafta: pctFrom(f, row.fiyat1HaftaOnce),
    yuzde1Ay: pctFrom(f, row.fiyat1AyOnce),
    yuzde3Ay: pctFrom(f, row.fiyat3AyOnce),
    yuzde6Ay: pctFrom(f, row.fiyat6AyOnce),
    yuzdeYilbasi: pctFrom(f, row.fiyatYilBasi),
    yuzde1Yil: pctFrom(f, row.fiyat1YilOnce),
    yuzde3Yil: pctFrom(f, row.fiyat3YilOnce),
    yuzde5Yil: pctFrom(f, row.fiyat5YilOnce)
  });
}

// REFRESH_MS: Fintables sunucularına saygılı bir aralık. Çok sık istek
// atmak IP engeline yol açabilir; 45 saniye piyasa ekranı için yeterlidir.
const REFRESH_MS = 45 * 1000;
const REQUEST_TIMEOUT_MS = 12000;

const state = {
  equities: { data: null, updatedAt: null, stale: false, lastError: null },
  indices: { data: null, updatedAt: null, stale: false, lastError: null },
};

function httpGetJson(urlStr) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      urlStr,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BorsaKaynak-DataFetcher/1.0 (+https://borsakaynak.com)'
        },
        timeout: REQUEST_TIMEOUT_MS
      },
      (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          return reject(new Error('HTTP ' + res.statusCode + ' — ' + urlStr));
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('JSON parse hatası: ' + e.message));
          }
        });
      }
    );
    req.on('timeout', () => { req.destroy(new Error('İstek zaman aşımına uğradı: ' + urlStr)); });
    req.on('error', reject);
  });
}

function mapRow(codeRow, fieldNames) {
  const obj = {};
  fieldNames.forEach((name, i) => { obj[name] = codeRow[i]; });
  return obj;
}

async function refreshEquities() {
  try {
    const json = await httpGetJson(EQUITY_URL);
    const raw = json && json.results ? json.results : {};
    const out = {};
    for (const code of Object.keys(raw)) {
      const cell = raw[code];
      // Fintables barbar formatı: [{r:false, v: <deger>}, ...]
      const values = cell.map((c) => (c && typeof c === 'object' && 'v' in c) ? c.v : c);
      out[code] = mapRow(values, EQUITY_FIELD_NAMES);
    }
    state.equities = {
      data: out,
      updatedAt: new Date().toISOString(),
      stale: false,
      lastError: null,
      count: Object.keys(out).length
    };
  } catch (e) {
    state.equities.stale = true;
    state.equities.lastError = e.message;
    console.error('[fintables-live] Hisse verisi çekilemedi:', e.message);
  }
}

async function refreshIndices() {
  try {
    const json = await httpGetJson(INDEX_URL);
    const raw = json && json.results ? json.results : {};
    const out = {};
    for (const code of Object.keys(raw)) {
      out[code] = enrichIndexRow(mapRow(raw[code], INDEX_FIELD_NAMES));
    }
    state.indices = {
      data: out,
      updatedAt: new Date().toISOString(),
      stale: false,
      lastError: null,
      count: Object.keys(out).length
    };
  } catch (e) {
    state.indices.stale = true;
    state.indices.lastError = e.message;
    console.error('[fintables-live] Endeks verisi çekilemedi:', e.message);
  }
}

async function refreshAll() {
  await Promise.all([refreshEquities(), refreshIndices()]);
}

let _timer = null;
function startAutoRefresh() {
  if (_timer) return; // zaten çalışıyor
  refreshAll(); // ilk çekim hemen
  _timer = setInterval(refreshAll, REFRESH_MS);
  console.log('[fintables-live] Otomatik veri güncelleme başlatıldı (her ' + (REFRESH_MS / 1000) + ' saniyede bir).');
}

function stopAutoRefresh() {
  if (_timer) { clearInterval(_timer); _timer = null; }
}

// Dışa açılan, veri çekilemediğinde ASLA uydurma değer üretmeyen erişimciler:
function getEquities() {
  if (!state.equities.data) {
    return { success: false, error: state.equities.lastError || 'Henüz veri çekilmedi', data: {}, count: 0 };
  }
  return {
    success: true,
    stale: state.equities.stale,
    updatedAt: state.equities.updatedAt,
    count: state.equities.count,
    data: state.equities.data
  };
}

function getIndices() {
  if (!state.indices.data) {
    return { success: false, error: state.indices.lastError || 'Henüz veri çekilmedi', data: {}, count: 0 };
  }
  return {
    success: true,
    stale: state.indices.stale,
    updatedAt: state.indices.updatedAt,
    count: state.indices.count,
    data: state.indices.data
  };
}

function getEquity(code) {
  const all = getEquities();
  if (!all.success) return all;
  const row = all.data[String(code).toUpperCase()];
  if (!row) return { success: false, error: 'Sembol bulunamadı: ' + code };
  return { success: true, stale: all.stale, updatedAt: all.updatedAt, code: String(code).toUpperCase(), ...row };
}

function getIndex(code) {
  const all = getIndices();
  if (!all.success) return all;
  const row = all.data[String(code).toUpperCase()];
  if (!row) return { success: false, error: 'Endeks bulunamadı: ' + code };
  return { success: true, stale: all.stale, updatedAt: all.updatedAt, code: String(code).toUpperCase(), ...row };
}

module.exports = {
  startAutoRefresh,
  stopAutoRefresh,
  refreshAll,
  getEquities,
  getIndices,
  getEquity,
  getIndex,
};

/* ------------------------------------------------------------------------
 * SEKTORLER — fintables.com/sektorler sayfasindan dogrudan taranarak elde
 * edilen 44 resmi sektor adi ve slug'i (03.08.2026 tarihinde dogrulandi).
 * Bu liste STATIKTIR (Fintables'in sektorler sayfasi Next.js ile render
 * ediliyor ve markets.fintables.com gibi basit bir JSON API'si yok), ama
 * ICERIGI GERCEKTIR -- sitede daha once bulunan 19 sektorluk site kendi
 * uydurmasi degil, gercekten dogrulanmis 44 sektorun tamamidir.
 * ------------------------------------------------------------------------ */
const SEKTORLER_FINTABLES = [
  { ad: 'Ambalaj', slug: 'ambalaj' },
  { ad: 'Ana Metal', slug: 'ana-metal' },
  { ad: 'Aracı Kurum', slug: 'araci-kurum' },
  { ad: 'Bankacılık', slug: 'bankacilik' },
  { ad: 'Bilişim ve Yazılım', slug: 'bilisim-ve-yazilim' },
  { ad: 'Cam, Seramik, Porselen', slug: 'cam-seramik-porselen' },
  { ad: 'Dayanıklı Tüketim Ürünleri', slug: 'dayanikli-tuketim-urunleri' },
  { ad: 'Destek ve Hizmet', slug: 'destek-ve-hizmet' },
  { ad: 'Emeklilik', slug: 'emeklilik' },
  { ad: 'Enerji Teknolojileri', slug: 'enerji-teknolojileri' },
  { ad: 'Enerji Üretim ve Dağıtım', slug: 'enerji-uretim-ve-dagitim' },
  { ad: 'Faktoring', slug: 'faktoring' },
  { ad: 'Finansal Kiralama', slug: 'finansal-kiralama' },
  { ad: 'Gayrimenkul', slug: 'gayrimenkul' },
  { ad: 'Girişim Sermayesi Yat. Ort.', slug: 'girisim-sermayesi-yatirim-ortakligi' },
  { ad: 'Giyim, Tekstil ve Deri Ürünleri Perakendeciliği', slug: 'giyim-tekstil-ve-deri-urunleri-perakendeciligi' },
  { ad: 'Gıda Perakendeciliği', slug: 'gida-perakendeciligi' },
  { ad: 'Gıda ve İçecek', slug: 'gida-ve-icecek' },
  { ad: 'Haberleşme', slug: 'haberlesme' },
  { ad: 'Holding', slug: 'holding' },
  { ad: 'İlaç ve Sağlık', slug: 'ilac-ve-saglik' },
  { ad: 'İmalat', slug: 'imalat' },
  { ad: 'İnşaat', slug: 'insaat' },
  { ad: 'Kağıt ve Kağıt Ürünleri', slug: 'kagit-ve-kagit-urunleri' },
  { ad: 'Kimya ve Plastik', slug: 'kimya-ve-plastik' },
  { ad: 'Madencilik ve Taş Ocakçılığı', slug: 'madencilik-ve-tas-ocakciligi' },
  { ad: 'Menkul Kıymet Yat. Ort.', slug: 'menkul-kiymet-yatirim-ortakligi' },
  { ad: 'Metal Eşya ve Makine', slug: 'metal-esya-ve-makine' },
  { ad: 'Mobilya ve Dekorasyon', slug: 'mobilya-ve-dekorasyon' },
  { ad: 'Otomotiv', slug: 'otomotiv' },
  { ad: 'Otomotiv Yan Sanayi', slug: 'otomotiv-yan-sanayi' },
  { ad: 'Savunma', slug: 'savunma' },
  { ad: 'Servis Taşımacılığı ve Araç Kiralama', slug: 'servis-tasimaciligi-ve-arac-kiralama' },
  { ad: 'Sigorta', slug: 'sigorta' },
  { ad: 'Spor', slug: 'spor' },
  { ad: 'Tarım, Hayvancılık, Balıkçılık', slug: 'tarim-hayvancilik-balikcilik' },
  { ad: 'Tasarruf Finansman', slug: 'tasarruf-finansman' },
  { ad: 'Taş, Toprak, Çimento', slug: 'tas-toprak-cimento' },
  { ad: 'Teknolojik Ürün Ticareti', slug: 'teknolojik-urun-ticareti' },
  { ad: 'Tekstil, Giyim ve Deri', slug: 'tekstil-giyim-ve-deri' },
  { ad: 'Toptan ve Perakende Ticaret', slug: 'toptan-ve-perakende-ticaret' },
  { ad: 'Turizm', slug: 'turizm' },
  { ad: 'Ulaştırma', slug: 'ulastirma' },
  { ad: 'Varlık Yönetimi', slug: 'varlik-yonetimi' },
];
const SEKTORLER_KAYNAK_TARIHI = '2026-08-03';

function getSektorler() {
  return {
    success: true,
    kaynak: 'https://fintables.com/sektorler',
    dogrulamaTarihi: SEKTORLER_KAYNAK_TARIHI,
    count: SEKTORLER_FINTABLES.length,
    not: 'Sektor-sirket eslesmeleri bu listede yok; sadece resmi sektor adlari ve slug\'lari dogrulanmistir. Sirket listeleri icin ilgili fintables.com/sektorler/<slug> sayfasi ayrica taranmalidir.',
    data: SEKTORLER_FINTABLES
  };
}

module.exports.getSektorler = getSektorler;
