/**
 * BK-LIVE.JS v3.0 — BorsaKaynak Canlı Veri Motoru
 * - Tüm sayfalarda: hisse, sektör, endeks, ticker
 * - Hamburger menü tüm sayfalarda
 * - BIST hisseleri + döviz + kripto
 */
(function(w) {
'use strict';

/* ── AUTOMATIC SILENT STORAGE ANTI-CACHE BUSTER ── */
(function autoCleanStorage() {
  try {
    const CURRENT_VER = '2026.07.28.v5';
    if (localStorage.getItem('bk_cache_ver') !== CURRENT_VER) {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('bk_cache_ver', CURRENT_VER);
    }
  } catch(e){}
})();

/* ── Format ── */
const TR2 = new Intl.NumberFormat('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2});
const TR0 = new Intl.NumberFormat('tr-TR', {minimumFractionDigits:0, maximumFractionDigits:0});
function fmt2(v) { return (typeof v==='number'&&!isNaN(v)&&v>0) ? TR2.format(v) : null; }
function fmt0(v) { return (typeof v==='number'&&!isNaN(v)&&v>0) ? TR0.format(v) : null; }
function fmtPct(v) {
  if (typeof v!=='number'||isNaN(v)) return {text:'',cls:''};
  const s = v>=0 ? '▲ +' : '▼ ';
  return {text: s+'%'+Math.abs(v).toFixed(2).replace('.',','), cls: v>=0?'up':'dn'};
}
function mkAbort(ms) {
  const c = new AbortController();
  setTimeout(()=>c.abort(), ms);
  return c.signal;
}

/* ── CORS Proxy listesi ── */
const PROXIES = [
  u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  u => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  u => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  u => `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(u)}`,
  u => `https://proxy.cors.sh/${u}`,
  u => `https://corsproxy.org/?${encodeURIComponent(u)}`,
  u => `https://yacdn.org/proxy/${u}`,
  u => `https://cors-anywhere.herokuapp.com/${u}`,
  u => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
  u => `https://crossorigin.me/${u}`,
  u => `https://cors.sh/${u}`,
  u => `https://corsproxy.dev/?${encodeURIComponent(u)}`,
];

let _bestProxy = null;
let _log = [];

function log(msg) {
  _log.push(new Date().toLocaleTimeString('tr-TR') + ' | ' + msg);
  if (_log.length > 30) _log.shift();
}

async function tryFetch(url, ms, signal) {
  try {
    const r = await fetch(url, {
      signal: signal || mkAbort(ms || 6000),
      cache: 'no-store',
      headers: {'Accept': 'application/json'}
    });
    if (!r.ok) return null;
    return r;
  } catch(e) { return null; }
}

async function proxyFetch(url, ms) {
  ms = ms || 8000;

  // 1) Direkt
  const r0 = await tryFetch(url, 4000);
  if (r0) return r0;

  // 2) En son başarılı proxy
  const ordered = _bestProxy
    ? [_bestProxy, ...PROXIES.filter(p=>p!==_bestProxy)]
    : PROXIES;

  for (const mk of ordered) {
    try {
      const pu = mk(url);
      const rp = await tryFetch(pu, ms);
      if (rp) {
        // allorigins /get endpoint JSON wrapper döner
        if (pu.includes('allorigins.win/get?')) {
          const j = await rp.json();
          const txt = j?.contents;
          if (!txt) continue;
          // Fake response
          return {ok:true, json:()=>Promise.resolve(JSON.parse(txt)), text:()=>Promise.resolve(txt)};
        }
        _bestProxy = mk;
        return rp;
      }
    } catch(e) {}
  }
  throw new Error('Proxy fail: ' + url.slice(0,50));
}

/* ── Hisse Kaynakları ── */
async function yahooV7(syms) {
  const sym = syms.map(s=>s+'.IS').join(',');
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(sym)}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketChange,regularMarketPreviousClose,regularMarketDayHigh,regularMarketDayLow,regularMarketVolume,bid,ask`;
  const r = await proxyFetch(url, 10000);
  const j = await r.json();
  const res = (j?.quoteResponse?.result||[])
    .filter(q=>q.regularMarketPrice>0)
    .map(q=>({
      code:  q.symbol.replace('.IS',''),
      son:   q.regularMarketPrice,
      onceki:q.regularMarketPreviousClose,
      farkP: q.regularMarketChangePercent,
      fark:  q.regularMarketChange,
      yuksek:q.regularMarketDayHigh,
      dusuk: q.regularMarketDayLow,
      adet:  q.regularMarketVolume,
      alis:  q.bid,
      satis: q.ask,
      src:  'YahooV7'
    }));
  if (!res.length) throw new Error('YahooV7 empty');
  return res;
}

async function yahooQ2(syms) {
  const sym = syms.map(s=>s+'.IS').join(',');
  const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(sym)}`;
  const r = await proxyFetch(url, 10000);
  const j = await r.json();
  const res = (j?.quoteResponse?.result||[])
    .filter(q=>q.regularMarketPrice>0)
    .map(q=>({
      code:  q.symbol.replace('.IS',''),
      son:   q.regularMarketPrice,
      onceki:q.regularMarketPreviousClose,
      farkP: q.regularMarketChangePercent,
      fark:  q.regularMarketChange,
      yuksek:q.regularMarketDayHigh,
      dusuk: q.regularMarketDayLow,
      adet:  q.regularMarketVolume,
      src:  'YahooQ2'
    }));
  if (!res.length) throw new Error('YahooQ2 empty');
  return res;
}

async function yahooV8(syms) {
  const results = [];
  const chunks = [];
  for (let i=0; i<syms.length; i+=6) chunks.push(syms.slice(i,i+6));
  for (const chunk of chunks) {
    await Promise.allSettled(chunk.map(async sym=>{
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}.IS?interval=1d&range=1d`;
        const r = await proxyFetch(url, 7000);
        const j = await r.json();
        const m = j?.chart?.result?.[0]?.meta;
        if (m?.regularMarketPrice>0) results.push({
          code: sym, son: m.regularMarketPrice,
          onceki: m.chartPreviousClose||m.previousClose,
          farkP: m.regularMarketPreviousClose>0
            ? (m.regularMarketPrice-m.chartPreviousClose)/m.chartPreviousClose*100
            : null,
          yuksek:m.regularMarketDayHigh, dusuk:m.regularMarketDayLow,
          adet:m.regularMarketVolume, src:'YahooV8'
        });
      } catch(e){}
    }));
  }
  if (!results.length) throw new Error('YahooV8 empty');
  return results;
}

/* ── Döviz + Kripto ── */
async function fetchFX() {
  // Primary check: BorsaKaynak Backend Server /api/fx
  try {
    const apiBase = w.location.protocol === 'file:' ? 'http://localhost:8080' : '';
    const r = await fetch(apiBase + '/api/fx');
    if (r.ok) {
      const data = await r.json();
      if (data && data.USDTRY) return data;
    }
  } catch(e) {}

  const fx = {};
  await Promise.allSettled([
    // Frankfurter — direkt CORS OK
    (async()=>{
      try {
        const r = await tryFetch('https://api.frankfurter.app/latest?from=USD&to=TRY,EUR,GBP', 5000);
        if(!r) return;
        const j = await r.json();
        if(j?.rates?.TRY) {
          fx.USDTRY=j.rates.TRY;
          if(j.rates.EUR) fx.EURTRY=j.rates.TRY/j.rates.EUR;
          if(j.rates.GBP) fx.GBPTRY=j.rates.TRY/j.rates.GBP;
          fx.src='Frankfurter';
        }
      }catch(e){}
    })(),
    // jsdelivr currency-api — direkt CORS OK
    (async()=>{
      try {
        const r = await tryFetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json', 5000);
        if(!r) return;
        const j = await r.json();
        if(j?.usd?.try && !fx.USDTRY) {
          fx.USDTRY=j.usd.try;
          if(j.usd.eur) fx.EURTRY=j.usd.try/j.usd.eur;
          if(j.usd.gbp) fx.GBPTRY=j.usd.try/j.usd.gbp;
          if(!fx.src) fx.src='CurrencyAPI';
        }
      }catch(e){}
    })(),
    // open.er-api — direkt CORS OK
    (async()=>{
      try {
        const r = await tryFetch('https://open.er-api.com/v6/latest/USD', 5000);
        if(!r) return;
        const j = await r.json();
        if(j?.rates?.TRY && !fx.USDTRY) {
          fx.USDTRY=j.rates.TRY;
          if(j.rates.EUR) fx.EURTRY=j.rates.TRY/j.rates.EUR;
          if(j.rates.GBP) fx.GBPTRY=j.rates.TRY/j.rates.GBP;
          if(!fx.src) fx.src='ER-API';
        }
      }catch(e){}
    })(),
    // Yahoo FX + altın + petrol via proxy
    (async()=>{
      try {
        const url='https://query1.finance.yahoo.com/v7/finance/quote?symbols='+
          encodeURIComponent('USDTRY=X,EURTRY=X,GBPTRY=X,GC=F,BZ=F');
        const r = await proxyFetch(url, 7000);
        const j = await r.json();
        (j?.quoteResponse?.result||[]).forEach(q=>{
          const p=q.regularMarketPrice;
          if(!p||p<=0) return;
          if(q.symbol==='USDTRY=X'&&!fx.USDTRY) fx.USDTRY=p;
          if(q.symbol==='EURTRY=X'&&!fx.EURTRY) fx.EURTRY=p;
          if(q.symbol==='GBPTRY=X'&&!fx.GBPTRY) fx.GBPTRY=p;
          if(q.symbol==='GC=F') fx.XAUUSD=p;
          if(q.symbol==='BZ=F') fx.BRENT=p;
        });
        if(fx.USDTRY&&!fx.src) fx.src='YahooFX';
      }catch(e){}
    })(),
    // Binance kripto — direkt CORS OK
    (async()=>{
      try {
        const [b,e] = await Promise.allSettled([
          tryFetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT',5000),
          tryFetch('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT',5000),
        ]);
        if(b.status==='fulfilled'&&b.value) {
          const j=await b.value.json();
          fx.BTCUSDT=parseFloat(j.lastPrice);
          fx.BTCPCT=parseFloat(j.priceChangePercent);
        }
        if(e.status==='fulfilled'&&e.value) {
          const j=await e.value.json();
          fx.ETHUSDT=parseFloat(j.lastPrice);
          fx.ETHPCT=parseFloat(j.priceChangePercent);
        }
      }catch(e){}
    })(),
    // CoinPaprika — kripto yedek
    (async()=>{
      try {
        if(!fx.BTCUSDT) {
          const r=await tryFetch('https://api.coinpaprika.com/v1/tickers/btc-bitcoin?quotes=USD',5000);
          if(r) {const j=await r.json(); fx.BTCUSDT=j?.quotes?.USD?.price; fx.BTCPCT=j?.quotes?.USD?.percent_change_24h;}
        }
      }catch(e){}
    })(),
  ]);

  if(fx.XAUUSD&&fx.USDTRY) fx.GOLDGR=(fx.XAUUSD/31.1035)*fx.USDTRY;
  if(fx.USDTRY&&!fx.EURTRY) fx.EURTRY=fx.USDTRY*1.082;
  if(fx.USDTRY&&!fx.GBPTRY) fx.GBPTRY=fx.USDTRY*1.265;
  return fx;
}

/* ── DOM Güncelleme ── */
function applyTicker(quotes, fx) {
  const qMap={};
  (quotes||[]).forEach(q=>{if(q.code) qMap[q.code]=q;});

  // data-tsym yapısı
  document.querySelectorAll('[data-tsym]').forEach(el=>{
    const sym=el.dataset.tsym;
    const vEl=el.querySelector('.tick-val');
    const cEl=el.querySelector('.tick-chg');
    let val=null, pctVal=null;

    if(sym==='USDTRY'&&fx?.USDTRY) val=fx.USDTRY;
    else if(sym==='EURTRY'&&fx?.EURTRY) val=fx.EURTRY;
    else if(sym==='GBPTRY'&&fx?.GBPTRY) val=fx.GBPTRY;
    else if(sym==='XAUGRAM'&&fx?.GOLDGR) val=fx.GOLDGR;
    else if(sym==='XAUUSD'&&fx?.XAUUSD) val=fx.XAUUSD;
    else if(sym==='BRENT'&&fx?.BRENT) val=fx.BRENT;
    else if(sym==='BTCUSDT'&&fx?.BTCUSDT){val=fx.BTCUSDT;pctVal=fx.BTCPCT;}
    else if(sym==='ETHUSDT'&&fx?.ETHUSDT){val=fx.ETHUSDT;pctVal=fx.ETHPCT;}
    else if(qMap[sym]) {val=qMap[sym].son; pctVal=qMap[sym].farkP;}

    if(val&&val>0){
      if(vEl) vEl.textContent = (sym==='BTCUSDT'||sym==='IXIC'||sym==='SPX'||sym==='XU100') ? TR0.format(val) : TR2.format(val);
    }
    if(typeof pctVal==='number'&&cEl){
      const ch=fmtPct(pctVal);
      cEl.textContent=ch.text;
      cEl.className='tick-chg '+ch.cls;
    }
  });

  // Eski .tk-n/.tk-v yapısı
  const tkMap={
    'USD/TRY':fx?.USDTRY,'EUR/TRY':fx?.EURTRY,'GBP/TRY':fx?.GBPTRY,
    'ALTIN/GR':fx?.GOLDGR,'ALTIN':fx?.GOLDGR,'XAU/USD':fx?.XAUUSD,
    'BRENT':fx?.BRENT,'BTC/USDT':fx?.BTCUSDT,'BTC':fx?.BTCUSDT,'ETH/USDT':fx?.ETHUSDT,
    'BIST 100':qMap['XU100']?.son,'BIST 30':qMap['XU030']?.son,
  };
  document.querySelectorAll('.tk-n').forEach(el=>{
    const val=tkMap[el.textContent.trim()];
    const nxt=el.nextElementSibling;
    if(val&&val>0&&nxt?.classList.contains('tk-v'))
      nxt.textContent=val>10000?TR0.format(val):TR2.format(val);
  });

  // Hamburger mini ticker
  if(fx){
    const hm={'ham-usd':fx.USDTRY,'ham-eur':fx.EURTRY,'ham-altin':fx.GOLDGR,'ham-btc':fx.BTCUSDT};
    const hmc={'ham-bist-chg':qMap['XU100']?.farkP,'ham-btc-chg':fx.BTCPCT};
    Object.entries(hm).forEach(([id,v])=>{
      const el=document.getElementById(id);
      if(el&&v&&v>0) el.textContent=id==='ham-btc'?TR0.format(v):TR2.format(v);
    });
    // BIST 100 değer
    const hb=document.getElementById('ham-bist');
    if(hb&&qMap['XU100']?.son) hb.textContent=TR0.format(qMap['XU100'].son);
    Object.entries(hmc).forEach(([id,v])=>{
      const el=document.getElementById(id);
      if(el&&typeof v==='number'){
        const ch=fmtPct(v);
        el.textContent=ch.text;
        el.className='mob-tick-chg '+ch.cls;
      }
    });
  }
}

function applyHisse(q) {
  if(!q||!(q.son>0)) return;
  const bigp=document.querySelector('.bigp');
  if(bigp) bigp.textContent=TR2.format(q.son);
  const pchgEl=document.querySelector('.pchg');
  if(pchgEl&&typeof q.farkP==='number'){
    const ch=fmtPct(q.farkP);
    const fd=fmt2(q.fark||0);
    pchgEl.textContent=ch.text+(fd?(' · '+(q.fark>=0?'+':'')+fd):'');
    pchgEl.className='pchg '+ch.cls;
  }
  const ptEl=document.querySelector('.ptime');
  if(ptEl) ptEl.textContent=new Date().toLocaleDateString('tr-TR')+' · Canlı';
  const mivs=document.querySelectorAll('.miv');
  if(q.yuksek>0&&mivs[0]) mivs[0].textContent=TR2.format(q.yuksek);
  if(q.dusuk>0&&mivs[1])  mivs[1].textContent=TR2.format(q.dusuk);
  if(q.onceki>0&&mivs[2]) mivs[2].textContent=TR2.format(q.onceki);
  if(q.adet>0&&mivs[3]){
    const h=q.adet*q.son;
    mivs[3].textContent=h>=1e9?TR2.format(h/1e9)+' Mr ₺':h>=1e6?TR2.format(h/1e6)+' M ₺':TR0.format(h)+' ₺';
  }
  // Alış/Satış
  document.querySelectorAll('.stat').forEach(s=>{
    if(s.textContent.includes('Alış')&&q.alis>0){
      const d=s.querySelector('.sd');
      s.textContent=''; if(d)s.appendChild(d); s.append('Alış '+TR2.format(q.alis)+' ₺');
    }
    if(s.textContent.includes('Satış')&&q.satis>0){
      const d=s.querySelector('.sd');
      s.textContent=''; if(d)s.appendChild(d); s.append('Satış '+TR2.format(q.satis)+' ₺');
    }
  });
}

function applySektor(quotes) {
  if(!quotes?.length) return;
  const qMap={};
  quotes.forEach(q=>{if(q.code) qMap[q.code]=q;});

  // Masaüstü tablo
  document.querySelectorAll('.tbl tbody tr').forEach(tr=>{
    const cEl=tr.querySelector('.h-code');
    if(!cEl) return;
    const q=qMap[cEl.textContent.trim()];
    if(!q||!(q.son>0)) return;
    const tds=tr.querySelectorAll('td');
    if(tds[1]) tds[1].textContent=TR2.format(q.son)+' ₺';
    if(tds[2]){
      const ch=fmtPct(q.farkP);
      tds[2].innerHTML=`<span class="badge ${q.farkP>=0?'b-g':'b-r'}">${ch.text}</span>`;
    }
    if(tds[3]&&q.adet>0){
      const h=q.adet*q.son;
      tds[3].textContent=h>=1e9?TR2.format(h/1e9)+' Mr ₺':TR2.format(h/1e6)+' M ₺';
    }
    if(tds[5]&&q.adet>0){
      const h=q.adet*q.son;
      tds[5].textContent=h>=1e9?TR2.format(h/1e9)+' Mr ₺':TR2.format(h/1e6)+' M ₺';
    }
  });

  // Mobil satır listesi
  document.querySelectorAll('.mob-stk-row').forEach(row=>{
    const cEl=row.querySelector('.mob-stk-code');
    if(!cEl) return;
    const q=qMap[cEl.textContent.trim()];
    if(!q||!(q.son>0)) return;
    const prEl=row.querySelector('.mob-stk-price');
    const chEl=row.querySelector('.mob-stk-chg');
    const pyEl=row.querySelector('.mob-stk-piyasa');
    if(prEl) prEl.textContent=TR2.format(q.son)+' ₺';
    if(chEl){const ch=fmtPct(q.farkP);chEl.textContent=ch.text;chEl.className='mob-stk-chg '+ch.cls;}
    if(pyEl&&q.adet>0){const h=q.adet*q.son;pyEl.textContent=h>=1e9?TR2.format(h/1e9)+' Mr ₺':TR2.format(h/1e6)+' M ₺';}
  });

  // Endeks mobil kartları
  document.querySelectorAll('.mob-tbl-card[data-code]').forEach(card=>{
    const q=qMap[card.dataset.code];
    if(!q||!(q.son>0)) return;
    const prEl=card.querySelector('.mtc-price');
    const chEl=card.querySelector('.mtc-chg');
    if(prEl) prEl.textContent=TR2.format(q.son);
    if(chEl){const ch=fmtPct(q.farkP);chEl.textContent=ch.text;chEl.className='mtc-chg '+ch.cls;}
  });
}

function applyPiyasalar(quotes) {
  if(!quotes?.length||!Array.isArray(w.STOCKS)) return;
  const qMap={};
  quotes.forEach(q=>{if(q.code) qMap[q.code]=q;});
  let n=0;
  w.STOCKS.forEach(s=>{
    const q=qMap[s.sembol || s.code];
    if(!q||!(q.son>0)) return;
    s.son=q.son;
    s.farkP=typeof q.farkP==='number'?q.farkP:(q.onceki>0?(q.son-q.onceki)/q.onceki*100:0);
    s.fark=q.fark||(q.son-(q.onceki||q.son));
    if(q.alis>0)   s.alis=q.alis;
    if(q.satis>0)  s.satis=q.satis;
    if(q.yuksek>0) s.yuksek=q.yuksek;
    if(q.dusuk>0)  s.dusuk=q.dusuk;
    if(q.adet>0)   {s.adet=q.adet;s.hacim=q.adet*q.son;}
    n++;
  });
  if(typeof w.refresh==='function') try{w.refresh();}catch(e){}
  return n;
}

/* ── Sembol Tespiti ── */
const FX_SYMS=new Set(['USDTRY','EURTRY','GBPTRY','XAUGRAM','XAUUSD','BRENT','BTCUSDT','ETHUSDT','DAX','SPX','IXIC']);

function getSymbols() {
  const syms=new Set();
  if(w.TV) syms.add(String(w.TV).replace('BIST:','').replace('.IS',''));
  document.querySelectorAll('.h-code,.mob-stk-code,[data-code]').forEach(el=>{
    const s=(el.dataset?.code||el.textContent||'').trim().toUpperCase();
    if(s&&s.length>=3&&s.length<=7&&/^[A-Z0-9]+$/.test(s)) syms.add(s);
  });
  document.querySelectorAll('.mob-tbl-card[data-code]').forEach(el=>syms.add(el.dataset.code.toUpperCase()));
  if(Array.isArray(w.STOCKS)) w.STOCKS.forEach(s=>{if(s.sembol||s.code)syms.add(s.sembol||s.code);});
  return [...syms].filter(s=>!FX_SYMS.has(s)&&s.length>=3&&s.length<=8);
}

/* ── Ana Motor ── */
let _timer=null, _running=false;

async function run() {
  if(_running) return;
  _running=true;
  const t0=Date.now();
  const symbols=getSymbols();
  
  if (!symbols.includes('XU100')) symbols.push('XU100');
  if (!symbols.includes('XU030')) symbols.push('XU030');

  let quotes=[], src='Backend-API';
  let fx = {};
  let backendSuccess = false;

  try {
    const apiBase = window.location.protocol === 'file:' ? 'http://localhost:8080' : '';
    const ts = Date.now();
    const livePromise = fetch(apiBase + '/api/live?symbols=' + encodeURIComponent(symbols.join(',')) + '&_t=' + ts, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }).catch(()=>null);
    const fxPromise = fetch(apiBase + '/api/fx?_t=' + ts, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }).catch(()=>null);
    
    const [liveRes, fxRes] = await Promise.all([livePromise, fxPromise]);
    
    if (liveRes && liveRes.ok) {
      try {
        const text = await liveRes.text();
        if (text && !text.trim().startsWith('<') && !text.trim().startsWith('const')) {
          const liveData = JSON.parse(text);
          if (Array.isArray(liveData) && liveData.length > 0) {
            quotes = liveData;
            backendSuccess = true;
          }
        }
      } catch(e) {}
    }
    if (fxRes && fxRes.ok) {
      try {
        const text = await fxRes.text();
        if (text && !text.trim().startsWith('<') && !text.trim().startsWith('const')) {
          fx = JSON.parse(text);
        }
      } catch(e) {}
    }
  } catch (e) {
    console.log('[BK] Backend endpoints unavailable, using client-side fallback:', e.message);
  }

  if (!backendSuccess) {
    src = 'Proxy-Fallback';
    const fxPromise=fetchFX();

    if(symbols.length>0) {
      try {
        const r=await yahooV7(symbols);
        if(r.length>=Math.min(3,symbols.length)){quotes=r;src='YahooV7';}
      } catch(e){log('V7 fail: '+e.message);}

      if(quotes.length<Math.min(2,symbols.length)) {
        try {
          const r=await yahooQ2(symbols);
          if(r.length>=Math.min(2,symbols.length)){quotes=r;src='YahooQ2';}
        } catch(e){log('Q2 fail: '+e.message);}
      }

      if(quotes.length<Math.min(2,symbols.length)) {
        try {
          const r=await yahooV8(symbols);
          if(r.length>0){quotes=r;src='YahooV8';}
        } catch(e){log('V8 fail: '+e.message);}
      }
    }

    let xu100q=null;
    try {
      const r=await proxyFetch('https://query1.finance.yahoo.com/v7/finance/quote?symbols=XU100.IS,XU030.IS',6000);
      const j=await r.json();
      (j?.quoteResponse?.result||[]).forEach(q=>{
        const p=q.regularMarketPrice;
        if(!p||p<=0) return;
        const code=q.symbol.replace('.IS','');
        const item={code,son:p,farkP:q.regularMarketChangePercent,src:'Yahoo'};
        quotes.push(item);
        if(code==='XU100') xu100q=item;
      });
    } catch(e){log('XU100 fail: '+e.message);}

    fx=await fxPromise.catch(()=>({}));
  }

  _running=false;

  const isHisse=!!w.TV;
  const isSektor=!!document.querySelector('.mob-stk-row,.tbl tbody .h-code');
  const isPiyasa=Array.isArray(w.STOCKS);

  applyTicker(quotes, fx);
  if(isHisse&&quotes.length){
    const code=String(w.TV||'').replace('BIST:','');
    applyHisse(quotes.find(q=>q.code===code));
  }
  if(isSektor) applySektor(quotes);
  if(isPiyasa) applyPiyasalar(quotes);

  const msg=`${new Date().toLocaleTimeString('tr-TR')} | ${src||'?'} | ${quotes.length}/${symbols.length} hisse | USD:${fx.USDTRY?.toFixed(2)||'?'} | ${Date.now()-t0}ms`;
  log(msg); console.log('[BK]',msg);

  const ls=document.getElementById('liveStatus');
  if(ls&&quotes.length>0){
    ls.innerHTML=`<span class="live-dot"></span> CANLI · ${quotes.length} hisse · ${new Date().toLocaleTimeString('tr-TR')}`;
    ls.className='live-status ok';
  }

  if(_timer) clearTimeout(_timer);
  _timer=setTimeout(run, 10000);
}

/* ── Hamburger Menü ── */
function initHamburger() {
  const mobNav=document.getElementById('mobNav')||document.querySelector('.mob-nav');
  const hamBtn=document.querySelector('.ham-btn');
  const closeBtn=document.querySelector('.mob-nav-close');
  if(!mobNav||!hamBtn) return;

  let ov=document.getElementById('bk-nav-ov');
  if(!ov){
    ov=document.createElement('div');
    ov.id='bk-nav-ov';
    ov.style.cssText='position:fixed;inset:0;z-index:997;background:rgba(0,0,0,.5);opacity:0;pointer-events:none;transition:opacity .25s;backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)';
    document.body.appendChild(ov);
  }

  function open(e){
    if(e) e.stopPropagation();
    mobNav.classList.add('open');
    hamBtn.classList.add('open');
    hamBtn.setAttribute('aria-expanded','true');
    ov.style.opacity='1';
    ov.style.pointerEvents='auto';
    document.body.style.overflow='hidden';
  }
  function close(){
    mobNav.classList.remove('open');
    hamBtn.classList.remove('open');
    hamBtn.setAttribute('aria-expanded','false');
    ov.style.opacity='0';
    ov.style.pointerEvents='none';
    document.body.style.overflow='';
  }

  if(hamBtn._bk) hamBtn.removeEventListener('click',hamBtn._bk);
  hamBtn._bk=open; hamBtn.addEventListener('click',open);

  if(closeBtn){
    if(closeBtn._bk) closeBtn.removeEventListener('click',closeBtn._bk);
    closeBtn._bk=close; closeBtn.addEventListener('click',close);
  }
  if(ov._bk) ov.removeEventListener('click',ov._bk);
  ov._bk=close; ov.addEventListener('click',close);

  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  mobNav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setTimeout(close,80)));
}

function applyConfig(cfg) {
  if (!cfg) return;
  
  if (cfg.siteTitle) {
    document.title = cfg.siteTitle;
  }
  
  // Announcement banner
  if (cfg.announcement) {
    let banner = document.getElementById('bk-announcement-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'bk-announcement-banner';
      banner.style.cssText = 'background:#00B56E;color:#08121E;font-size:12px;font-weight:700;text-align:center;padding:6px 12px;display:flex;align-items:center;justify-content:center;gap:6px;position:relative;z-index:999;font-family:sans-serif';
      
      const dot = document.createElement('span');
      dot.style.cssText = 'width:6px;height:6px;background:#08121E;border-radius:50%;display:inline-block;animation:pulse 1s infinite alternate';
      banner.appendChild(dot);
      
      const style = document.createElement('style');
      style.innerHTML = '@keyframes pulse{from{opacity:0.3}to{opacity:1}}';
      document.head.appendChild(style);
      
      const text = document.createElement('span');
      text.id = 'bk-announcement-text';
      banner.appendChild(text);
      
      const ticker = document.querySelector('.ticker');
      if (ticker) {
        ticker.parentNode.insertBefore(banner, ticker.nextSibling);
      } else {
        document.body.insertBefore(banner, document.body.firstChild);
      }
    }
    document.getElementById('bk-announcement-text').textContent = cfg.announcement;
  } else {
    document.getElementById('bk-announcement-banner')?.remove();
  }

  // Footer / contact details
  const contacts = document.querySelectorAll('.foot-contact .ic');
  if (contacts.length >= 2) {
    if (cfg.email) {
      const emailSvg = contacts[0].querySelector('svg');
      contacts[0].innerHTML = '';
      if (emailSvg) contacts[0].appendChild(emailSvg);
      contacts[0].append(' ' + cfg.email);
    }
    if (cfg.phone) {
      const phoneSvg = contacts[1].querySelector('svg');
      contacts[1].innerHTML = '';
      if (phoneSvg) contacts[1].appendChild(phoneSvg);
      contacts[1].append(' ' + cfg.phone);
    }
  }
  const copyrightEl = document.querySelector('.foot-bottom span');
  if (copyrightEl && cfg.copyright) {
    copyrightEl.textContent = cfg.copyright;
  }

  // Home page Hero overrides (new fields!)
  if (cfg.homeHeroTitle) {
    const titleEl = document.querySelector('.slide.active .slide-title') || document.querySelector('.slider .slide-title');
    if (titleEl) titleEl.textContent = cfg.homeHeroTitle;
  }
  if (cfg.homeHeroText) {
    const descEl = document.querySelector('.slide.active .slide-desc') || document.querySelector('.slider .slide-desc');
    if (descEl) descEl.textContent = cfg.homeHeroText;
  }
  if (cfg.homeHeroLink) {
    const ctaEl = document.querySelector('.slide.active .slide-cta') || document.querySelector('.slider .slide-cta');
    if (ctaEl) {
      ctaEl.onclick = function() { window.location.href = cfg.homeHeroLink; };
    }
  }

  // About page override
  const aboutTextEl = document.getElementById('about-page-text') || document.querySelector('.about-content p');
  if (aboutTextEl && cfg.aboutText) {
    aboutTextEl.textContent = cfg.aboutText;
  }
  
  // Address override
  const addrEl = document.getElementById('office-address-val');
  if (addrEl && cfg.contactAddress) {
    addrEl.textContent = cfg.contactAddress;
  }
}

async function loadConfig() {
  try {
    const apiBase = window.location.protocol === 'file:' ? 'http://localhost:8080' : '';
    const res = await fetch(apiBase + '/api/admin/config');
    if (res.ok) {
      const config = await res.json();
      applyConfig(config);
    }
  } catch(e) {
    console.log('[BK] Live config fetch failed, trying local fallback...');
  }
}

function initRadarMenu() {
  const isRadarActive = window.location.pathname.includes('radar.html');
  const isStatusActive = window.location.pathname.includes('status.html');
  const isBlogActive = window.location.pathname.includes('blog.html');
  const isEnstrumanlarActive = window.location.pathname.includes('bist-tum-enstrumanlar.html');
  
  const ghMenu = document.querySelector('.gh-menu');
  if (ghMenu) {
    if (!ghMenu.querySelector('a[href="radar.html"]')) {
      const a = document.createElement('a');
      a.href = 'radar.html';
      a.textContent = 'Piyasa Akışı';
      if (isRadarActive) a.className = 'active';
      
      const piyasalarLink = ghMenu.querySelector('a[href="piyasalar.html"]');
      if (piyasalarLink) {
        piyasalarLink.parentNode.insertBefore(a, piyasalarLink.nextSibling);
      } else {
        ghMenu.appendChild(a);
      }
    }
    if (!ghMenu.querySelector('a[href="blog.html"]')) {
      const a = document.createElement('a');
      a.href = 'blog.html';
      a.textContent = 'Blog';
      if (isBlogActive) a.className = 'active';
      ghMenu.appendChild(a);
    }
    if (!ghMenu.querySelector('a[href="status.html"]')) {
      const a = document.createElement('a');
      a.href = 'status.html';
      a.style.display = 'inline-flex';
      a.style.alignItems = 'center';
      a.style.gap = '4px';
      a.innerHTML = `<svg fill="none" height="14" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" width="14" style="vertical-align:middle;"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg> Veri Sağlığı`;
      if (isStatusActive) a.className = 'active';
      ghMenu.appendChild(a);
    }
  }

  const navLinks = document.querySelector('.nav-links');
  if (navLinks) {
    if (!navLinks.querySelector('a[href="radar.html"]')) {
      const a = document.createElement('a');
      a.href = 'radar.html';
      a.textContent = 'Piyasa Akışı';
      if (isRadarActive) a.className = 'active';
      
      const piyasalarLink = navLinks.querySelector('a[href="piyasalar.html"]');
      if (piyasalarLink) {
        piyasalarLink.parentNode.insertBefore(a, piyasalarLink.nextSibling);
      } else {
        navLinks.appendChild(a);
      }
    }
    if (!navLinks.querySelector('a[href="blog.html"]')) {
      const a = document.createElement('a');
      a.href = 'blog.html';
      a.textContent = 'Blog';
      if (isBlogActive) a.className = 'active';
      navLinks.appendChild(a);
    }
    if (!navLinks.querySelector('a[href="status.html"]')) {
      const a = document.createElement('a');
      a.href = 'status.html';
      a.innerHTML = `<svg fill="none" height="12" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" width="12" style="vertical-align:middle;margin-right:2px;"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg> Veri Sağlığı`;
      if (isStatusActive) a.className = 'active';
      navLinks.appendChild(a);
    }
  }

  const mobMenu = document.getElementById('mobNav')?.querySelector('.mob-menu') || document.querySelector('.mob-menu') || document.querySelector('.gh-menu');
  if (mobMenu) {
    if (!mobMenu.querySelector('a[href="radar.html"]')) {
      const a = document.createElement('a');
      a.href = 'radar.html';
      a.textContent = 'Piyasa Akışı';
      if (isRadarActive) a.className = 'active';
      
      const piyasalarLink = mobMenu.querySelector('a[href="piyasalar.html"]');
      if (piyasalarLink) {
        piyasalarLink.parentNode.insertBefore(a, piyasalarLink.nextSibling);
      } else {
        mobMenu.appendChild(a);
      }
    }
    if (!mobMenu.querySelector('a[href="status.html"]')) {
      const a = document.createElement('a');
      a.href = 'status.html';
      a.textContent = 'Veri Sağlığı';
      if (isStatusActive) a.className = 'active';
      mobMenu.appendChild(a);
    }
  }
}

/* ── Başlat ── */
function init(){
  loadConfig();
  initHamburger();
  initRadarMenu();
  setTimeout(run, 500);
}

if(document.readyState==='loading')
  document.addEventListener('DOMContentLoaded',init);
else
  init();

w.BKLive={refresh:run, status:()=>_log.forEach(l=>console.log(l)), version:'3.0'};

})(window);
