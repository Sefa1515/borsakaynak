// tradingview-movers.js
// Turkiye BIST piyasa hareketleri (market movers) -- tr.tradingview.com/markets/stocks-turkey/
// sayfasindaki tum kategori sekmelerinin (Hisse, En cok artanlar, En buyuk kaybedenler, vb.)
// gercek TradingView scanner API'sinden canli veri cekilmesi.
//
// Bu modul, sitede zaten dogrulanmis calisan getTradingViewTopGainers() /
// getTradingViewBistQuotes() fonksiyonlarinin (server.js) AYNI istek desenini
// (scanner.tradingview.com/turkey/scan, ayni header'lar, ayni temel filtre) kullanir.
// Sadece kategoriye gore filter/sort/kolon degisir.
//
// ONEMLI -- UYDURMA VERI YOK: Bir kategori icin TradingView bir alani (ör. temettü,
// nakit, calisan sayisi) doldurmazsa, o satirin ilgili "metric" degeri null birakilir
// ve on yuz bunu "veri yok" olarak gosterir. Hicbir zaman rastgele/sahte sayi uretilmez.

const BASE_COLUMNS = [
  'name', 'description', 'close', 'change', 'change_abs', 'volume',
  'market_cap_basic', 'number_of_employees', 'dividends_yield_current',
  'net_income', 'total_revenue', 'Volatility.D', 'beta_1_year',
  'relative_volume_10d_calc', 'Perf.Y', 'RSI', 'price_52_week_high', 'price_52_week_low',
  'Perf.W', 'Perf.1M', 'type'
];

const COL = {
  name: 0, description: 1, close: 2, change: 3, change_abs: 4, volume: 5,
  market_cap: 6, employees: 7, div_yield: 8, net_income: 9, revenue: 10,
  volatility: 11, beta: 12, rel_volume: 13, perf_y: 14, rsi: 15, high52: 16, low52: 17,
  perf_w: 18, perf_1m: 19, type: 20
};

// Sunucu tarafinda dogrulanmis, izin verilen sortField degerleri -- serbest
// metin sort alani kabul edilmez (guvenlik + tutarlilik icin beyaz liste).
const ALLOWED_SORT_FIELDS = new Set([
  'change', 'Perf.W', 'Perf.1M', 'Perf.Y', 'volume', 'close',
  'market_cap_basic', 'RSI'
]);

const TYPE_FILTER = { left: 'type', operation: 'in_range', right: ['stock', 'dr', 'fund'] };

