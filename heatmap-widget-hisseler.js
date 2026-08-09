// heatmap-widget-hisseler.js
// BorsaKaynak hisse bazlı canlı ısı haritası bileşeni.
// endeksler-isi-haritasi.html'deki heatmap-widget.js (Fintables/endeks) ile
// aynı görsel dili kullanır, ama veriyi zaten çalışan
// /api/tradingview/movers endpoint'inden (tradingview-movers.js) çeker.
// Kategori parametresiyle "En Çok Yükselenler", "En Çok Düşenler" veya
// "En Çok İşlem Görenler" ısı haritası gösterilebilir.

function bkHisseHeatmapColor(pct) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) {
    return { bg: 'rgba(107,122,141,0.12)', border: 'rgba(107,122,141,0.25)', text: '#B0B9C5' };
  }
  const clamped = Math.max(-10, Math.min(10, pct));
  const alpha = 0.15 + (Math.abs(clamped) / 10) * 0.70;
  if (pct >= 0) return { bg: 'rgba(0,181,110,' + alpha.toFixed(2) + ')', border: '#00B56E55', text: '#00B56E' };
  return { bg: 'rgba(224,79,95,' + alpha.toFixed(2) + ')', border: '#E04F5F55', text: '#E04F5F' };
}

// Piyasa değerine göre kabaca göreceli kutu boyutu (0.75x - 1.6x arası)
function bkTileScale(marketCap, maxCap) {
  if (!marketCap || !maxCap) return 1;
  const ratio = Math.sqrt(marketCap / maxCap);
  return Math.max(0.75, Math.min(1.6, 0.75 + ratio * 0.85));
}

async function bkRenderHisseHeatmap(containerId, opts) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const options = opts || {};
  const kategori = options.kategori || 'artanlar'; // artanlar | kaybedenler | en-aktif
  const limit = options.limit || 60;
  const linkPrefix = options.linkPrefix !== undefined ? options.linkPrefix : 'hisse-';

  el.innerHTML = '<div class="bk-hm-loading">TradingView\'den canlı veri çekiliyor…</div>';

  let json;
  try {
    const res = await fetch(`/api/tradingview/movers?kategori=${encodeURIComponent(kategori)}&limit=${limit}`, { cache: 'no-store' });
    json = await res.json();
  } catch (e) {
    el.innerHTML = '<div class="bk-hm-error"><b>Bağlantı hatası.</b> TradingView verisine ulaşılamadı. Sahte veri gösterilmez.</div>';
    return;
  }

  if (!json || !json.success || !json.veri || !json.veri.length) {
    el.innerHTML = '<div class="bk-hm-error"><b>Veri alınamadı.</b> ' +
      (json && json.error ? String(json.error).replace(/</g, '&lt;') : 'Şu anda gösterilecek hisse verisi yok.') +
      ' Uydurma/sahte veri gösterilmez, alan boş kalır.</div>';
    return;
  }

  const rows = json.veri;
  const maxCap = Math.max(...rows.map(r => r.market_cap || 0));

  const tiles = rows.map(row => {
    const pct = row.change;
    const color = bkHisseHeatmapColor(pct);
    const scale = bkTileScale(row.market_cap, maxCap);
    const priceStr = row.close != null
      ? row.close.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL'
      : 'veri yok';
    const pctStr = pct === null || pct === undefined
      ? 'veri yok'
      : (pct >= 0 ? '+' : '') + pct.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    const href = linkPrefix ? (linkPrefix + row.code.toLowerCase() + '.html') : null;
    const tag = href ? 'a' : 'div';
    const hrefAttr = href ? (' href="' + href + '"') : '';
    return '<' + tag + hrefAttr + ' class="bk-hm-tile" style="background:' + color.bg + ';border-color:' + color.border +
      ';flex-grow:' + scale.toFixed(2) + '">' +
      '<div class="bk-hm-kod">' + row.code + '</div>' +
      '<div class="bk-hm-ad">' + (row.name || '') + '</div>' +
      '<div class="bk-hm-pct" style="color:' + color.text + '">' + pctStr + '</div>' +
      '<div class="bk-hm-fiyat">' + priceStr + '</div>' +
      '</' + tag + '>';
  }).join('');

  el.innerHTML = '<div class="bk-hm-grid">' + tiles + '</div>' +
    '<div class="bk-hm-meta">Kaynak: TradingView Scanner &middot; Güncelleme: ' +
    new Date(json.guncellemeZamani || Date.now()).toLocaleTimeString('tr-TR') + '</div>';
}

// Stiller: bir kere enjekte edilir (heatmap-widget.js zaten yuklendiyse
// tekrar enjekte edilmez, ayni ID kontrolunu kullanir)
(function bkInjectHisseHeatmapStyles() {
  if (document.getElementById('bk-hm-styles')) return;
  const style = document.createElement('style');
  style.id = 'bk-hm-styles';
  style.textContent = `
    .bk-hm-grid{display:flex;flex-wrap:wrap;gap:8px}
    .bk-hm-tile{border:1px solid;border-radius:10px;padding:11px;text-decoration:none;color:inherit;display:block;transition:transform .15s;min-width:120px;flex-basis:120px}
    .bk-hm-tile:hover{transform:translateY(-2px)}
    .bk-hm-kod{font-family:"Geist Mono",monospace;font-weight:700;font-size:12.5px;color:#F3F7FA}
    .bk-hm-ad{font-size:10px;color:#B0B9C5;margin-top:2px;min-height:24px;line-height:1.3}
    .bk-hm-pct{font-family:"Geist Mono",monospace;font-weight:700;font-size:14px;margin-top:6px}
    .bk-hm-fiyat{font-size:10px;color:#6B7A8D;margin-top:2px}
    .bk-hm-loading,.bk-hm-error{padding:30px;text-align:center;font-size:12.5px;color:#6B7A8D}
    .bk-hm-error b{color:#E04F5F;display:block;margin-bottom:4px}
    .bk-hm-meta{margin-top:10px;font-size:10.5px;color:#6B7A8D}
  `;
  document.head.appendChild(style);
})();
