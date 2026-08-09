const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const fintablesLive = require('./fintables-live'); // Gerçek veri motoru (Fintables)
const tvMovers = require('./tradingview-movers'); // TradingView piyasa hareketleri (market movers) motoru

const PORT = process.env.PORT || process.env.PASSENGER_PORT || 8080;
const PUBLIC_DIR = __dirname; // Serve from current directory

// Cache object to store API responses and avoid rate limiting
const cache = {
  stocks: {},   // symbol -> { data, timestamp }
  fx: null,     // { data, timestamp }
};
const CACHE_TTL = 5 * 1000; // 5 seconds Cache Time-To-Live for real-time live data

// List of major BIST stocks we track for calculations
const BIST_SYMBOLS = [
  "A1CAP",
  "A1YEN",
  "AAGYO",
  "ACSEL",
  "ADEL",
  "ADESE",
  "ADGYO",
  "AEFES",
  "AFYON",
  "AGESA",
  "AGHOL",
  "AGROT",
  "AGYO",
  "AHGAZ",
  "AHSGY",
  "AKBNK",
  "AKCNS",
  "AKENR",
  "AKFGY",
  "AKFIS",
  "AKFYE",
  "AKGRT",
  "AKHAN",
  "AKMGY",
  "AKSA",
  "AKSEN",
  "AKSGY",
  "AKSUE",
  "AKYHO",
  "ALARK",
  "ALBRK",
  "ALBTN",
  "ALCAR",
  "ALCTL",
  "ALFAS",
  "ALGYO",
  "ALKA",
  "ALKIM",
  "ALKLC",
  "ALMAD",
  "ALTNY",
  "ALVES",
  "ANELE",
  "ANGEN",
  "ANHYT",
  "ANSGR",
  "ARASE",
  "ARCLK",
  "ARDYZ",
  "ARENA",
  "ARFYE",
  "ARMGD",
  "ARSAN",
  "ARTMS",
  "ARZUM",
  "ASELS",
  "ASGYO",
  "ASTOR",
  "ASUZU",
  "ATAGY",
  "ATAKP",
  "ATATP",
  "ATATR",
  "ATEKS",
  "ATLAS",
  "ATSYH",
  "AVGYO",
  "AVHOL",
  "AVOD",
  "AVPGY",
  "AVTUR",
  "AYCES",
  "AYDEM",
  "AYEN",
  "AYES",
  "AYGAZ",
  "AZTEK",
  "BAGFS",
  "BAHKM",
  "BAKAB",
  "BALAT",
  "BALSU",
  "BANVT",
  "BARMA",
  "BASCM",
  "BASGZ",
  "BAYRK",
  "BEGYO",
  "BERA",
  "BESLR",
  "BESTE",
  "BETAE",
  "BEYAZ",
  "BFREN",
  "BIENY",
  "BIGCH",
  "BIGEN",
  "BIGTK",
  "BIMAS",
  "BINBN",
  "BINHO",
  "BIOEN",
  "BIZIM",
  "BJKAS",
  "BLCYT",
  "BLUME",
  "BMSCH",
  "BMSTL",
  "BNTAS",
  "BOBET",
  "BORLS",
  "BORSK",
  "BOSSA",
  "BRISA",
  "BRKO",
  "BRKSN",
  "BRKVY",
  "BRLSM",
  "BRMEN",
  "BRSAN",
  "BRYAT",
  "BSOKE",
  "BTCIM",
  "BUCIM",
  "BULGS",
  "BURCE",
  "BURVA",
  "BVSAN",
  "BYDNR",
  "CANTE",
  "CASA",
  "CATES",
  "CCOLA",
  "CELHA",
  "CEMAS",
  "CEMTS",
  "CEMZY",
  "CEOEM",
  "CGCAM",
  "CIMSA",
  "CLEBI",
  "CMBTN",
  "CMENT",
  "CONSE",
  "COSMO",
  "CRDFA",
  "CRFSA",
  "CUSAN",
  "CVKMD",
  "CWENE",
  "DAGHL",
  "DAGI",
  "DAPGM",
  "DARDL",
  "DCTTR",
  "DENGE",
  "DERHL",
  "DERIM",
  "DESA",
  "DESPC",
  "DEVA",
  "DGATE",
  "DGGYO",
  "DGNMO",
  "DIRIT",
  "DITAS",
  "DMRGD",
  "DMSAS",
  "DNISI",
  "DOAS",
  "DOBUR",
  "DOCO",
  "DOFER",
  "DOFRB",
  "DOGUB",
  "DOHOL",
  "DOKTA",
  "DSTKF",
  "DUNYH",
  "DURDO",
  "DURKN",
  "DYOBY",
  "DZGYO",
  "EBEBK",
  "ECILC",
  "ECOGR",
  "ECZYT",
  "EDATA",
  "EDIP",
  "EFOR",
  "EFORC",
  "EGEEN",
  "EGEGY",
  "EGEPO",
  "EGGUB",
  "EGPRO",
  "EGSER",
  "EKDMR",
  "EKGYO",
  "EKIM",
  "EKIZ",
  "EKOS",
  "EKSUN",
  "ELITE",
  "EMKEL",
  "EMNIS",
  "EMPAE",
  "ENDAE",
  "ENERY",
  "ENJSA",
  "ENKAI",
  "ENPRA",
  "ENSRI",
  "ENTRA",
  "EPLAS",
  "ERBOS",
  "ERCB",
  "EREGL",
  "ERSU",
  "ESCAR",
  "ESCOM",
  "ESEN",
  "ETILR",
  "ETYAT",
  "EUHOL",
  "EUKYO",
  "EUPWR",
  "EUREN",
  "EUYO",
  "EYGYO",
  "FADE",
  "FENER",
  "FLAP",
  "FMIZP",
  "FONET",
  "FORMT",
  "FORTE",
  "FRIGO",
  "FRMPL",
  "FROTO",
  "FZLGY",
  "GARAN",
  "GARFA",
  "GATEG",
  "GEDIK",
  "GEDZA",
  "GENIL",
  "GENKM",
  "GENTS",
  "GEREL",
  "GESAN",
  "GIPTA",
  "GLBMD",
  "GLCVY",
  "GLRMK",
  "GLRYH",
  "GLYHO",
  "GMTAS",
  "GOKNR",
  "GOLDA",
  "GOLTS",
  "GOODY",
  "GOZDE",
  "GRNYO",
  "GRSEL",
  "GRTHO",
  "GRTRK",
  "GSDDE",
  "GSDHO",
  "GSRAY",
  "GUBRF",
  "GUNDG",
  "GWIND",
  "GZNMI",
  "HALKB",
  "HATEK",
  "HATSN",
  "HDFGS",
  "HEDEF",
  "HEKTS",
  "HKTM",
  "HLGYO",
  "HOROZ",
  "HRKET",
  "HTTBT",
  "HUBVC",
  "HUNER",
  "HURGZ",
  "ICBCT",
  "ICUGS",
  "IDEAS",
  "IDGYO",
  "IEYHO",
  "IHAAS",
  "IHEVA",
  "IHGZT",
  "IHLAS",
  "IHLGM",
  "IHYAY",
  "IMASM",
  "INDES",
  "INFO",
  "INGRM",
  "INTEK",
  "INTEM",
  "INVEO",
  "INVES",
  "IPEKE",
  "ISATR",
  "ISBIR",
  "ISBTR",
  "ISCTR",
  "ISDMR",
  "ISFIN",
  "ISGSY",
  "ISGYO",
  "ISKPL",
  "ISKUR",
  "ISMEN",
  "ISSEN",
  "ISVEA",
  "ISYAT",
  "ITTFH",
  "IZENR",
  "IZFAS",
  "IZINV",
  "IZMDC",
  "JANTS",
  "KAPLM",
  "KARCL",
  "KAREL",
  "KARSN",
  "KARTN",
  "KARYE",
  "KATMR",
  "KAYSE",
  "KBORU",
  "KCAER",
  "KCHOL",
  "KENT",
  "KERVN",
  "KERVT",
  "KFEIN",
  "KGYO",
  "KIMMR",
  "KLGYO",
  "KLKIM",
  "KLMSN",
  "KLNMA",
  "KLRHO",
  "KLSER",
  "KLSYN",
  "KLYPV",
  "KMPUR",
  "KNFRT",
  "KOCMT",
  "KONKA",
  "KONTR",
  "KONYA",
  "KOPOL",
  "KORDS",
  "KOTON",
  "KOZAA",
  "KOZAL",
  "KRDMA",
  "KRDMB",
  "KRDMD",
  "KRGYO",
  "KRONT",
  "KRPLS",
  "KRSTL",
  "KRTEK",
  "KRVGD",
  "KSTUR",
  "KTLEV",
  "KTSKR",
  "KUTPO",
  "KUVVA",
  "KUYAS",
  "KZBGY",
  "KZGYO",
  "LIDER",
  "LIDFA",
  "LILAK",
  "LINK",
  "LKMNH",
  "LMKDC",
  "LOGO",
  "LRSHO",
  "LUKSK",
  "LXGYO",
  "LYDHO",
  "LYDYE",
  "MAALT",
  "MACKO",
  "MAGEN",
  "MAKIM",
  "MAKTK",
  "MANAS",
  "MARBL",
  "MARKA",
  "MARMR",
  "MARTI",
  "MASFN",
  "MAVI",
  "MCARD",
  "MEDTR",
  "MEGAP",
  "MEGMT",
  "MEKAG",
  "MEPET",
  "MERCN",
  "MERIT",
  "MERKO",
  "METEN",
  "METRO",
  "METUR",
  "MEYSU",
  "MGROS",
  "MHRGY",
  "MIATK",
  "MIPAZ",
  "MMCAS",
  "MNDRS",
  "MNDTR",
  "MOBTL",
  "MOGAN",
  "MOPAS",
  "MPARK",
  "MRGYO",
  "MRSHL",
  "MSGYO",
  "MTRKS",
  "MTRYO",
  "MZHLD",
  "NATEN",
  "NETAS",
  "NETCD",
  "NIBAS",
  "NTGAZ",
  "NTHOL",
  "NUGYO",
  "NUHCM",
  "OBAMS",
  "OBASE",
  "ODAS",
  "ODINE",
  "OFSYM",
  "ONCSM",
  "ONRYT",
  "ORCAY",
  "ORGE",
  "ORMA",
  "ORZAX",
  "OSMEN",
  "OSTIM",
  "OTKAR",
  "OTTO",
  "OYAKC",
  "OYAYO",
  "OYLUM",
  "OYYAT",
  "OZATD",
  "OZGYO",
  "OZKGY",
  "OZRDN",
  "OZSUB",
  "OZYSR",
  "PAGYO",
  "PAHOL",
  "PAMEL",
  "PAPIL",
  "PARSN",
  "PASEU",
  "PATEK",
  "PCILT",
  "PEHOL",
  "PEKGY",
  "PENGD",
  "PENTA",
  "PETKM",
  "PETUN",
  "PGSUS",
  "PINSU",
  "PKART",
  "PKENT",
  "PLTUR",
  "PNLSN",
  "PNSUT",
  "POLHO",
  "POLTK",
  "PRDGS",
  "PRKAB",
  "PRKME",
  "PRZMA",
  "PSDTC",
  "PSGYO",
  "QNBFB",
  "QNBFK",
  "QNBFL",
  "QNBTR",
  "QUAGR",
  "QUICK",
  "RALYH",
  "RAYSG",
  "REEDR",
  "RGYAS",
  "RNPOL",
  "RODRG",
  "ROYAL",
  "RTALB",
  "RUBNS",
  "RUZYE",
  "RYGYO",
  "RYSAS",
  "SAFKR",
  "SAHOL",
  "SAMAT",
  "SANEL",
  "SANFM",
  "SANKO",
  "SARAE",
  "SARKY",
  "SASA",
  "SAYAS",
  "SDTTR",
  "SEGMN",
  "SEGYO",
  "SEKFK",
  "SEKUR",
  "SELEC",
  "SELGD",
  "SELVA",
  "SERNT",
  "SEYKM",
  "SILVR",
  "SISE",
  "SKBNK",
  "SKTAS",
  "SKYLP",
  "SKYMD",
  "SMART",
  "SMRTG",
  "SMRVA",
  "SNGYO",
  "SNICA",
  "SNKRN",
  "SNPAM",
  "SODSN",
  "SOHOE",
  "SOKE",
  "SOKM",
  "SONME",
  "SRVGY",
  "SSAAT",
  "SUMAS",
  "SUNTK",
  "SURGY",
  "SUWEN",
  "SVGYO",
  "TABGD",
  "TARKM",
  "TATEN",
  "TATGD",
  "TAVHL",
  "TBORG",
  "TCELL",
  "TCKRC",
  "TDGYO",
  "TEHOL",
  "TEKTU",
  "TERA",
  "TETMT",
  "TEZOL",
  "TGSAS",
  "THYAO",
  "TKFEN",
  "TKNSA",
  "TLMAN",
  "TMPOL",
  "TMSN",
  "TNZTP",
  "TOASO",
  "TRALT",
  "TRCAS",
  "TRENJ",
  "TRGYO",
  "TRHOL",
  "TRILC",
  "TRMET",
  "TSGYO",
  "TSKB",
  "TSPOR",
  "TTKOM",
  "TTRAK",
  "TUCLK",
  "TUKAS",
  "TUPRS",
  "TUREX",
  "TURGG",
  "TURSG",
  "UCAYM",
  "UFUK",
  "ULAS",
  "ULKER",
  "ULUFA",
  "ULUSE",
  "ULUUN",
  "UMPAS",
  "UNLU",
  "USAK",
  "UZERB",
  "VAKBN",
  "VAKFA",
  "VAKFN",
  "VAKKO",
  "VANGD",
  "VBTYZ",
  "VERTU",
  "VERUS",
  "VESBE",
  "VESTL",
  "VKFYO",
  "VKGYO",
  "VKING",
  "VRGYO",
  "VSNMD",
  "YAPRK",
  "YATAS",
  "YAYLA",
  "YBTAS",
  "YEOTK",
  "YESIL",
  "YGGYO",
  "YGYO",
  "YIGIT",
  "YKBNK",
  "YKSLN",
  "YONGA",
  "YUNSA",
  "YYAPI",
  "YYLGD",
  "ZEDUR",
  "ZERGY",
  "ZGYO",
  "ZOREN",
  "ZRGYO"
];