// Kategori tanimlari: her biri tr.tradingview.com/markets/stocks-turkey/ ekran
// goruntusundeki sekme basliklarina karsilik gelir.
const CATEGORIES = {
  'hisse': {
    label: 'Hisse',
    apiSort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
    metric: 'market_cap', metricLabel: 'Piyasa Değeri', metricUnit: 'try'
  },
  'artanlar': {
    label: 'En çok artanlar',
    extraFilter: [{ left: 'change', operation: 'greater', right: 0 }],
    apiSort: { sortBy: 'change', sortOrder: 'desc' },
    metric: 'change', metricLabel: 'Değişim %', metricUnit: 'pct'
  },
  'kaybedenler': {
    label: 'En büyük kaybedenler',
    extraFilter: [{ left: 'change', operation: 'less', right: 0 }],
    apiSort: { sortBy: 'change', sortOrder: 'asc' },
    metric: 'change', metricLabel: 'Değişim %', metricUnit: 'pct'
  },
  'buyuk-sermaye': {
    label: 'Büyük-sermaye',
    apiSort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
    metric: 'market_cap', metricLabel: 'Piyasa Değeri', metricUnit: 'try'
  },
  'kucuk-sermaye': {
    label: 'Küçük-sermaye',
    extraFilter: [{ left: 'market_cap_basic', operation: 'greater', right: 0 }],
    apiSort: { sortBy: 'market_cap_basic', sortOrder: 'asc' },
    metric: 'market_cap', metricLabel: 'Piyasa Değeri', metricUnit: 'try'
  },
  'en-cok-calisan': {
    label: 'En büyük işverenler',
    extraFilter: [{ left: 'number_of_employees', operation: 'greater', right: 0 }],
    apiSort: { sortBy: 'number_of_employees', sortOrder: 'desc' },
    metric: 'employees', metricLabel: 'Çalışan Sayısı', metricUnit: 'int'
  },
  'yuksek-temettu': {
    label: 'Yüksek-temettü',
    extraFilter: [{ left: 'dividends_yield_current', operation: 'greater', right: 0 }],
    apiSort: { sortBy: 'dividends_yield_current', sortOrder: 'desc' },
    metric: 'div_yield', metricLabel: 'Temettü Verimi %', metricUnit: 'pct'
  },
  'yuksek-net-gelir': {
    label: 'En yüksek net gelir',
    apiSort: { sortBy: 'net_income', sortOrder: 'desc' },
    metric: 'net_income', metricLabel: 'Net Gelir', metricUnit: 'try'
  },
  'yuksek-nakit': {
    label: 'En yüksek nakit',
    apiSort: { sortBy: 'net_income', sortOrder: 'desc' },
    metric: 'net_income', metricLabel: 'Net Gelir (nakit alanı doğrulanamadı)', metricUnit: 'try',
    note: 'TradingView nakit (cash) alanı bu sürümde doğrulanamadı; net gelire göre sıralanmıştır.'
  },
  'calisan-basi-kar': {
    label: 'Çalışan başına en yüksek kâr',
    wideScan: true,
    localSort: (a, b) => (b._profitPerEmp ?? -Infinity) - (a._profitPerEmp ?? -Infinity),
    metric: 'profit_per_employee', metricLabel: 'Çalışan Başına Kâr', metricUnit: 'try'
  },
  'calisan-basi-gelir': {
    label: 'Çalışan başına en yüksek gelir',
    wideScan: true,
    localSort: (a, b) => (b._revenuePerEmp ?? -Infinity) - (a._revenuePerEmp ?? -Infinity),
    metric: 'revenue_per_employee', metricLabel: 'Çalışan Başına Gelir', metricUnit: 'try'
  },
  'en-aktif': {
    label: 'En Yüksek Hacimli Hisseler',
    apiSort: { sortBy: 'volume', sortOrder: 'desc' },
    metric: 'volume', metricLabel: 'Hacim', metricUnit: 'vol'
  },
  'anormal-hacim': {
    label: 'Olağandışı hacim',
    apiSort: { sortBy: 'relative_volume_10d_calc', sortOrder: 'desc' },
    metric: 'rel_volume', metricLabel: 'Göreceli Hacim (10g)', metricUnit: 'ratio'
  },
  'en-volatil': {
    label: 'En Volatil',
    apiSort: { sortBy: 'Volatility.D', sortOrder: 'desc' },
    metric: 'volatility', metricLabel: 'Günlük Volatilite %', metricUnit: 'pct'
  },
  'yuksek-beta': {
    label: 'Yüksek beta',
    apiSort: { sortBy: 'beta_1_year', sortOrder: 'desc' },
    metric: 'beta', metricLabel: 'Beta (1Y)', metricUnit: 'num'
  },
  'en-iyi-performans': {
    label: 'En iyi performans',
    apiSort: { sortBy: 'Perf.Y', sortOrder: 'desc' },
    metric: 'perf_y', metricLabel: '1 Yıllık Performans %', metricUnit: 'pct'
  },
  'yuksek-gelir': {
    label: 'En yüksek gelir',
    apiSort: { sortBy: 'total_revenue', sortOrder: 'desc' },
    metric: 'revenue', metricLabel: 'Toplam Gelir', metricUnit: 'try'
  },
  'en-pahali': {
    label: 'En pahalısı',
    apiSort: { sortBy: 'close', sortOrder: 'desc' },
    metric: 'close', metricLabel: 'Fiyat', metricUnit: 'try'
  },
  'kucuk-hisse': {
    label: 'Küçük hisseler',
    extraFilter: [{ left: 'close', operation: 'greater', right: 0 }],
    apiSort: { sortBy: 'close', sortOrder: 'asc' },
    metric: 'close', metricLabel: 'Fiyat', metricUnit: 'try'
  },
  'fazla-alinmis': {
    label: "RSI'ı Yüksek Hisseler",
    extraFilter: [{ left: 'RSI', operation: 'greater', right: 70 }],
    apiSort: { sortBy: 'RSI', sortOrder: 'desc' },
    metric: 'rsi', metricLabel: 'RSI (14)', metricUnit: 'num'
  },
  'fazla-satilmis': {
    label: "RSI'ı Düşük Hisseler",
    extraFilter: [{ left: 'RSI', operation: 'less', right: 30 }],
    apiSort: { sortBy: 'RSI', sortOrder: 'asc' },
    metric: 'rsi', metricLabel: 'RSI (14)', metricUnit: 'num'
  },
  'en-yuksek-fiyat': {
    label: 'En Yüksek Fiyat',
    apiSort: { sortBy: 'price_52_week_high', sortOrder: 'desc' },
    metric: 'high52', metricLabel: '52 Hafta Zirve Fiyatı', metricUnit: 'try'
  },
  'diptekiler': {
    label: 'Diptekiler',
    apiSort: { sortBy: 'Perf.Y', sortOrder: 'asc' },
    metric: 'perf_y', metricLabel: '1 Yıllık Performans %', metricUnit: 'pct'
  },
  'hafta52-zirve': {
    label: '52 hafta zirve',
    wideScan: true,
    localSort: (a, b) => (b._distHigh52 ?? -Infinity) - (a._distHigh52 ?? -Infinity),
    metric: 'dist_high52', metricLabel: 'Zirveye Yakınlık %', metricUnit: 'pct'
  },
  'hafta52-dip': {
    label: '52 hafta düşük',
    wideScan: true,
    localSort: (a, b) => (a._distLow52 ?? Infinity) - (b._distLow52 ?? Infinity),
    metric: 'dist_low52', metricLabel: 'Dibe Yakınlık %', metricUnit: 'pct'
  }
};

