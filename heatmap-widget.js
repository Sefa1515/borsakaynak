// heatmap-widget.js
// BorsaKaynak canli BIST endeks isi haritasi bileseni.
// 47 BIST endeksinin (/api/tradingview/endeksler) canli verisini ceker ve
// renkli kutu (heatmap) izgarasi olarak cizer.
// NOT (gecmis): Once TradingView'in embed-widget-stock-heatmap.js widget'i
// denenmis ("dataSource":"BIST" gecersiz oldugu icin calismamis), sonra
// Fintables'in markets.fintables.com yedek API'sine gecilmis -- ama o da
// erisilemez/kararsiz cikti. Artik sitenin ZATEN CANLI VE DOGRULANMIS olan
// TradingView scanner altyapisi (hisseler icin kullanilanla ayni) endeksler
// icin de kullaniliyor.

const ENDEKS_ADLARI = {"XU100":"BIST 100", "XU030":"BIST 30", "XU050":"BIST 50", "XUTUM":"BIST Tüm", "X10XB":"BIST 10. Yıl Bileşik", "XAKUR":"BIST Kurumsal Yönetim", "XBANK":"BIST Bankacılık", "XBLSM":"BIST Bilişim", "XELKT":"BIST Elektrik", "XFINK":"BIST Finansal Kiralama ve Faktoring", "XGIDA":"BIST Gıda İçecek", "XGMYO":"BIST Gayrimenkul Yatırım Ortaklıkları", "XHARZ":"BIST Haberleşme", "XHOLD":"BIST Holding ve Yatırım", "XILTM":"BIST İletişim", "XINSA":"BIST İnşaat", "XK030":"BIST Katılım 30", "XK050":"BIST Katılım 50", "XK100":"BIST Katılım 100", "XKAGT":"BIST Kağıt", "XKMYA":"BIST Kimya Petrol Plastik", "XKTMT":"BIST Katılım Tüm", "XKTUM":"BIST Katılım Tüm 50", "XLBNK":"BIST Katılım Bankacılık", "XMADN":"BIST Madencilik", "XMANA":"BIST Ana Metal", "XMESY":"BIST Metal Eşya Makine", "XSD25":"BIST Sürdürülebilirlik 25", "XSGRT":"BIST Sigorta", "XSPOR":"BIST Spor", "XTAST":"BIST Taş Toprak", "XTCRT":"BIST Ticaret", "XTEKS":"BIST Tekstil Deri", "XTM25":"BIST Temettü 25", "XTMTU":"BIST Temettü Tüm", "XTRZM":"BIST Turizm", "XTUMY":"BIST Tüm-100 Yatırım Fonları", "XU500":"BIST 500", "XUGRA":"BIST Girişim Sermayesi", "XUHIZ":"BIST Hizmetler", "XULAS":"BIST Ulaştırma", "XUMAL":"BIST Mali", "XUSIN":"BIST Sınai", "XUTEK":"BIST Teknoloji", "XYLDZ":"BIST Yıldız", "XYORT":"BIST Yıldız Ortak", "XYUZO":"BIST Yüzölçümü"};

function bkHeatmapColor(pct) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return { bg: 'rgba(107,122,141,0.12)', border: 'rgba(107,122,141,0.25)', text: '#B0B9C5' };
  const clamped = Math.max(-5, Math.min(5, pct));
  const alpha = 0.12 + (Math.abs(clamped) / 5) * 0.73;
  if (pct >= 0) return { bg: 'rgba(0,181,110,' + alpha.toFixed(2) + ')', border: '#00B56E55', text: '#00B56E' };
  return { bg: 'rgba(224,79,95,' + alpha.toFixed(2) + ')', border: '#E04F5F55', text: '#E04F5F' };
}