// Native helper to fetch URL on the server side
async function serverFetch(targetUrl, headers = {}) {
  const res = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...headers
    }
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res;
}

// Handler for BIST stocks from official API (supports batch fetching)

function roundVal(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return 0;
  return Number(Math.round(num + 'e' + decimals) + 'e-' + decimals);
}

async function getBatchYahooQuotes(symbols) {
  if (!symbols || !symbols.length) return [];
  const results = [];
  const chunks = [];
  const chunkSize = 40;
  for (let i = 0; i < symbols.length; i += chunkSize) {
    chunks.push(symbols.slice(i, i + chunkSize));
  }

  await Promise.allSettled(chunks.map(async chunk => {
    try {
      const ySyms = chunk.map(s => (s.endsWith('.IS') || s.includes('.')) ? s : s + '.IS').join(',');
      const targetUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ySyms)}`;
      const res = await serverFetch(targetUrl);
      const j = await res.json();
      const items = j?.quoteResponse?.result || [];
      items.forEach(q => {
        const rawCode = (q.symbol || '').replace(/\.IS$/i, '').toUpperCase();
        if (rawCode && q.regularMarketPrice > 0) {
          const prev = q.regularMarketPreviousClose || q.regularMarketPrice;
          const fark = q.regularMarketChange || (q.regularMarketPrice - prev);
          const farkP = q.regularMarketChangePercent || (prev > 0 ? (fark / prev * 100) : 0);
          const quote = {
            code: rawCode,
            son: q.regularMarketPrice,
            onceki: prev,
            fark: roundVal(fark, 3),
            farkP: roundVal(farkP, 2),
            yuksek: q.regularMarketDayHigh || q.regularMarketPrice,
            dusuk: q.regularMarketDayLow || q.regularMarketPrice,
            adet: q.regularMarketVolume || 0,
            src: 'Yahoo-Batch'
          };
          cache.stocks[rawCode] = { data: quote, timestamp: Date.now() };
          results.push(quote);
        }
      });
    } catch (e) {
      await Promise.allSettled(chunk.map(async s => {
        const single = await getYahooQuote(s);
        if (single) results.push(single);
      }));
    }
  }));

  return results;
}


// Handler for BIST stocks directly from TradingView Scanner API
async function getTradingViewBistQuotes() {
  try {
    const postData = JSON.stringify({
      filter: [{ left: 'type', operation: 'in_range', right: ['stock', 'dr', 'fund'] }],
      options: { lang: 'tr' },
      markets: ['turkey'],
      symbols: { query: { types: [] } },
      columns: ['name', 'description', 'close', 'change', 'change_abs', 'volume', 'high', 'low'],
      sort: { sortBy: 'change', sortOrder: 'desc' },
      range: [0, 1000]
    });

    const res = await fetch('https://scanner.tradingview.com/turkey/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: postData
    });

    if (!res.ok) return [];
    const j = await res.json();
    const items = j?.data || [];
    const results = [];

    items.forEach(item => {
      const d = item.d || [];
      const rawCode = (d[0] || '').replace(/^BIST:/i, '').strip ? (d[0] || '').replace(/^BIST:/i, '').strip() : (d[0] || '').replace(/^BIST:/i, '').trim();
      const price = d[2];
      const chgP = d[3];
      const chgAbs = d[4];
      const vol = d[5];
      const high = d[6];
      const low = d[7];

      if (rawCode && price > 0) {
        const quote = {
          code: rawCode,
          son: roundVal(price, 3),
          fark: roundVal(chgAbs, 3),
          farkP: roundVal(chgP, 2),
          yuksek: (typeof high === 'number' && high > 0) ? roundVal(high, 3) : roundVal(price, 3),
          dusuk: (typeof low === 'number' && low > 0) ? roundVal(low, 3) : roundVal(price, 3),
          adet: vol || 0,
          src: 'TradingView-Scanner'
        };
        cache.stocks[rawCode] = { data: quote, timestamp: Date.now() };
        results.push(quote);
      }
    });

    return results;
  } catch (e) {
    return [];
  }
}


// Handler for BIST stocks directly from Forinvest & Bigpara Live Stream API
async function getForinvestLiveQuotes() {
  try {
    const targetUrl = 'https://bigpara.hurriyet.com.tr/api/v1/hisse/list';
    const res = await serverFetch(targetUrl, {
      'Accept': 'application/json, text/plain, */*',
      'Referer': 'https://bigpara.hurriyet.com.tr/canli-borsa/'
    });
    const j = await res.json();
    const items = j?.data || j?.data?.hisseList || j || [];
    const results = [];

    if (Array.isArray(items)) {
      items.forEach(item => {
        const rawCode = (item.kod || item.symbol || item.k || '').toUpperCase().trim();
        const price = parseFloat(item.fiyat || item.last || item.s || 0);
        const chgP = parseFloat(item.yuzdeDeGISIM || item.changeRatio || item.y || 0);
        const chgAbs = parseFloat(item.degisim || item.change || item.d || 0);
        const vol = parseFloat(item.hacimLot || item.volume || item.h || 0);

        if (rawCode && price > 0) {
          const quote = {
            code: rawCode,
            son: roundVal(price, 3),
            fark: roundVal(chgAbs, 3),
            farkP: roundVal(chgP, 2),
            adet: vol || 0,
            src: 'Forinvest-Bigpara'
          };
          cache.stocks[rawCode] = { data: quote, timestamp: Date.now() };
          results.push(quote);
        }
      });
    }

    return results;
  } catch (e) {
    return [];
  }
}

async function getLiveQuotesFromOfficial(symbols) {
  const bistStocks = symbols.filter(s => !['XU100', 'XU030', 'SPX', 'IXIC', 'NDX', 'FTSE', 'DAX', 'USDTRY=X', 'EURTRY=X', 'GBPTRY=X'].includes(s));
  const otherSymbols = symbols.filter(s => ['XU100', 'XU030', 'SPX', 'IXIC', 'NDX', 'FTSE', 'DAX'].includes(s));

  const quotes = [];
  
  const missingBist = [];
  bistStocks.forEach(s => {
    const cached = cache.stocks[s];
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      quotes.push(cached.data);
    } else {
      missingBist.push(s);
    }
  });

    if (missingBist.length > 0) {
    // Kaynaklari birlestir: ilk gelen kaynak fiyat/degisim icin esas alinir,
    // ama sonraki kaynaklardan yuksek/dusuk/hacim gibi eksik alanlar da
    // (Para Akisi panelinin yon bazli hacim hesabi icin) tamamlanir.
    const byCode = new Map();
    const mergeIn = (list) => {
      (list || []).forEach(q => {
        if (!q || !q.code) return;
        const existing = byCode.get(q.code);
        if (!existing) {
          byCode.set(q.code, { ...q });
        } else {
          if (existing.yuksek === undefined && typeof q.yuksek === 'number') existing.yuksek = q.yuksek;
          if (existing.dusuk === undefined && typeof q.dusuk === 'number') existing.dusuk = q.dusuk;
          if ((!existing.adet || existing.adet === 0) && q.adet) existing.adet = q.adet;
        }
      });
    };
    mergeIn(await getForinvestLiveQuotes());
    mergeIn(await getTradingViewBistQuotes());
    mergeIn(await getBatchYahooQuotes(missingBist));
    byCode.forEach(q => {
      quotes.push(q);
      cache.stocks[q.code] = { data: q, timestamp: Date.now() };
    });
  }

  if (otherSymbols.length > 0) {
    const otherPromises = otherSymbols.map(async s => {
      const q = await getYahooQuote(s);
      if (q) quotes.push(q);
    });
    await Promise.allSettled(otherPromises);
  }

  // Apply data integrity verification filtering if active in config.json
  try {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.verifyDataIntegrity === 'true' || config.verifyDataIntegrity === true) {
        return quotes.filter(q => q && typeof q.son === 'number' && q.son > 0 && Math.abs(q.farkP) < 100);
      }
    }
  } catch(e) {}

  return quotes;
}

// Wrapper to keep compatibility with existing single-fetch calls
async function getBigparaQuote(symbol) {
  const list = await getLiveQuotesFromOfficial([symbol]);
  return list.find(x => x.code === symbol) || null;
}

// Handler for Yahoo Finance indices
async function getYahooQuote(symbol) {
  const cached = cache.stocks[symbol];
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }

  try {
    let ySym = symbol;
    if (symbol === 'XU100') ySym = 'XU100.IS';
    else if (symbol === 'XU030') ySym = 'XU030.IS';
    else if (symbol === 'SPX') ySym = '^GSPC';
    else if (symbol === 'IXIC') ySym = '^IXIC';
    else if (symbol === 'DAX') ySym = '^GDAXI';
    else if (symbol === 'NDX') ySym = '^NDX';
    else if (symbol === 'FTSE') ySym = '^FTSE';
    else if (!symbol.includes('.')) ySym = symbol + '.IS';

    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1d&range=1d`;
    const res = await serverFetch(targetUrl);
    const j = await res.json();
    const m = j?.chart?.result?.[0]?.meta;
    if (m?.regularMarketPrice > 0) {
      const prev = m.chartPreviousClose || m.previousClose || m.regularMarketPreviousClose || m.regularMarketPrice;
      const fark = m.regularMarketPrice - prev;
      const farkP = prev > 0 ? (fark / prev * 100) : 0;
      
      const quote = {
        code: symbol,
        son: m.regularMarketPrice,
        onceki: prev,
        fark: fark,
        farkP: farkP,
        yuksek: m.regularMarketDayHigh || m.regularMarketPrice,
        dusuk: m.regularMarketDayLow || m.regularMarketPrice,
        adet: m.regularMarketVolume || 0,
        src: 'Yahoo-Backend'
      };
      
      cache.stocks[symbol] = { data: quote, timestamp: Date.now() };
      return quote;
    }
  } catch (e) {
    // console.warn(`[Server] Yahoo fetch failed for ${symbol}:`, e.message);
  }
  return null;
}

// Hisse/endeks icin gecmis mum (OHLCV) verisi -- grafik ciziminde kullanilir.
// TradingView'in gomulu widget'i bircok BIST sembolu icin veri bulamiyordu
// ("Sembol sadece TradingView'de bulunabilir" hatasi); bunun yerine ayni
// Yahoo Finance kaynagindan (yukaridaki getYahooQuote ile ayni saglayici)
// gercek gunluk OHLCV serisi cekilip kendi grafigimizde ciziliyor.
const chartCache = new Map(); // "symbol|range|interval" -> { data, timestamp }
const CHART_CACHE_TTL = 5 * 60 * 1000; // 5 dakika

async function getHistoricalChart(symbol, range, interval) {
  range = /^[a-zA-Z0-9]{1,6}$/.test(range) ? range : '6mo';
  interval = /^[a-zA-Z0-9]{1,4}$/.test(interval) ? interval : '1d';
  const cacheKey = symbol + '|' + range + '|' + interval;
  const cached = chartCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CHART_CACHE_TTL)) {
    return cached.data;
  }

  let ySym = symbol;
  if (symbol === 'XU100') ySym = 'XU100.IS';
  else if (symbol === 'XU030') ySym = 'XU030.IS';
  else if (!symbol.includes('.') && !symbol.startsWith('^')) ySym = symbol + '.IS';

  const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=${interval}&range=${range}`;
  const res = await serverFetch(targetUrl);
  const j = await res.json();
  const result = j?.chart?.result?.[0];
  if (!result || !Array.isArray(result.timestamp)) {
    throw new Error('Grafik verisi bulunamadı');
  }

  const ts = result.timestamp;
  const q = result.indicators?.quote?.[0] || {};
  const candles = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i], v = q.volume?.[i];
    if ([o, h, l, c].some(x => typeof x !== 'number' || isNaN(x))) continue;
    candles.push({ t: ts[i] * 1000, o: roundVal(o, 3), h: roundVal(h, 3), l: roundVal(l, 3), c: roundVal(c, 3), v: v || 0 });
  }
  if (!candles.length) throw new Error('Grafik verisi boş');

  const data = { symbol, candles, currency: result.meta?.currency || 'TRY' };
  chartCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

async function getForexData() {
  if (cache.fx && (Date.now() - cache.fx.timestamp < CACHE_TTL)) {
    return cache.fx.data;
  }



  // Backup feed (Frankfurter, Binance, Yahoo)
  const fx = {
    USDTRY: null,
    EURTRY: null,
    GBPTRY: null,
    XAUUSD: null,
    BRENT: null,
    BTCUSDT: null,
    BTCPCT: null,
    ETHUSDT: null,
    ETHPCT: null,
    src: 'Backup-Feed'
  };

  // 1. Fetch Frankfurter for basic FX
  try {
    const res = await serverFetch('https://api.frankfurter.app/latest?from=USD&to=TRY,EUR,GBP,JPY,CHF,CNY');
    const j = await res.json();
    if (j?.rates?.TRY) {
      fx.USDTRY = j.rates.TRY;
      if (j.rates.EUR) fx.EURTRY = j.rates.TRY / j.rates.EUR;
      if (j.rates.GBP) fx.GBPTRY = j.rates.TRY / j.rates.GBP;
      if (j.rates.JPY) fx.JPYTRY = (j.rates.TRY / j.rates.JPY) * 100; // 100 Yen bazinda (site gelenegi)
      if (j.rates.CHF) fx.CHFTRY = j.rates.TRY / j.rates.CHF;
      if (j.rates.CNY) fx.CNYTRY = j.rates.TRY / j.rates.CNY;
    }
  } catch (e) {}

  // 1b. ALTIN icin BIRINCIL kaynak: xaus.com -- ucretsiz, anahtarsiz, "asla
  // uydurma fiyat vermez" ilkesiyle calisan bir API (yanit alamazsa 'stale'
  // isaretli son bilinen gercek fiyati veya durustce 503 dondurur). Daha
  // once GOLDGR sadece Yahoo'ya bagliydi ve Yahoo bazi sunucu IP'lerinde
  // engelleniyordu -- bu, o tek-nokta-hatasini ortadan kaldiriyor.
  try {
    const res = await serverFetch('https://xaus.com/api/v1/spot');
    const j = await res.json();
    if (typeof j.spot_usd_oz === 'number' && j.spot_usd_oz > 0) {
      fx.XAUUSD = j.spot_usd_oz;
      if (typeof j.per_gram_usd === 'number' && j.fx_rates && typeof j.fx_rates.TRY === 'number') {
        fx.GOLDGR = j.per_gram_usd * j.fx_rates.TRY;
      }
      fx.XAUSource = j.stale ? 'xaus.com (stale)' : 'xaus.com';
    }
    // Aynı yanittan gumus (XAG) de geliyor -- ayri bir istek gerekmiyor.
    if (typeof j.silver_usd_oz === 'number' && j.silver_usd_oz > 0) {
      fx.XAGUSD = j.silver_usd_oz;
    }
  } catch (e) {
    console.error('[getForexData] xaus.com altın kaynağı başarısız:', e.message);
  }

  // 2. Fetch Binance for Cryptos
  try {
    const results = await Promise.allSettled([
      serverFetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'),
      serverFetch('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT')
    ]);
    if (results[0].status === 'fulfilled' && results[0].value.ok) {
      const b = await results[0].value.json();
      if (b?.lastPrice) {
        fx.BTCUSDT = parseFloat(b.lastPrice);
        fx.BTCPCT = parseFloat(b.priceChangePercent);
      }
    }
    if (results[1].status === 'fulfilled' && results[1].value.ok) {
      const e = await results[1].value.json();
      if (e?.lastPrice) {
        fx.ETHUSDT = parseFloat(e.lastPrice);
        fx.ETHPCT = parseFloat(e.priceChangePercent);
      }
    }
  } catch (e) {}

  // 3. Fallback Yahoo Finance for Gold & Brent
  try {
    const res = await serverFetch('https://query1.finance.yahoo.com/v7/finance/quote?symbols=USDTRY%3DX%2CEURTRY%3DX%2CGBPTRY%3DX%2CGC%3DF%2CBZ%3DF');
    const j = await res.json();
    (j?.quoteResponse?.result || []).forEach(q => {
      const p = q.regularMarketPrice;
      if (!p || p <= 0) return;
      const pct = typeof q.regularMarketChangePercent === 'number' ? q.regularMarketChangePercent : null;
      const t = q.regularMarketTime ? q.regularMarketTime * 1000 : null; // Yahoo saniye cinsinden verir
      if (q.symbol === 'USDTRY=X') { if (!fx.USDTRY) fx.USDTRY = p; fx.USDPCT = pct; fx.USDTIME = t; }
      if (q.symbol === 'EURTRY=X') { if (!fx.EURTRY) fx.EURTRY = p; fx.EURPCT = pct; fx.EURTIME = t; }
      if (q.symbol === 'GBPTRY=X') { if (!fx.GBPTRY) fx.GBPTRY = p; fx.GBPPCT = pct; fx.GBPTIME = t; }
      if (q.symbol === 'GC=F') { if (!fx.XAUUSD) fx.XAUUSD = p; fx.XAUUSDPCT = pct; fx.XAUTIME = t; }
      if (q.symbol === 'BZ=F') { fx.BRENT = p; fx.BRENTPCT = pct; fx.BRENTTIME = t; }
    });
  } catch (e) {
    console.error('[getForexData] Yahoo XAUUSD/BRENT çekilemedi:', e.message);
  }

  // 3b. BRENT icin ek yedek kaynak (Yahoo basarisiz olursa). NOT: Bu
  // ucu (oilpriceapi.com demo) kendi ortamimdan dogrudan test edemedim
  // (robots.txt engeli) -- calismazsa sessizce atlanir, mevcut "veri yok"
  // durumundan daha kotu bir sey olmaz.
  if (!fx.BRENT) {
    try {
      const res = await serverFetch('https://api.oilpriceapi.com/v1/demo/prices');
      const j = await res.json();
      const p = j?.data?.price || j?.price;
      if (typeof p === 'number' && p > 0) {
        fx.BRENT = p;
        fx.BRENTSource = 'oilpriceapi.com-demo';
      }
    } catch (e) {
      console.error('[getForexData] oilpriceapi.com yedek BRENT kaynağı da başarısız:', e.message);
    }
  }

  // ALTIN/GR (GOLDGR) yuzde degisimi: dogrudan Yahoo'dan gelmiyor (GOLDGR
  // = XAUUSD x USDTRY turetilmis bir deger). Iki bilesenin yuzde
  // degisimlerini topluyoruz -- kucuk gunluk hareketler icin matematiksel
  // olarak makul bir yaklasim (tam kesin degil ama sabit/uydurma sayidan
  // kat kat daha dogru).
  if (typeof fx.XAUUSDPCT === 'number' && typeof fx.USDPCT === 'number') {
    fx.GOLDGRPCT = fx.XAUUSDPCT + fx.USDPCT;
  }

  // Gercek kaynak basarisiz olursa alan null birakilir; sahte/sabit deger
  // dondurulmez.
  if (!fx.BTCUSD && fx.BTCUSDT) fx.BTCUSD = fx.BTCUSDT;
  // Gram altin: gercek ons fiyati (XAUUSD) ve USDTRY'den hesaplanir.
  if (!fx.GOLDGR && fx.XAUUSD && fx.USDTRY) {
    fx.GOLDGR = (fx.XAUUSD / 31.1034768) * fx.USDTRY;
  }

  cache.fx = { data: fx, timestamp: Date.now() };
  return fx;
}

// Custom names for mapping
const STOCK_NAMES = {
  "THYAO": "Türk Hava Yolları", "AKBNK": "Akbank", "GARAN": "Garanti BBVA", "SISE": "Şişecam",
  "ASELS": "Aselsan", "KCHOL": "Koç Holding", "SAHOL": "Sabancı Holding", "YKBNK": "Yapı Kredi Bankası",
  "ASTOR": "Astor Enerji", "KOZAL": "Koza Altın", "PETKM": "Petkim", "TOASO": "Tofaş Oto",
  "EREGL": "Ereğli Demir Çelik", "VESTL": "Vestel", "MGROS": "Migros", "PGSUS": "Pegasus",
  "ARCLK": "Arçelik", "KONTR": "Kontrolmatik", "BIMAS": "BİM Mağazalar", "SASA": "Sasa Polyester",
  "HEKTS": "Hektaş", "TCELL": "Turkcell", "TUPRS": "Tüpraş", "FROTO": "Ford Otosan",
  "OYAKC": "Oyak Çimento", "GESAN": "Girişim Elektrik", "ALARK": "Alarko Holding"
};

// 2FA & Session management
let adminSession = { token: null, expires: 0 };
let pending2FA = { code: null, expires: 0 };

// Basit deneme sinirlama (brute-force korumasi): IP basina basarisiz girisleri say
const loginAttempts = new Map(); // ip -> { count, lockedUntil }
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 dakika

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function isLockedOut(ip) {
  const rec = loginAttempts.get(ip);
  return !!(rec && rec.lockedUntil && Date.now() < rec.lockedUntil);
}

function registerFailedLogin(ip) {
  const rec = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  rec.count += 1;
  if (rec.count >= LOGIN_MAX_ATTEMPTS) {
    rec.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
    rec.count = 0;
  }
  loginAttempts.set(ip, rec);
}

function clearFailedLogins(ip) {
  loginAttempts.delete(ip);
}

// Sabit zamanli (timing-attack'a dayanikli) string karsilastirma
function safeEqual(a, b) {
  const crypto = require('crypto');
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    // Uzunluk farkli olsa da sabit-sureli davranisi korumak icin yine de bir karsilastirma yap
    crypto.timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// Admin oturum dogrulamasi: /api/admin/* yazma uclarinin tumu bunu gecmeli.
function requireAdminAuth(req, res) {
  const authHeader = req.headers['authorization'] || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1] : null;
  const valid = !!token && !!adminSession.token && Date.now() < adminSession.expires && safeEqual(token, adminSession.token);
  if (!valid) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'Yetkisiz erişim: geçerli bir oturum gerekli.' }));
    return false;
  }
  return true;
}

async function sendWhatsAppMessage(config, code) {
  if (!config.phone) return false;
  const message = `BorsaKaynak Güvenlik Kodu: ${code}. Bu kod 5 dakika süreyle geçerlidir.`;
  
  try {
    if (config.waProvider === 'ultramsg' && config.waInstance && config.waToken) {
      const url = `https://api.ultramsg.com/${config.waInstance}/messages/chat`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: config.waToken,
          to: config.phone,
          body: message
        })
      });
      return res.ok;
    } else if (config.waCustomUrl) {
      const targetUrl = config.waCustomUrl
        .replace('{phone}', encodeURIComponent(config.phone))
        .replace('{message}', encodeURIComponent(message));
      const res = await fetch(targetUrl);
      return res.ok;
    }
  } catch (e) {
    console.error('[2FA] WhatsApp sending failed:', e.message);
  }
  return false;
}