function n(v) {
  const x = parseFloat(v);
  return Number.isFinite(x) ? x : null;
}

function parseRow(item) {
  const d = item.d || [];
  const code = (item.s || '').replace('BIST:', '').trim().toUpperCase();
  const row = {
    code,
    name: d[COL.description] || d[COL.name] || code,
    close: n(d[COL.close]),
    change: n(d[COL.change]),
    change_abs: n(d[COL.change_abs]),
    volume: n(d[COL.volume]),
    market_cap: n(d[COL.market_cap]),
    employees: n(d[COL.employees]),
    div_yield: n(d[COL.div_yield]),
    net_income: n(d[COL.net_income]),
    revenue: n(d[COL.revenue]),
    volatility: n(d[COL.volatility]),
    beta: n(d[COL.beta]),
    rel_volume: n(d[COL.rel_volume]),
    perf_y: n(d[COL.perf_y]),
    rsi: n(d[COL.rsi]),
    high52: n(d[COL.high52]),
    low52: n(d[COL.low52]),
    perf_w: n(d[COL.perf_w]),
    perf_1m: n(d[COL.perf_1m]),
    type: (d[COL.type] || '').toString()
  };
  row.profit_per_employee = (row.net_income != null && row.employees) ? row.net_income / row.employees : null;
  row.revenue_per_employee = (row.revenue != null && row.employees) ? row.revenue / row.employees : null;
  row.dist_high52 = (row.close != null && row.high52) ? ((row.close / row.high52) - 1) * 100 : null;
  row.dist_low52 = (row.close != null && row.low52) ? ((row.close / row.low52) - 1) * 100 : null;
  row._profitPerEmp = row.profit_per_employee;
  row._revenuePerEmp = row.revenue_per_employee;
  row._distHigh52 = row.dist_high52;
  row._distLow52 = row.dist_low52;
  return row;
}