async function bkRenderHeatmap(containerId, opts) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const options = opts || {};
  const linkPrefix = options.linkPrefix !== undefined ? options.linkPrefix : 'endeks-';
  const compact = !!options.compact;

  el.innerHTML = '<div class="bk-hm-loading">TradingView\'den canlı veri çekiliyor…</div>';

  let json;
  try {
    const res = await fetch('/api/tradingview/endeksler', { cache: 'no-store' });
    json = await res.json();
  } catch (e) {
    el.innerHTML = '<div class="bk-hm-error"><b>Bağlantı hatası.</b> TradingView verisine ulaşılamadı. Sahte veri gösterilmez.</div>';
    return;
  }

  if (!json || !json.success || !json.veri || !json.veri.length) {
    el.innerHTML = '<div class="bk-hm-error"><b>Veri alınamadı.</b> ' + (json && json.error ? String(json.error).replace(/</g,'&lt;') : 'TradingView kaynağına şu anda ulaşılamıyor.') + ' Uydurma/sahte veri gösterilmez, sayfa boş kalır.</div>';
    return;
  }

  const tiles = json.veri.map(row => {
    const kod = row.code;
    const pct = row.change != null ? row.change : null;
    const color = bkHeatmapColor(pct);
    const fiyat = row.close != null ? Number(row.close).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null;
    const pctStr = pct === null ? 'veri yok' : (pct >= 0 ? '+' : '') + pct.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    const href = linkPrefix ? (linkPrefix + kod + '.html') : null;
    const tag = href ? 'a' : 'div';
    const hrefAttr = href ? (' href="' + href + '"') : '';
    return '<' + tag + hrefAttr + ' class="bk-hm-tile' + (compact ? ' bk-hm-tile-compact' : '') + '" style="background:' + color.bg + ';border-color:' + color.border + '">' +
      '<div class="bk-hm-kod">' + kod + '</div>' +
      '<div class="bk-hm-ad">' + (row.name || ENDEKS_ADLARI[kod] || '') + '</div>' +
      '<div class="bk-hm-pct" style="color:' + color.text + '">' + pctStr + '</div>' +
      (fiyat && !compact ? '<div class="bk-hm-fiyat">' + fiyat + '</div>' : '') +
      '</' + tag + '>';
  }).join('');

  const updated = json.guncellemeZamani ? new Date(json.guncellemeZamani).toLocaleTimeString('tr-TR') : '—';

  el.innerHTML =
    '<div class="bk-hm-grid">' + tiles + '</div>' +
    '<div class="bk-hm-meta">Kaynak: TradingView Scanner · ' + json.veri.length + ' endeks · Son güncelleme: ' + updated + '</div>';
}

// Stiller: bir kere enjekte edilir
(function bkInjectHeatmapStyles() {
  if (document.getElementById('bk-hm-styles')) return;
  const style = document.createElement('style');
  style.id = 'bk-hm-styles';
  style.textContent = `
    .bk-hm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
    .bk-hm-tile{border:1px solid;border-radius:10px;padding:11px;text-decoration:none;color:inherit;display:block;transition:transform .15s}
    .bk-hm-tile:hover{transform:translateY(-2px)}
    .bk-hm-tile-compact{padding:8px}
    .bk-hm-kod{font-family:"Geist Mono",monospace;font-weight:700;font-size:12.5px;color:#F3F7FA}
    .bk-hm-ad{font-size:10px;color:#B0B9C5;margin-top:2px;min-height:24px;line-height:1.3}
    .bk-hm-pct{font-family:"Geist Mono",monospace;font-weight:700;font-size:14px;margin-top:6px}
    .bk-hm-fiyat{font-size:10px;color:#6B7A8D;margin-top:2px}
    .bk-hm-loading,.bk-hm-error{padding:30px;text-align:center;font-size:12.5px;color:#6B7A8D}
    .bk-hm-error b{color:#E04F5F;display:block;margin-bottom:4px}
    .bk-hm-stale{margin-top:10px;font-size:11px;color:#C8A96B;background:rgba(200,169,107,.1);border:1px solid rgba(200,169,107,.25);border-radius:8px;padding:8px 12px}
    .bk-hm-meta{margin-top:10px;font-size:10.5px;color:#6B7A8D}
  `;
  document.head.appendChild(style);
})();
