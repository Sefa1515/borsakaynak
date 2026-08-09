/* BorsaKaynak - hisse/endeks mum grafigi (bagimsiz, Canvas tabanli).
   Yahoo Finance gunluk OHLCV verisini sunucu uzerinden (/api/chart) ceker
   ve kendi Canvas ciziminde gosterir. */
(function (global) {
  'use strict';

  const RANGES = [
    { key: '1mo', label: '1A' },
    { key: '3mo', label: '3A' },
    { key: '6mo', label: '6A' },
    { key: '1y', label: '1Y' },
    { key: '5y', label: '5Y' },
  ];

  function apiBase() {
    return window.location.protocol === 'file:' ? 'http://localhost:8080' : '';
  }

  function fmtPrice(n) {
    return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtAxisDate(ts, rangeKey) {
    const d = new Date(ts);
    if (rangeKey === '1mo' || rangeKey === '3mo') {
      return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
    }
    return d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
  }

  function buildShell(container) {
    container.innerHTML = '';
    container.classList.add('bkchart-root');
    const wrap = document.createElement('div');
    wrap.className = 'bkchart-wrap';

    const bar = document.createElement('div');
    bar.className = 'bkchart-bar';
    const tabs = document.createElement('div');
    tabs.className = 'bkchart-tabs';
    RANGES.forEach(r => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bkchart-tab';
      b.textContent = r.label;
      b.dataset.range = r.key;
      tabs.appendChild(b);
    });
    const status = document.createElement('span');
    status.className = 'bkchart-status';
    bar.appendChild(tabs);
    bar.appendChild(status);

    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'bkchart-canvas-wrap';
    const canvas = document.createElement('canvas');
    canvasWrap.appendChild(canvas);

    wrap.appendChild(bar);
    wrap.appendChild(canvasWrap);
    container.appendChild(wrap);

    if (!document.getElementById('bkchart-style')) {
      const style = document.createElement('style');
      style.id = 'bkchart-style';
      style.textContent = `
        .bkchart-root{width:100%;height:100%;display:flex;flex-direction:column;min-height:260px}
        .bkchart-wrap{display:flex;flex-direction:column;width:100%;height:100%;gap:10px}
        .bkchart-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
        .bkchart-tabs{display:flex;gap:6px}
        .bkchart-tab{cursor:pointer;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#A0B0C0;font-size:12px;font-weight:600;padding:6px 12px;border-radius:6px;transition:.15s}
        .bkchart-tab:hover{border-color:rgba(200,169,107,.5);color:#F3F7FA}
        .bkchart-tab.active{background:#C8A96B;border-color:#C8A96B;color:#08121E}
        .bkchart-status{font-size:11.5px;color:#8B98A9;font-family:monospace}
        .bkchart-canvas-wrap{position:relative;flex:1;min-height:220px}
        .bkchart-canvas-wrap canvas{position:absolute;inset:0;width:100%;height:100%}
      `;
      document.head.appendChild(style);
    }
    return { wrap, tabs, status, canvas };
  }

  function drawCandles(canvas, candles, rangeKey) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const padL = 54, padR = 10, padT = 12, padB = 22;
    const plotW = w - padL - padR, plotH = h - padT - padB;
    if (plotW <= 10 || plotH <= 10 || !candles.length) return;

    const lows = candles.map(c => c.l), highs = candles.map(c => c.h);
    const min = Math.min(...lows), max = Math.max(...highs);
    const pad = (max - min) * 0.06 || max * 0.01 || 1;
    const yMin = min - pad, yMax = max + pad;
    const y = v => padT + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

    const n = candles.length;
    const slot = plotW / n;
    const bodyW = Math.max(1.5, Math.min(10, slot * 0.62));

    // izgara + eksen etiketleri
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.fillStyle = '#8B98A9';
    ctx.font = '10.5px Inter, sans-serif';
    ctx.textAlign = 'right';
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const v = yMin + ((yMax - yMin) * i) / gridLines;
      const yy = y(v);
      ctx.beginPath();
      ctx.moveTo(padL, yy);
      ctx.lineTo(w - padR, yy);
      ctx.stroke();
      ctx.fillText(fmtPrice(v), padL - 6, yy + 3);
    }

    // tarih etiketleri (basta, ortada, sonda)
    ctx.textAlign = 'center';
    [0, Math.floor(n / 2), n - 1].forEach(idx => {
      const c = candles[idx];
      const x = padL + slot * idx + slot / 2;
      ctx.fillText(fmtAxisDate(c.t, rangeKey), x, h - 6);
    });

    // mumlar
    for (let i = 0; i < n; i++) {
      const c = candles[i];
      const x = padL + slot * i + slot / 2;
      const up = c.c >= c.o;
      ctx.strokeStyle = ctx.fillStyle = up ? '#00B56E' : '#E04F5F';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y(c.h));
      ctx.lineTo(x, y(c.l));
      ctx.stroke();
      const yo = y(c.o), yc = y(c.c);
      const top = Math.min(yo, yc), bh = Math.max(1, Math.abs(yc - yo));
      ctx.fillRect(x - bodyW / 2, top, bodyW, bh);
    }

    // son kapanis cizgisi
    const last = candles[n - 1];
    ctx.strokeStyle = 'rgba(200,169,107,.55)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, y(last.c));
    ctx.lineTo(w - padR, y(last.c));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  async function fetchChart(symbol, rangeKey) {
    const interval = (rangeKey === '1mo') ? '1d' : (rangeKey === '5y' ? '1wk' : '1d');
    const url = apiBase() + '/api/chart?symbol=' + encodeURIComponent(symbol) + '&range=' + rangeKey + '&interval=' + interval;
    const res = await fetch(url, { cache: 'no-store' });
    const j = await res.json();
    if (!res.ok || !j.ok) throw new Error(j.error || 'Grafik verisi alınamadı');
    return j.candles;
  }

  async function render(containerId, symbol, opts) {
    const container = document.getElementById(containerId);
    if (!container) return;
    opts = opts || {};
    const initialRange = opts.range || '6mo';

    const { tabs, status, canvas } = buildShell(container);
    let currentRange = initialRange;
    let resizeObs;

    function setActiveTab() {
      tabs.querySelectorAll('.bkchart-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.range === currentRange);
      });
    }

    async function load(rangeKey) {
      currentRange = rangeKey;
      setActiveTab();
      status.textContent = 'Yükleniyor…';
      try {
        const candles = await fetchChart(symbol, rangeKey);
        drawCandles(canvas, candles, rangeKey);
        const last = candles[candles.length - 1];
        const first = candles[0];
        const pct = first.c ? ((last.c - first.c) / first.c) * 100 : 0;
        status.textContent = fmtPrice(last.c) + '  ' + (pct >= 0 ? '▲ +' : '▼ ') + Math.abs(pct).toFixed(2) + '%';
        if (resizeObs) resizeObs.disconnect();
        resizeObs = new ResizeObserver(() => drawCandles(canvas, candles, rangeKey));
        resizeObs.observe(canvas.parentElement);
      } catch (e) {
        status.textContent = '';
        canvas.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8B98A9;font-size:13px;text-align:center;padding:20px">Grafik verisi şu anda alınamıyor.<br>Lütfen daha sonra tekrar deneyin.</div>';
      }
    }

    tabs.querySelectorAll('.bkchart-tab').forEach(b => {
      b.addEventListener('click', () => load(b.dataset.range));
    });

    load(currentRange);
  }

  // RSI-14 tabanli basit teknik gösterge (gercek OHLC verisinden hesaplanir).
  function computeRSI(closes, period) {
    period = period || 14;
    if (closes.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff; else losses -= diff;
    }
    const avgGain = gains / period, avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  function rsiLabel(rsi) {
    if (rsi >= 70) return { text: 'Aşırı Alım', cls: 'sell' };
    if (rsi >= 55) return { text: 'Al', cls: 'buy' };
    if (rsi >= 45) return { text: 'Nötr', cls: 'neutral' };
    if (rsi >= 30) return { text: 'Sat', cls: 'sell' };
    return { text: 'Aşırı Satım', cls: 'buy' };
  }

  async function renderGauge(containerId, symbol) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8B98A9;font-size:13px">Yükleniyor…</div>';

    if (!document.getElementById('bkgauge-style')) {
      const style = document.createElement('style');
      style.id = 'bkgauge-style';
      style.textContent = `
        .bkgauge{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;height:100%;padding:10px}
        .bkgauge-val{font-family:monospace;font-size:44px;font-weight:800;color:#F3F7FA}
        .bkgauge-lbl{font-size:14px;font-weight:700;padding:5px 16px;border-radius:999px}
        .bkgauge-lbl.buy{background:rgba(0,181,110,.15);color:#00B56E}
        .bkgauge-lbl.sell{background:rgba(224,79,95,.15);color:#E04F5F}
        .bkgauge-lbl.neutral{background:rgba(200,169,107,.15);color:#C8A96B}
        .bkgauge-bar{width:80%;max-width:280px;height:8px;border-radius:999px;background:linear-gradient(90deg,#E04F5F 0%,#C8A96B 50%,#00B56E 100%);position:relative}
        .bkgauge-marker{position:absolute;top:-4px;width:4px;height:16px;background:#F3F7FA;border-radius:2px;transform:translateX(-50%)}
        .bkgauge-note{font-size:11px;color:#8B98A9;text-align:center;max-width:260px}
      `;
      document.head.appendChild(style);
    }

    try {
      const url = apiBase() + '/api/chart?symbol=' + encodeURIComponent(symbol) + '&range=3mo&interval=1d';
      const res = await fetch(url, { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || 'Veri alınamadı');
      const closes = j.candles.map(c => c.c);
      const rsi = computeRSI(closes, 14);
      if (rsi === null) throw new Error('Yetersiz veri');
      const info = rsiLabel(rsi);

      container.innerHTML = `
        <div class="bkgauge">
          <div class="bkgauge-val">${rsi.toFixed(1)}</div>
          <div class="bkgauge-lbl ${info.cls}">${info.text}</div>
          <div class="bkgauge-bar"><div class="bkgauge-marker" style="left:${rsi}%"></div></div>
          <div class="bkgauge-note">14 günlük RSI (Göreceli Güç Endeksi) — gerçek kapanış fiyatlarından hesaplanır.</div>
        </div>`;
    } catch (e) {
      container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8B98A9;font-size:13px;text-align:center;padding:20px">Gösterge verisi şu anda alınamıyor.</div>';
    }
  }

  global.BKChart = { render, renderGauge };
})(window);