async function scan(payload) {
  const res = await fetch('https://scanner.tradingview.com/turkey/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('TradingView scanner HTTP ' + res.status);
  const j = await res.json();
  return (j && j.data) || [];
}

// BIST Endeksleri (47 adet) -- kod -> tam Turkce ad eslemesi.
// Daha once Fintables'tan (markets.fintables.com/barbar/server) cekilmeye
// calisiliyordu, ama bu kaynak hem ana site hem de bu "yedek" API
// erisilemez/kararsiz cikti. Bunun yerine, bu sitede ZATEN CANLI VE
// DOGRULANMIS calisan TradingView scanner altyapisini (yukaridaki scan()
// fonksiyonu, hisseler icin kullanilanla AYNI) endeksler icin de kullaniyoruz.
// NOT: Bu fonksiyon henuz gercek TradingView erisimi olan bir ortamda
// (Claude'un sandbox'i degil) canli test edilmedi -- ilk calistirmada
// sonucu kontrol edin.
const ENDEKS_ADLARI = {"XU100":"BIST 100", "XU030":"BIST 30", "XU050":"BIST 50", "XUTUM":"BIST Tüm", "X10XB":"BIST 10. Yıl Bileşik", "XAKUR":"BIST Kurumsal Yönetim", "XBANK":"BIST Bankacılık", "XBLSM":"BIST Bilişim", "XELKT":"BIST Elektrik", "XFINK":"BIST Finansal Kiralama ve Faktoring", "XGIDA":"BIST Gıda İçecek", "XGMYO":"BIST Gayrimenkul Yatırım Ortaklıkları", "XHARZ":"BIST Haberleşme", "XHOLD":"BIST Holding ve Yatırım", "XILTM":"BIST İletişim", "XINSA":"BIST İnşaat", "XK030":"BIST Katılım 30", "XK050":"BIST Katılım 50", "XK100":"BIST Katılım 100", "XKAGT":"BIST Kağıt", "XKMYA":"BIST Kimya Petrol Plastik", "XKTMT":"BIST Katılım Tüm", "XKTUM":"BIST Katılım Tüm 50", "XLBNK":"BIST Katılım Bankacılık", "XMADN":"BIST Madencilik", "XMANA":"BIST Ana Metal", "XMESY":"BIST Metal Eşya Makine", "XSD25":"BIST Sürdürülebilirlik 25", "XSGRT":"BIST Sigorta", "XSPOR":"BIST Spor", "XTAST":"BIST Taş Toprak", "XTCRT":"BIST Ticaret", "XTEKS":"BIST Tekstil Deri", "XTM25":"BIST Temettü 25", "XTMTU":"BIST Temettü Tüm", "XTRZM":"BIST Turizm", "XTUMY":"BIST Tüm-100 Yatırım Fonları", "XU500":"BIST 500", "XUGRA":"BIST Girişim Sermayesi", "XUHIZ":"BIST Hizmetler", "XULAS":"BIST Ulaştırma", "XUMAL":"BIST Mali", "XUSIN":"BIST Sınai", "XUTEK":"BIST Teknoloji", "XYLDZ":"BIST Yıldız", "XYORT":"BIST Yıldız Ortak", "XYUZO":"BIST Yüzölçümü"};

async function getEndeksler() {
  const codes = Object.keys(ENDEKS_ADLARI);
  const tickers = codes.map(c => 'BIST:' + c);
  try {
    const payload = {
      symbols: { tickers, query: { types: [] } },
      columns: ['name', 'close', 'change', 'change_abs', 'volume']
    };
    const items = await scan(payload);
    if (!items || !items.length) {
      return { success: false, error: 'TradingView endeks taramasi bos sonuc dondurdu.', veri: [] };
    }
    const veri = items.map(item => {
      const code = (item.s || '').replace('BIST:', '');
      const d = item.d || [];
      return {
        code,
        name: ENDEKS_ADLARI[code] || d[0] || code,
        close: d[1] != null ? d[1] : null,
        change: d[2] != null ? d[2] : null,
        change_abs: d[3] != null ? d[3] : null,
        volume: d[4] != null ? d[4] : null
      };
    }).filter(x => x.close != null);
    return {
      success: true,
      veri,
      adet: veri.length,
      guncellemeZamani: Date.now()
    };
  } catch (e) {
    return { success: false, error: e.message, veri: [] };
  }
}

async function getMovers(slug, limit, sortOverride) {
  const cat = CATEGORIES[slug];
  if (!cat) return { success: false, error: 'Bilinmeyen kategori: ' + slug };
  const max = Math.min(limit || 50, 100);

  // sortOverride: { field, order } -- ornegin radar.html'deki "Haftalik/Aylik"
  // sekmeleri icin, kategorinin varsayilan filtre/sortunu degil, dogrudan
  // Perf.W / Perf.1M alanina gore siralama ister. Sadece beyaz listedeki
  // alanlar kabul edilir.
  const useOverride = sortOverride && ALLOWED_SORT_FIELDS.has(sortOverride.field);
  const filter = useOverride ? [TYPE_FILTER] : [TYPE_FILTER].concat(cat.extraFilter || []);
  const effectiveSort = useOverride
    ? { sortBy: sortOverride.field, sortOrder: sortOverride.order === 'asc' ? 'asc' : 'desc' }
    : cat.apiSort;

  let items;
  if (!useOverride && (cat.wideScan || !cat.apiSort)) {
    const payload = {
      filter,
      options: { lang: 'tr' },
      markets: ['turkey'],
      symbols: { query: { types: [] } },
      columns: BASE_COLUMNS,
      sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
      range: [0, 1000]
    };
    items = await scan(payload);
  } else {
    const payload = {
      filter,
      options: { lang: 'tr' },
      markets: ['turkey'],
      symbols: { query: { types: [] } },
      columns: BASE_COLUMNS,
      sort: effectiveSort,
      range: [0, max]
    };
    items = await scan(payload);
  }

  let rows = items.map(parseRow).filter(r => r.code && r.close != null && r.close > 0);

  if (!useOverride && cat.localSort) {
    rows = rows.filter(r => {
      if (cat.metric === 'profit_per_employee') return r.profit_per_employee != null;
      if (cat.metric === 'revenue_per_employee') return r.revenue_per_employee != null;
      if (cat.metric === 'dist_high52') return r.dist_high52 != null;
      if (cat.metric === 'dist_low52') return r.dist_low52 != null;
      return true;
    });
    rows.sort(cat.localSort);
    rows = rows.slice(0, max);
  }

  rows.forEach(r => { delete r._profitPerEmp; delete r._revenuePerEmp; delete r._distHigh52; delete r._distLow52; });

  const metricAlan = useOverride
    ? (sortOverride.field === 'Perf.W' ? 'perf_w' : sortOverride.field === 'Perf.1M' ? 'perf_1m' : cat.metric)
    : cat.metric;
  const metricBaslik = useOverride
    ? (sortOverride.field === 'Perf.W' ? 'Haftalık Performans %' : sortOverride.field === 'Perf.1M' ? 'Aylık Performans %' : cat.metricLabel)
    : cat.metricLabel;

  return {
    success: true,
    kategori: slug,
    baslik: cat.label,
    metrikAlan: metricAlan,
    metrikBaslik: metricBaslik,
    metrikBirim: useOverride ? 'pct' : cat.metricUnit,
    not: cat.note || null,
    guncellemeZamani: new Date().toISOString(),
    kaynak: 'TradingView Scanner (scanner.tradingview.com/turkey/scan)',
    adet: rows.length,
    veri: rows
  };
}

function getCategoryList() {
  return Object.keys(CATEGORIES).map(slug => ({ slug, label: CATEGORIES[slug].label }));
}


// Sinifsiz/capsiz tam enstruman listesi -- bist-tum-enstrumanlar.html icin.
// getMovers()'daki 100 satirlik ust siniri UYGULAMAZ; TradingView'da o an
// gercekten kac stock/dr/fund varsa hepsini doner (max range 1000, TYPE_FILTER
// disinda ekstra filtre yok). "type" alani gercek TradingView siniflandirmasidir
// (stock/dr/fund) -- kategori sekmeleri (Hisse/Sertifika/Fon) buna gore, tahmin
// degil, gercek veriye gore ayrilir.
async function getFullInstrumentList() {
  const payload = {
    filter: [TYPE_FILTER],
    options: { lang: 'tr' },
    markets: ['turkey'],
    symbols: { query: { types: [] } },
    columns: BASE_COLUMNS,
    sort: { sortBy: 'name', sortOrder: 'asc' },
    range: [0, 1000]
  };
  const items = await scan(payload);
  const rows = items.map(parseRow).filter(r => r.code && r.close != null && r.close > 0);
  rows.forEach(r => { delete r._profitPerEmp; delete r._revenuePerEmp; delete r._distHigh52; delete r._distLow52; });

  const counts = { hisse: 0, sertifika: 0, fon: 0, diger: 0 };
  rows.forEach(r => {
    if (r.type === 'stock') counts.hisse++;
    else if (r.type === 'dr') counts.sertifika++;
    else if (r.type === 'fund') counts.fon++;
    else counts.diger++;
  });

  return {
    success: true,
    guncellemeZamani: new Date().toISOString(),
    kaynak: 'TradingView Scanner (scanner.tradingview.com/turkey/scan)',
    adet: rows.length,
    sayimlar: counts,
    veri: rows
  };
}

module.exports = { getMovers, getCategoryList, CATEGORIES, getFullInstrumentList, getEndeksler };
