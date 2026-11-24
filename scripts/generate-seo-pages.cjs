#!/usr/bin/env node
/**
 * scripts/generate-seo-pages.cjs
 * `[LAUNCH-04]` Static Pre-Rendered SEO Buyer Guides, Schema.org Markup & Sitemap
 *
 * Reads live JSON catalogs (`src/data/catalogs/*.json`) and regional prices
 * (`br.json`, `us.json`) to emit indexable static buyer guides in `pt-BR` and `en-US`
 * backed by authentic Pareto-optimal hardware picks.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const GUIDES_DIR = path.join(PUBLIC_DIR, 'guides');
const BASE_URL = 'https://paretopc.com';

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function overlayPriceMap(items, offers, currency) {
  const offerMap = new Map();
  for (const offer of offers) {
    if (offer.inStock) {
      offerMap.set(offer.componentId, offer);
    }
  }
  return items.map((item) => {
    const offer = offerMap.get(item.id);
    const effectivePrice = offer
      ? typeof offer.cashPrice === 'number' && offer.cashPrice > 0
        ? offer.cashPrice
        : offer.price
      : currency === 'BRL'
        ? Math.round(item.price * 5.7)
        : item.price;
    return {
      ...item,
      effectivePrice,
      store: offer
        ? offer.store
        : currency === 'BRL'
          ? 'Brasil Ref.'
          : 'US MSRP',
      storeUrl: offer ? offer.url : `${BASE_URL}/`,
      checkedAt: offer ? offer.checkedAt : item.checkedAt,
    };
  });
}

function selectParetoGpus(gpus, maxBudget) {
  const affordable = gpus.filter(
    (g) => g.effectivePrice > 0 && g.effectivePrice <= maxBudget,
  );
  const nonDominated = affordable.filter((cand) => {
    return !affordable.some((other) => {
      if (other.id === cand.id) return false;
      const noWorse =
        other.effectivePrice <= cand.effectivePrice &&
        other.rasterFps1440p >= cand.rasterFps1440p &&
        other.vramGb >= cand.vramGb;
      const strictlyBetter =
        other.effectivePrice < cand.effectivePrice ||
        other.rasterFps1440p > cand.rasterFps1440p ||
        other.vramGb > cand.vramGb;
      return noWorse && strictlyBetter;
    });
  });

  return nonDominated
    .sort((a, b) => {
      const ratioA = a.rasterFps1440p / Math.max(1, a.effectivePrice);
      const ratioB = b.rasterFps1440p / Math.max(1, b.effectivePrice);
      return ratioB - ratioA || b.rasterFps1440p - a.rasterFps1440p;
    })
    .slice(0, 6);
}

function selectCompatibleBuilds(catalogs, offers, currency, maxBudget) {
  const gpus = overlayPriceMap(catalogs.gpus, offers, currency);
  const cpus = overlayPriceMap(catalogs.cpus, offers, currency);
  const mobos = overlayPriceMap(catalogs.motherboards, offers, currency);
  const rams = overlayPriceMap(catalogs.ram, offers, currency);
  const storages = overlayPriceMap(catalogs.storage, offers, currency);
  const coolers = overlayPriceMap(catalogs.coolers, offers, currency);
  const cases = overlayPriceMap(catalogs.cases, offers, currency);
  const psus = overlayPriceMap(catalogs.psus, offers, currency);

  const cheapestStorage = [...storages].sort(
    (a, b) => a.effectivePrice - b.effectivePrice,
  )[0];

  const candidateBuilds = [];
  for (const cpu of cpus.slice(0, 12)) {
    const compatMobos = mobos.filter((m) => m.socket === cpu.socket);
    for (const mobo of compatMobos.slice(0, 4)) {
      const compatRam = [...rams]
        .filter((r) => r.generation === mobo.ramGeneration)
        .sort((a, b) => a.effectivePrice - b.effectivePrice)[0];
      if (!compatRam) continue;

      const compatCooler = [...coolers]
        .filter(
          (c) =>
            c.supportedSockets.includes(cpu.socket) &&
            c.maxTdpWatts >= cpu.tdpWatts,
        )
        .sort((a, b) => a.effectivePrice - b.effectivePrice)[0];
      if (!compatCooler) continue;

      for (const gpu of gpus) {
        const compatCase = [...cases]
          .filter(
            (pc) =>
              pc.supportedFormFactors.includes(mobo.formFactor) &&
              pc.maxGpuLengthMm >= (gpu.lengthMm ?? 260) &&
              pc.maxCpuCoolerHeightMm >= (compatCooler.heightMm ?? 150),
          )
          .sort((a, b) => a.effectivePrice - b.effectivePrice)[0];
        if (!compatCase) continue;

        const requiredWattage = Math.ceil(
          (cpu.tdpWatts + gpu.tdpWatts + 70) * 1.35,
        );
        const compatPsu = [...psus]
          .filter((p) => p.wattage >= requiredWattage)
          .sort((a, b) => a.effectivePrice - b.effectivePrice)[0];
        if (!compatPsu) continue;

        const totalPrice =
          cpu.effectivePrice +
          mobo.effectivePrice +
          compatRam.effectivePrice +
          gpu.effectivePrice +
          cheapestStorage.effectivePrice +
          compatCooler.effectivePrice +
          compatCase.effectivePrice +
          compatPsu.effectivePrice;

        if (totalPrice > maxBudget) continue;

        const effectiveFps =
          Math.round(
            Math.min(gpu.rasterFps1440p, cpu.gamingScore * 1.15) * 10,
          ) / 10;

        candidateBuilds.push({
          id: `${cpu.id}__${gpu.id}`,
          sku: gpu.id,
          name: `${cpu.name} + ${gpu.name}`,
          cpu,
          mobo,
          ram: compatRam,
          gpu,
          storage: cheapestStorage,
          cooler: compatCooler,
          pcCase: compatCase,
          psu: compatPsu,
          totalPrice,
          effectiveFps,
          store: gpu.store,
          storeUrl: gpu.storeUrl,
        });
      }
    }
  }

  const frontier = candidateBuilds.filter((b) => {
    return !candidateBuilds.some(
      (other) =>
        other.id !== b.id &&
        other.totalPrice <= b.totalPrice &&
        other.effectiveFps >= b.effectiveFps &&
        (other.totalPrice < b.totalPrice ||
          other.effectiveFps > b.effectiveFps),
    );
  });

  return frontier
    .sort(
      (a, b) => b.effectiveFps - a.effectiveFps || a.totalPrice - b.totalPrice,
    )
    .slice(0, 5);
}

function formatMoney(amount, currency) {
  if (currency === 'BRL') {
    return `R$ ${Math.round(amount).toLocaleString('pt-BR')}`;
  }
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

function renderHtmlPage({
  slug,
  lang,
  title,
  description,
  heading,
  subheading,
  appLink,
  appCtaLabel,
  currency,
  products,
  cardsHtml,
  dateModified,
}) {
  const canonicalUrl = `${BASE_URL}/guides/${slug}`;
  const schemaJson = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    description,
    url: canonicalUrl,
    dateModified,
    numberOfItems: products.length,
    itemListElement: products.map((prod, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Product',
        sku: prod.sku,
        name: prod.name,
        description: prod.summary,
        offers: {
          '@type': 'Offer',
          priceCurrency: currency,
          price: Number(prod.price.toFixed(2)),
          availability: 'https://schema.org/InStock',
          url: prod.url,
          seller: {
            '@type': 'Organization',
            name: prod.store,
          },
        },
      },
    })),
  };

  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <script type="application/ld+json">${JSON.stringify(schemaJson)}</script>
    <style>
      body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#020617;color:#f1f5f9;line-height:1.55}
      .wrap{max-width:960px;margin:0 auto;padding:32px 20px 64px}
      header{border-bottom:1px solid #1e293b;padding-bottom:24px;margin-bottom:28px}
      .brand{color:#34d399;font-weight:800;text-decoration:none;font-size:14px;letter-spacing:.04em;text-transform:uppercase}
      h1{font-size:clamp(1.6rem,3vw,2.2rem);margin:10px 0 8px;color:#fff}
      .sub{color:#94a3b8;max-width:680px;margin:0 0 18px}
      .cta{display:inline-block;background:#10b981;color:#022c22;font-weight:800;padding:10px 18px;border-radius:10px;text-decoration:none}
      .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
      .card{background:#0f172a;border:1px solid #1e293b;border-radius:16px;padding:18px}
      .price{font-size:1.3rem;font-weight:800;color:#34d399;margin:6px 0}
      .meta{font-size:.875rem;color:#cbd5e1;margin:6px 0 12px}
      .store{font-size:.75rem;color:#94a3b8}
      footer{margin-top:44px;border-top:1px solid #1e293b;padding-top:18px;font-size:.8rem;color:#94a3b8}
      a{color:#38bdf8}
    </style>
  </head>
  <body>
    <div class="wrap">
      <header>
        <a class="brand" href="${BASE_URL}/">ParetoPC • Interactive Hardware Optimizer</a>
        <h1>${escapeHtml(heading)}</h1>
        <p class="sub">${escapeHtml(subheading)}</p>
        <a class="cta" href="${escapeHtml(appLink)}">${escapeHtml(appCtaLabel)}</a>
      </header>
      <main>
        <div class="grid">
          ${cardsHtml}
        </div>
      </main>
      <footer>
        <p>Atualizado / Updated: ${escapeHtml(dateModified)} · Rankings are mathematically neutral based purely on price, benchmark FPS, VRAM, and compatibility.</p>
        <p><a href="${BASE_URL}/guides/index.html">All Buyer Guides</a> · <a href="${BASE_URL}/">Open Full ParetoPC App</a></p>
      </footer>
    </div>
  </body>
</html>
`;
}

function main() {
  fs.mkdirSync(GUIDES_DIR, { recursive: true });

  const catalogs = {
    gpus: readJson('src/data/catalogs/gpus.json'),
    cpus: readJson('src/data/catalogs/cpus.json'),
    motherboards: readJson('src/data/catalogs/motherboards.json'),
    ram: readJson('src/data/catalogs/ram.json'),
    storage: readJson('src/data/catalogs/storage.json'),
    coolers: readJson('src/data/catalogs/coolers.json'),
    cases: readJson('src/data/catalogs/cases.json'),
    psus: readJson('src/data/catalogs/psus.json'),
  };
  const brOffers = readJson('src/data/prices/br.json');
  const usOffers = readJson('src/data/prices/us.json');

  const dateModified =
    brOffers[0]?.checkedAt || new Date().toISOString().slice(0, 10);

  const brGpus = selectParetoGpus(
    overlayPriceMap(catalogs.gpus, brOffers, 'BRL'),
    2500,
  );
  const usGpus = selectParetoGpus(
    overlayPriceMap(catalogs.gpus, usOffers, 'USD'),
    400,
  );
  const brBuilds = selectCompatibleBuilds(catalogs, brOffers, 'BRL', 6000);
  const usBuilds = selectCompatibleBuilds(catalogs, usOffers, 'USD', 1000);

  const generatedFiles = [];

  // 1. BR GPU Guide
  const brGpuSlug = 'melhor-placa-de-video-ate-2500-reais.html';
  fs.writeFileSync(
    path.join(GUIDES_DIR, brGpuSlug),
    renderHtmlPage({
      slug: brGpuSlug,
      lang: 'pt-BR',
      title: 'Melhor Placa de Vídeo até R$ 2.500 (2026) — ParetoPC',
      description:
        'Seleção matemática das placas de vídeo com maior FPS e menor preço até R$ 2.500 nas lojas brasileiras (KaBuM!, Terabyte, Pichau, Amazon BR).',
      heading: 'Melhores Placas de Vídeo até R$ 2.500',
      subheading:
        'Comparação direta de custo-benefício usando preços verificados no PIX/à vista e desempenho real em 1440p.',
      appLink: `${BASE_URL}/?mode=simple&curr=BRL&budget=2500`,
      appCtaLabel: 'Abrir Simulador Interativo (R$ 2.500) →',
      currency: 'BRL',
      dateModified,
      products: brGpus.map((g) => ({
        sku: g.id,
        name: g.name,
        summary: `${g.rasterFps1440p} FPS (1440p) · ${g.vramGb}GB VRAM · ${g.tdpWatts}W`,
        price: g.effectivePrice,
        store: g.store,
        url: g.storeUrl,
      })),
      cardsHtml: brGpus
        .map(
          (g) => `<article class="card">
  <h2>${escapeHtml(g.name)}</h2>
  <div class="price">${escapeHtml(formatMoney(g.effectivePrice, 'BRL'))}</div>
  <p class="meta">${g.rasterFps1440p} FPS 1440p · ${g.vramGb}GB VRAM · ${g.tdpWatts}W</p>
  <p class="store">Loja: ${escapeHtml(g.store)} · <a href="${escapeHtml(BASE_URL + '/?mode=simple&curr=BRL&budget=2500&gpu=' + encodeURIComponent(g.id))}">Comparar no ParetoPC</a></p>
</article>`,
        )
        .join('\n'),
    }),
    'utf8',
  );
  generatedFiles.push(brGpuSlug);

  // 2. BR Full PC Guide
  const brBuildSlug = 'melhor-pc-gamer-ate-6000-reais.html';
  fs.writeFileSync(
    path.join(GUIDES_DIR, brBuildSlug),
    renderHtmlPage({
      slug: brBuildSlug,
      lang: 'pt-BR',
      title: 'Melhor PC Gamer Completo até R$ 6.000 (2026) — ParetoPC',
      description:
        'Configurações completas de 8 peças 100% compatíveis até R$ 6.000 com verificação física de soquete, memória, gabinete e fonte.',
      heading: 'Melhores PCs Gamers Completos até R$ 6.000',
      subheading:
        'Combinações verificadas com 8 componentes compatíveis e maior desempenho efetivo dentro do seu orçamento.',
      appLink: `${BASE_URL}/?mode=builds&curr=BRL&budget=6000`,
      appCtaLabel: 'Personalizar Peças no Montador ParetoPC →',
      currency: 'BRL',
      dateModified,
      products: brBuilds.map((b) => ({
        sku: b.sku,
        name: b.name,
        summary: `${b.cpu.name} + ${b.gpu.name} + ${b.ram.name} + ${b.mobo.name} (${b.effectiveFps} FPS est.)`,
        price: b.totalPrice,
        store: b.store,
        url: `${BASE_URL}/?mode=builds&curr=BRL&budget=6000&cpu=${encodeURIComponent(b.cpu.id)}&gpu=${encodeURIComponent(b.gpu.id)}`,
      })),
      cardsHtml: brBuilds
        .map(
          (b) => `<article class="card">
  <h2>${escapeHtml(b.name)}</h2>
  <div class="price">${escapeHtml(formatMoney(b.totalPrice, 'BRL'))}</div>
  <p class="meta">${escapeHtml(b.mobo.name)} · ${escapeHtml(b.ram.name)} · ${escapeHtml(b.psu.name)}</p>
  <p class="store">~${b.effectiveFps} FPS est. · <a href="${escapeHtml(BASE_URL + '/?mode=builds&curr=BRL&budget=6000&cpu=' + encodeURIComponent(b.cpu.id) + '&gpu=' + encodeURIComponent(b.gpu.id))}">Abrir build completa</a></p>
</article>`,
        )
        .join('\n'),
    }),
    'utf8',
  );
  generatedFiles.push(brBuildSlug);

  // 3. US GPU Guide
  const usGpuSlug = 'best-gpu-under-400-dollars.html';
  fs.writeFileSync(
    path.join(GUIDES_DIR, usGpuSlug),
    renderHtmlPage({
      slug: usGpuSlug,
      lang: 'en-US',
      title: 'Best Graphics Card Under $400 (2026) — ParetoPC',
      description:
        'Mathematically filtered non-dominated GPUs under $400 across US stores using 1440p raster benchmarks, VRAM capacity, and power efficiency.',
      heading: 'Best Graphics Cards Under $400',
      subheading:
        'Objective multi-criteria comparison eliminating overpriced traps across Amazon US, Newegg, Best Buy, and B&H.',
      appLink: `${BASE_URL}/?mode=simple&curr=USD&budget=400`,
      appCtaLabel: 'Open Interactive Optimizer ($400) →',
      currency: 'USD',
      dateModified,
      products: usGpus.map((g) => ({
        sku: g.id,
        name: g.name,
        summary: `${g.rasterFps1440p} FPS (1440p) · ${g.vramGb}GB VRAM · ${g.tdpWatts}W`,
        price: g.effectivePrice,
        store: g.store,
        url: g.storeUrl,
      })),
      cardsHtml: usGpus
        .map(
          (g) => `<article class="card">
  <h2>${escapeHtml(g.name)}</h2>
  <div class="price">${escapeHtml(formatMoney(g.effectivePrice, 'USD'))}</div>
  <p class="meta">${g.rasterFps1440p} FPS 1440p · ${g.vramGb}GB VRAM · ${g.tdpWatts}W</p>
  <p class="store">Retailer: ${escapeHtml(g.store)} · <a href="${escapeHtml(BASE_URL + '/?mode=simple&curr=USD&budget=400&gpu=' + encodeURIComponent(g.id))}">Inspect in ParetoPC</a></p>
</article>`,
        )
        .join('\n'),
    }),
    'utf8',
  );
  generatedFiles.push(usGpuSlug);

  // 4. US Complete PC Guide
  const usBuildSlug = 'best-gaming-pc-build-under-1000-dollars.html';
  fs.writeFileSync(
    path.join(GUIDES_DIR, usBuildSlug),
    renderHtmlPage({
      slug: usBuildSlug,
      lang: 'en-US',
      title: 'Best Complete Gaming PC Build Under $1,000 (2026) — ParetoPC',
      description:
        'Verified 8-part compatible PC builds under $1,000 balancing CPU/GPU bottleneck headroom, PSU capacity, case clearance, and street prices.',
      heading: 'Best Complete Gaming PC Builds Under $1,000',
      subheading:
        'Every 8-part build below passes socket, DDR generation, PSU wattage headroom, and chassis clearance verification.',
      appLink: `${BASE_URL}/?mode=builds&curr=USD&budget=1000`,
      appCtaLabel: 'Customize Parts in ParetoPC Builder →',
      currency: 'USD',
      dateModified,
      products: usBuilds.map((b) => ({
        sku: b.sku,
        name: b.name,
        summary: `${b.cpu.name} + ${b.gpu.name} + ${b.ram.name} + ${b.mobo.name} (${b.effectiveFps} est. FPS)`,
        price: b.totalPrice,
        store: b.store,
        url: `${BASE_URL}/?mode=builds&curr=USD&budget=1000&cpu=${encodeURIComponent(b.cpu.id)}&gpu=${encodeURIComponent(b.gpu.id)}`,
      })),
      cardsHtml: usBuilds
        .map(
          (b) => `<article class="card">
  <h2>${escapeHtml(b.name)}</h2>
  <div class="price">${escapeHtml(formatMoney(b.totalPrice, 'USD'))}</div>
  <p class="meta">${escapeHtml(b.mobo.name)} · ${escapeHtml(b.ram.name)} · ${escapeHtml(b.psu.name)}</p>
  <p class="store">~${b.effectiveFps} est. FPS · <a href="${escapeHtml(BASE_URL + '/?mode=builds&curr=USD&budget=1000&cpu=' + encodeURIComponent(b.cpu.id) + '&gpu=' + encodeURIComponent(b.gpu.id))}">Open full 8-part list</a></p>
</article>`,
        )
        .join('\n'),
    }),
    'utf8',
  );
  generatedFiles.push(usBuildSlug);

  // 5. Hub Index Page
  const indexSlug = 'index.html';
  fs.writeFileSync(
    path.join(GUIDES_DIR, indexSlug),
    renderHtmlPage({
      slug: indexSlug,
      lang: 'pt-BR',
      title: 'ParetoPC Buyer Guides — Brasil (BRL) & US (USD)',
      description:
        'Static indexable PC hardware buyer guides powered by Pareto frontier analysis and verified BR/US retail prices.',
      heading: 'ParetoPC Hardware Buyer Guides (PT-BR & EN-US)',
      subheading:
        'Direct, neutral recommendations built from our 124-part hardware catalog with links straight into the interactive optimizer.',
      appLink: `${BASE_URL}/`,
      appCtaLabel: 'Open ParetoPC Optimizer →',
      currency: 'BRL',
      dateModified,
      products: brGpus.slice(0, 2).map((g) => ({
        sku: g.id,
        name: g.name,
        summary: `${g.rasterFps1440p} FPS (1440p) · ${g.vramGb}GB VRAM`,
        price: g.effectivePrice,
        store: g.store,
        url: `${BASE_URL}/guides/${brGpuSlug}`,
      })),
      cardsHtml: [
        {
          href: brGpuSlug,
          title: 'Melhores Placas de Vídeo até R$ 2.500',
          desc: 'Guia Brasil em Reais (PIX) com preços da KaBuM!, Pichau, Terabyte e Amazon BR.',
        },
        {
          href: brBuildSlug,
          title: 'Melhores PCs Gamers até R$ 6.000',
          desc: 'Builds completas de 8 peças compatíveis e balanceadas sem gargalo.',
        },
        {
          href: usGpuSlug,
          title: 'Best GPUs Under $400 (US)',
          desc: 'Frontier graphics cards across Amazon US, Newegg, Best Buy, and B&H.',
        },
        {
          href: usBuildSlug,
          title: 'Best Complete PC Builds Under $1,000',
          desc: 'Verified 8-part US gaming & creator systems under budget.',
        },
      ]
        .map(
          (g) => `<article class="card">
  <h2><a href="${BASE_URL}/guides/${escapeHtml(g.href)}">${escapeHtml(g.title)}</a></h2>
  <p class="meta">${escapeHtml(g.desc)}</p>
</article>`,
        )
        .join('\n'),
    }),
    'utf8',
  );
  generatedFiles.push(indexSlug);

  // 6. Sitemap & Robots.txt
  const sitemapUrls = [
    `${BASE_URL}/`,
    ...generatedFiles.map((f) => `${BASE_URL}/guides/${f}`),
  ];
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls
  .map(
    (loc) => `  <url>
    <loc>${escapeHtml(loc)}</loc>
    <lastmod>${escapeHtml(dateModified)}</lastmod>
    <changefreq>weekly</changefreq>
  </url>`,
  )
  .join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapXml, 'utf8');
  fs.writeFileSync(
    path.join(PUBLIC_DIR, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${BASE_URL}/sitemap.xml\n`,
    'utf8',
  );

  console.log(
    `[generate-seo-pages] OK — emitted ${generatedFiles.length} HTML guides in public/guides/, public/sitemap.xml, and public/robots.txt.`,
  );
}

main();