// Request dispatcher
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname || '/';
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  // Set CORS and No-Cache headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Guvenlik basliklari (tum yanitlar icin)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://s3.tradingview.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https:; " +
    "frame-src https://*.tradingview.com; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "frame-ancestors 'self';"
  );

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // 1. API: Live Quotes
  if (pathname === '/api/live') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const symbolsParam = parsedUrl.query.symbols || '';
    if (!symbolsParam) {
      return res.end(JSON.stringify([]));
    }

        const symbols = symbolsParam.split(',');
    const quotes = await getLiveQuotesFromOfficial(symbols);

    // Gercek kaynaktan veri gelmeyen semboller sonuc listesine eklenmez;
    // on yuz bunlari 'veri yok' olarak gostermelidir.
    const missingSymbols = symbols.filter(sym => !quotes.some(q => q && q.code === sym));
    if (missingSymbols.length > 0) {
      console.warn('[api/live] Gerçek veri bulunamayan semboller (atlandı):', missingSymbols.join(', '));
    }

    // Apply manual index overrides from config.json if defined
    try {
      const configPath = path.join(__dirname, 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        quotes.forEach(q => {
          if (q.code === 'XU100' && config.xu100Override) {
            const val = parseFloat(String(config.xu100Override).replace(/\./g, '').replace(',', '.'));
            if (val > 0) {
              q.son = val;
              if (q.onceki > 0) { q.fark = q.son - q.onceki; q.farkP = (q.fark / q.onceki) * 100; }
            }
          }
          if (q.code === 'XU030' && config.xu030Override) {
            const val = parseFloat(String(config.xu030Override).replace(/\./g, '').replace(',', '.'));
            if (val > 0) {
              q.son = val;
              if (q.onceki > 0) { q.fark = q.son - q.onceki; q.farkP = (q.fark / q.onceki) * 100; }
            }
          }
          if (q.code === 'XBANK' && config.xbankOverride) {
            const val = parseFloat(String(config.xbankOverride).replace(/\./g, '').replace(',', '.'));
            if (val > 0) {
              q.son = val;
              if (q.onceki > 0) { q.fark = q.son - q.onceki; q.farkP = (q.fark / q.onceki) * 100; }
            }
          }
          if (q.code === 'XUSIN' && config.xusinOverride) {
            const val = parseFloat(String(config.xusinOverride).replace(/\./g, '').replace(',', '.'));
            if (val > 0) {
              q.son = val;
              if (q.onceki > 0) { q.fark = q.son - q.onceki; q.farkP = (q.fark / q.onceki) * 100; }
            }
          }
        });
      }
    } catch(e) {}

    return res.end(JSON.stringify(quotes));
  }

  // 1b. API: Hisse/Endeks Gecmis Grafik Verisi (mum grafikleri icin)
  if (pathname === '/api/chart') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const symbol = (parsedUrl.query.symbol || '').toString().toUpperCase().replace(/[^A-Z0-9.^]/g, '');
    if (!symbol) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'symbol parametresi gerekli' }));
    }
    try {
      const range = (parsedUrl.query.range || '6mo').toString();
      const interval = (parsedUrl.query.interval || '1d').toString();
      const data = await getHistoricalChart(symbol, range, interval);
      return res.end(JSON.stringify({ ok: true, ...data }));
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Grafik verisi şu anda alınamıyor.' }));
    }
  }

  // 2. API: Forex & Crypto rates
  if (pathname === '/api/fx' || pathname === '/fx') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    try {
      const fxData = await getForexData();

      // Apply manual currency & commodity overrides from config.json if defined
      try {
        const configPath = path.join(__dirname, 'config.json');
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          if (config.usdOverride) {
            const val = parseFloat(String(config.usdOverride).replace(/\./g, '').replace(',', '.'));
            if (val > 0) fxData.USDTRY = val;
          }
          if (config.eurOverride) {
            const val = parseFloat(String(config.eurOverride).replace(/\./g, '').replace(',', '.'));
            if (val > 0) fxData.EURTRY = val;
          }
          if (config.goldOverride) {
            const val = parseFloat(String(config.goldOverride).replace(/\./g, '').replace(',', '.'));
            if (val > 0) fxData.GOLDGR = val;
          }
          if (config.brentOverride) {
            const val = parseFloat(String(config.brentOverride).replace(/\./g, '').replace(',', '.'));
            if (val > 0) fxData.BRENT = val;
          }
          if (config.btcOverride) {
            const val = parseFloat(String(config.btcOverride).replace(/\./g, '').replace(',', '.'));
            if (val > 0) fxData.BTCUSD = val;
          }
        }
      } catch(e) {}

      return res.end(JSON.stringify(fxData));
    } catch (err) {
      console.error('[API /api/fx Error]:', err);
      return res.end(JSON.stringify({
        success: false,
        error: 'Döviz/emtia verisi şu anda alınamadı.',
        src: 'Unavailable'
      }));
    }
  }

  // 3. API: Dynamic Money Inflow / Outflow (Para Giriş Çıkışı)
  if (pathname === '/api/money-flow') {
    // Gercek fiyat/hacim verisiyle (Forinvest -> TradingView -> Yahoo zinciri
    // uzerinden) net para akisi TAHMINI hesaplar. Bu GERCEK emir akisi
    // (tick-level order flow) verisi DEGILDIR -- boyle bir veri Takasbank/MKK
    // seviyesinde ozel, genelde ucretli bir kaynak gerektirir ve elimizdeki
    // hicbir kaynakta (TradingView, Fintables ucretsiz katmani) yok. Bu yuzden
    // sonuc acikca "tahmini" olarak isaretlenir ve HICBIR ZAMAN uydurma
    // baseline veriyle doldurulmaz -- canli veri yoksa alan bos doner.
    const quotes = await getLiveQuotesFromOfficial(BIST_SYMBOLS);

    if (quotes.length === 0) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: false,
        error: 'Canlı fiyat/hacim verisine şu anda ulaşılamıyor.',
        inflow: [], outflow: []
      }));
    }

    // Tahmini net akis: (fiyat x hacim) x (gunluk degisim%) x sabit oran.
    // Bu, gercek alici/satici emir dagilimi degil; fiyat-hacim agirlikli bir
    // yaklasimdir. Frontend bunu acikca "tahmini gosterge" olarak etiketler.
    const calculatedFlows = quotes.map(q => {
      const volumeInTry = q.son * (q.adet || 0);
      const netFlow = volumeInTry * (q.farkP / 100) * 0.18;
      return {
        sem: q.code,
        ad: STOCK_NAMES[q.code] || q.code,
        fiyat: q.son,
        farkP: q.farkP,
        tutar: parseFloat((netFlow / 1000000).toFixed(2))
      };
    });

    const inflow = calculatedFlows
      .filter(x => x.tutar > 0)
      .sort((a, b) => b.tutar - a.tutar)
      .slice(0, 20);

    const outflow = calculatedFlows
      .filter(x => x.tutar < 0)
      .sort((a, b) => a.tutar - b.tutar)
      .map(x => ({ ...x, tutar: Math.abs(x.tutar) }))
      .slice(0, 20);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: true,
      not: 'Bu, fiyat ve hacim verisinden türetilmiş tahmini bir göstergedir; gerçek emir akışı (kurumsal alım/satım) verisi değildir.',
      inflow, outflow
    }));
  }

  // Araci kurum bazli islem dagilimi BIST/Takasbank'a ozel bir veridir;
  // dogrulanmis bir kaynagimiz olmadigi icin durustce "kullanilamiyor"
  // donduruyoruz.
  if (pathname === '/api/brokerage') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: false,
      error: 'Aracı kurum bazlı işlem dağılımı verisi bu sitede sağlanmamaktadır (gerçek zamanlı, doğrulanmış bir kaynağımız yok).',
      buyers: [], sellers: []
    }));
  }

  // Yabanci yatirimci giris/cikisi MKK/Takasbank'a ozel bir veridir;
  // dogrulanmis bir kaynagimiz olmadigi icin durustce "kullanilamiyor"
  // donduruyoruz.
  if (pathname === '/api/foreign-flow') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: false,
      error: 'Yabancı yatırımcı giriş/çıkış verisi bu sitede sağlanmamaktadır (gerçek zamanlı, doğrulanmış bir kaynağımız yok).',
      buyers: [], sellers: []
    }));
  }

  // 5.4. API: Health Check Endpoint
  if (pathname === '/api/health' || pathname === '/health' || pathname === '/api/health/' || pathname === '/health/') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      ok: true,
      status: 'healthy',
      service: 'BorsaKaynak Node API Engine',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }));
  }

  // 5.45. API: Automated Blog System (/api/blogs)
  if (pathname === '/api/blogs') {
    const blogPath = path.join(__dirname, 'blogs.json');
    let blogs = [];
    if (fs.existsSync(blogPath)) {
      try { blogs = JSON.parse(fs.readFileSync(blogPath, 'utf-8')); } catch(e){}
    }

    // ?all=true taslaklari (yayinlanmamis yazilari) da dondurur -- bu sadece
    // admin panelinin yonetim listesi icindir, herkese acik olmamali.
    if (parsedUrl.query.all === 'true') {
      if (!requireAdminAuth(req, res)) return;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(blogs));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    const blogId = parsedUrl.query.id;
    if (blogId) {
      const found = blogs.find(b => b.id === blogId);
      return res.end(JSON.stringify(found || { error: 'Blog yazısı bulunamadı' }));
    }

    const publishedOnly = blogs.filter(b => b.isPublished);
    return res.end(JSON.stringify(publishedOnly));
  }

  // 5.46. API: POST / DELETE Admin Blog Manager
  if (pathname === '/api/admin/blog') {
    // Yazma/silme islemleri sadece gecerli admin oturumuyla yapilabilir.
    if ((req.method === 'POST' || req.method === 'DELETE') && !requireAdminAuth(req, res)) return;

    const blogPath = path.join(__dirname, 'blogs.json');
    let blogs = [];
    if (fs.existsSync(blogPath)) {
      try { blogs = JSON.parse(fs.readFileSync(blogPath, 'utf-8')); } catch(e){}
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const item = JSON.parse(body);
          if (!item.id || !item.title) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: false, error: 'Başlık ve ID zorunludur' }));
          }

          const existingIdx = blogs.findIndex(b => b.id === item.id);
          if (existingIdx >= 0) {
            blogs[existingIdx] = { ...blogs[existingIdx], ...item };
          } else {
            blogs.unshift(item);
          }

          fs.writeFileSync(blogPath, JSON.stringify(blogs, null, 2), 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: true }));
        } catch(e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: e.message }));
        }
      });
      return;
    }

    if (req.method === 'DELETE') {
      const deleteId = parsedUrl.query.id;
      blogs = blogs.filter(b => b.id !== deleteId);
      fs.writeFileSync(blogPath, JSON.stringify(blogs, null, 2), 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true }));
    }
  }

  // 5.5. API: GET / POST Admin Config
  if (pathname === '/api/admin/config') {
    // config.json hassas alanlar (adminUsername/adminPassword) icerebilir;
    // GET dahi kimlik dogrulamasi gerektirir.
    if (!requireAdminAuth(req, res)) return;

    const configPath = path.join(__dirname, 'config.json');

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const newConfig = JSON.parse(body);
          fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: e.message }));
        }
      });
      return;
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      let currentConfig = {
        siteTitle: "Borsakaynak — Analiz · Veri · Güven",
        announcement: "BorsaKaynak sunucu entegrasyonu tamamlandı. Veriler canlı ve günceldir.",
        email: "info@borsakaynak.com",
        phone: "+90 (212) 123 45 67",
        copyright: "© 2026 Borsakaynak. Tüm hakları saklıdır."
      };
      
      try {
        if (fs.existsSync(configPath)) {
          currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
      } catch (e) {}
      
      return res.end(JSON.stringify(currentConfig));
    }
  }

  
  // 5.5. API: Sunucu & Hosting Bağlantı Test Ucu (/api/test)
  if (pathname === '/api/test') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
    const tests = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      uptime: Math.round(process.uptime()),
      outbound: {}
    };

    // Test 1: Yahoo / Google Finance Outbound Connection
    try {
      const t0 = Date.now();
      const r1 = await serverFetch('https://query1.finance.yahoo.com/v7/finance/quote?symbols=THYAO.IS');
      tests.outbound.yahooFinance = {
        ok: r1.ok,
        status: r1.status,
        latencyMs: Date.now() - t0,
        message: r1.ok ? 'Google/Yahoo Finans sunucusuna erişim başarılı!' : 'Sunucu yanıt verdi ancak HTTP ' + r1.status
      };
    } catch(e) {
      tests.outbound.yahooFinance = { ok: false, error: e.message, message: 'Hosting dış bağlantıyı engelliyor veya DNS hatası!' };
    }

    // Test 2: Binance Outbound Connection
    try {
      const t0 = Date.now();
      const r2 = await serverFetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
      tests.outbound.binance = {
        ok: r2.ok,
        status: r2.status,
        latencyMs: Date.now() - t0,
        message: r2.ok ? 'Binance Kripto servisine erişim başarılı!' : 'HTTP ' + r2.status
      };
    } catch(e) {
      tests.outbound.binance = { ok: false, error: e.message, message: 'Binance servisine erişilemedi!' };
    }

    // Test 3: Frankfurter Forex Outbound Connection
    try {
      const t0 = Date.now();
      const r3 = await serverFetch('https://api.frankfurter.app/latest?from=USD&to=TRY');
      tests.outbound.frankfurter = {
        ok: r3.ok,
        status: r3.status,
        latencyMs: Date.now() - t0,
        message: r3.ok ? 'Döviz servisine erişim başarılı!' : 'HTTP ' + r3.status
      };
    } catch(e) {
      tests.outbound.frankfurter = { ok: false, error: e.message, message: 'Döviz servisine erişilemedi!' };
    }

    const allOk = tests.outbound.yahooFinance?.ok && tests.outbound.binance?.ok;
    tests.overallStatus = allOk ? 'MÜKEMMEL - Hosting dış veri çekimine %100 uygundur!' : 'UYARI - Hosting bazı dış servislere erişimi kısıtlıyor!';

    return res.end(JSON.stringify(tests, null, 2));
  }

  // 5.6. API: POST /api/admin/login
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    const clientIp = getClientIp(req);
    if (isLockedOut(clientIp)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Çok fazla başarısız deneme. Lütfen 15 dakika sonra tekrar deneyin.' }));
    }
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const configPath = path.join(__dirname, 'config.json');
        // NOT: "admin365" sadece config.json henuz ozel bir sifre
        // tanimlamamissa kullanilan ilk-kurulum varsayilanidir. Panele
        // giris yaptiktan hemen sonra bunu degistirin -- kullanici adi ve
        // sifre burada acik metin karsilastirilir, deneme sinirlamasi
        // (yukarida) ve sabit-sureli karsilastirma (asagida) bunu
        // kaba-kuvvet saldirilarina karsi korur, ama zayif bir varsayilan
        // sifre yine de risktir.
        let currentConfig = { adminUsername: "admin", adminPassword: "admin365" };
        if (fs.existsSync(configPath)) {
          currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }

        const inputUser = payload.username || '';
        const inputPass = payload.password || '';
        const requiredUser = currentConfig.adminUsername || 'admin';
        const requiredPass = currentConfig.adminPassword || 'admin365';

        const userOk = safeEqual(inputUser, requiredUser);
        const passOk = safeEqual(inputPass, requiredPass);
        if (!userOk || !passOk) {
          registerFailedLogin(clientIp);
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: 'Kullanıcı adı veya şifre hatalı!' }));
        }
        clearFailedLogins(clientIp);

        // Direct login token
        const token = require("crypto").randomBytes(32).toString("hex");
        adminSession = {
          token: token,
          expires: Date.now() + 60 * 60 * 1000 // 1 Hour session
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, token: token }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // 5a2. API: TradingView Tam Piyasa Taramasi (tr.tradingview.com/markets/stocks-turkey
  //      sayfasinin arkasindaki ayni scanner API'si -- SADECE yukselenler degil,
  //      Turkiye borsasindaki TUM hisseler, canli)
  if (pathname === '/api/tradingview/hisseler') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    try {
      const list = await getTradingViewBistQuotes();
      return res.end(JSON.stringify({ success: true, count: list.length, updatedAt: new Date().toISOString(), data: list }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: e.message }));
    }
  }

  // 5b. API: Fintables Gercek Veri (Node.js hosting uzerinde canli cekilir)
  if (pathname === '/api/fintables/hisseler') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(fintablesLive.getEquities()));
  }
  if (pathname === '/api/fintables/hisse') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    const code = (parsedUrl.query.kod || parsedUrl.query.code || '').toString();
    return res.end(JSON.stringify(fintablesLive.getEquity(code)));
  }
  if (pathname === '/api/fintables/endeksler') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(fintablesLive.getIndices()));
  }
  // 5a4. API: BIST Endeksleri -- TradingView scanner uzerinden (Fintables
  // yerine; Fintables hem ana site hem yedek API erisilemez cikti).
  if (pathname === '/api/tradingview/endeksler') {
    try {
      const result = await tvMovers.getEndeksler();
      res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: e.message, veri: [] }));
    }
  }
  // KAP Bildirimleri -- kap_bildirimleri_cek.py (Python + pykap) tarafindan
  // PERIYODIK olarak uretilen kap-bildirimleri.json dosyasini okur ve servis
  // eder. Bu dosya CANLI/OTOMATIK degildir -- script ne zaman calistirildiysa
  // o ana ait bir anlik goruntudur (snapshot). Dosya yoksa veya bozuksa
  // durustce basarisiz doner, sahte veri uretilmez.
  if (pathname === '/api/kap-bildirimleri') {
    try {
      const dosyaYolu = path.join(__dirname, 'kap-bildirimleri.json');
      if (!fs.existsSync(dosyaYolu)) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({
          success: false,
          error: 'kap-bildirimleri.json henüz oluşturulmamış. Sunucuda kap_bildirimleri_cek.py scriptini çalıştırın.',
          bildirimler: []
        }));
      }
      const icerik = fs.readFileSync(dosyaYolu, 'utf-8');
      const veri = JSON.parse(icerik);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(veri));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: e.message, bildirimler: [] }));
    }
  }
  if (pathname === '/api/fintables/sektorler') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(fintablesLive.getSektorler()));
  }
  if (pathname === '/api/fintables/endeks') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    const code = (parsedUrl.query.kod || parsedUrl.query.code || '').toString();
    return res.end(JSON.stringify(fintablesLive.getIndex(code)));
  }

  // 5c. API: TradingView Yukselenler
  if (pathname === '/api/tradingview-gainers') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    try {
      const list = await getTradingViewTopGainers();
      return res.end(JSON.stringify({ success: true, count: list.length, data: list }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: e.message }));
    }
  }

  // 5d. API: TradingView Piyasa Hareketleri -- tum kategori sekmeleri
  //     (tr.tradingview.com/markets/stocks-turkey/ sayfasindaki 25 sekmenin tumu,
  //     ayni scanner.tradingview.com/turkey/scan API'sinden canli)
  if (pathname === '/api/tradingview/movers/kategoriler') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ success: true, kategoriler: tvMovers.getCategoryList() }));
  }
  // 5a3. API: Capsiz tam BIST enstruman listesi (bist-tum-enstrumanlar.html icin)
  if (pathname === '/api/tradingview/tum-enstrumanlar') {
    try {
      const result = await tvMovers.getFullInstrumentList();
      res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: e.message }));
    }
  }
  if (pathname === '/api/tradingview/movers') {
    const kategori = (parsedUrl.query.kategori || parsedUrl.query.kod || 'artanlar').toString();
    const limit = parseInt(parsedUrl.query.limit, 10) || 50;
    const sortField = (parsedUrl.query.sortField || '').toString();
    const sortOrder = (parsedUrl.query.sortOrder || 'desc').toString();
    const sortOverride = sortField ? { field: sortField, order: sortOrder } : null;
    try {
      const result = await tvMovers.getMovers(kategori, limit, sortOverride);
      res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: e.message }));
    }
  }

  // 6. Serve Static Files
  const forbiddenFiles = ['/server.js', '/app.js', '/package.json', '/package-lock.json', '/.htaccess'];
  if (forbiddenFiles.includes(pathname) || pathname.startsWith('/.') || pathname.startsWith('/node_modules')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Access Forbidden');
  }

  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Access Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      return res.end('<h1>404 Sayfa Bulunamadı</h1>');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };
    
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

// Automated Blog Publishing Scheduler (Pazartesi, Çarşamba, Cuma)
function checkAndPublishBlogs() {
  try {
    const blogPath = path.join(__dirname, 'blogs.json');
    if (!fs.existsSync(blogPath)) return;
    const blogs = JSON.parse(fs.readFileSync(blogPath, 'utf-8'));
    
    const today = new Date();
    const dayOfWeek = today.getDay(); // 1: Pazartesi, 3: Çarşamba, 5: Cuma
    const dayMap = { 1: 'Pazartesi', 3: 'Çarşamba', 5: 'Cuma' };
    
    let updated = false;
    blogs.forEach(b => {
      if (!b.isPublished && (b.scheduledDay === dayMap[dayOfWeek] || new Date(b.publishDate) <= today)) {
        b.isPublished = true;
        b.publishDate = today.toISOString().split('T')[0];
        updated = true;
      }
    });
    
    if (updated) {
      fs.writeFileSync(blogPath, JSON.stringify(blogs, null, 2), 'utf-8');
      console.log('[Blog Engine] Otomatik blog yayını aktifleşti (Pazartesi / Çarşamba / Cuma)');
    }
  } catch(e) {
    console.error('[Blog Engine] Hata:', e.message);
  }
}

// Initial check & 1-hour interval
checkAndPublishBlogs();
setInterval(checkAndPublishBlogs, 60 * 60 * 1000);



// Handler for Official TradingView BIST Market Movers Gainers
async function getTradingViewTopGainers() {
  try {
    const targetUrl = 'https://scanner.tradingview.com/turkey/scan';
    const payload = {
      "filter": [
        {"left": "type", "operation": "in_range", "right": ["stock", "dr", "fund"]},
        {"left": "change", "operation": "greater", "right": 0}
      ],
      "options": {"lang": "tr"},
      "markets": ["turkey"],
      "symbols": {"query": {"types": []}},
      "columns": ["name", "description", "close", "change", "change_abs", "volume"],
      "sort": {"sortBy": "change", "sortOrder": "desc"},
      "range": [0, 50]
    };

    const res = await serverFetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const j = await res.json();
    const dataItems = j?.data || [];
    const gainers = [];

    dataItems.forEach(item => {
      const sym = (item.s || '').replace('BIST:', '').trim().toUpperCase();
      const d = item.d || [];
      if (sym && d.length >= 6) {
        const name = d[1] || sym;
        const price = parseFloat(d[2] || 0);
        const chgP = parseFloat(d[3] || 0);
        const chgAbs = parseFloat(d[4] || 0);
        const vol = parseFloat(d[5] || 0);

        if (price > 0) {
          gainers.push({
            code: sym,
            name: name,
            price: price.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' TL',
            chg: '+' + chgP.toFixed(2).replace('.', ',') + '%',
            chgNum: chgP,
            vol: vol > 1e6 ? (vol/1e6).toFixed(1) + ' M ₺' : vol.toLocaleString('tr-TR') + ' ₺'
          });
        }
      }
    });

    return gainers;
  } catch (e) {
    return [];
  }
}




module.exports = server;
fintablesLive.startAutoRefresh();
server.listen(PORT, () => {
  console.log(`[Server] BorsaKaynak sunucusu http://localhost:${PORT} portunda aktif!`);
});

// 5-Second Real-Time TradingView BIST Scanner Engine
setInterval(async () => {
  try { await getTradingViewBistQuotes(); } catch(e){}
}, 5000);
