import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const CLICKS_FILE = path.join(DATA_DIR, "affiliate-clicks.json");
fs.mkdirSync(DATA_DIR, { recursive: true });
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const products = [
  { id:"cabinet-lights", name:"Motion Sensor Cabinet Lights", niche:"Home", cost:8, price:24.99, shipping:"Lightweight", supplierSearch:"motion sensor cabinet lights", notes:"Check battery life, brightness, adhesive quality, and pack sizes." },
  { id:"sink-splash-guard", name:"Silicone Sink Splash Guard", niche:"Home", cost:5, price:18.99, shipping:"Lightweight", supplierSearch:"silicone sink splash guard", notes:"Check faucet compatibility, dimensions, and silicone quality." },
  { id:"pet-hair-roller", name:"Pet Hair Remover Roller", niche:"Pets", cost:4, price:17.99, shipping:"Lightweight", supplierSearch:"pet hair remover roller", notes:"Test on multiple fabrics and verify cleaning mechanism durability." },
  { id:"dog-water-bottle", name:"Portable Dog Water Bottle", niche:"Pets", cost:6, price:21.99, shipping:"Lightweight", supplierSearch:"portable dog water bottle", notes:"Check leak resistance, material safety, and one-hand use." },
  { id:"packing-cubes", name:"Packing Cube Set", niche:"Travel", cost:9, price:27.99, shipping:"Lightweight", supplierSearch:"packing cube set", notes:"Compare set sizes, stitching, zippers, and fabric weight." },
  { id:"jewelry-organizer", name:"Travel Jewelry Organizer", niche:"Travel", cost:6, price:19.99, shipping:"Lightweight", supplierSearch:"travel jewelry organizer", notes:"Inspect lining, zipper quality, and compartments." },
  { id:"resistance-bands", name:"Resistance Band Kit", niche:"Fitness", cost:7, price:22.99, shipping:"Lightweight", supplierSearch:"resistance band kit", notes:"Verify resistance levels, safety testing, and material quality." },
  { id:"portable-blender", name:"Portable Blender Bottle", niche:"Fitness", cost:12, price:29.99, shipping:"Medium", supplierSearch:"portable blender bottle", notes:"Battery-powered products require extra checks for safety, capacity, and returns." },
  { id:"makeup-pads", name:"Reusable Makeup Remover Pads", niche:"Beauty", cost:3, price:14.99, shipping:"Lightweight", supplierSearch:"reusable makeup remover pads", notes:"Check fabric quality, wash durability, and pack quantity." },
  { id:"ice-roller", name:"Ice Facial Roller", niche:"Beauty", cost:5, price:18.99, shipping:"Lightweight", supplierSearch:"ice facial roller", notes:"Avoid medical claims; check material, seams, and cleaning instructions." },
  { id:"cable-clips", name:"Magnetic Cable Clips", niche:"Tech", cost:3, price:13.99, shipping:"Lightweight", supplierSearch:"magnetic cable clips", notes:"Check magnet strength, adhesive, and supported cable sizes." },
  { id:"laptop-stand", name:"Foldable Laptop Stand", niche:"Tech", cost:10, price:29.99, shipping:"Medium", supplierSearch:"foldable laptop stand", notes:"Test stability, load rating, portability, and device compatibility." }
];


// Free live signal: Google's public Trending Now RSS feed. It is a general search-trend feed,
// not a sales report; we only call a product a match when its wording overlaps a trend title.
let trendCache = { at: 0, geo: "", items: [] };
function decodeXml(value = "") {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCodePoint(parseInt(n, 16)));
}
function xmlTag(block, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  return decodeXml((block.match(re)?.[1] || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim());
}
async function getLiveTrends(geo = "US") {
  geo = /^[A-Z]{2}$/.test(String(geo).toUpperCase()) ? String(geo).toUpperCase() : "US";
  if (trendCache.geo === geo && Date.now() - trendCache.at < 10 * 60 * 1000) return trendCache.items;
  const response = await fetch(`https://trends.google.com/trending/rss?geo=${geo}`, {
    headers: { "User-Agent": "ProfitScout/1.0 (personal product research tool)", "Accept": "application/rss+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Google Trends feed returned HTTP ${response.status}`);
  const xml = await response.text();
  const items = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((m, index) => {
    const block = m[1];
    const title = xmlTag(block, "title");
    const traffic = xmlTag(block, "ht:approx_traffic");
    const pubDate = xmlTag(block, "pubDate");
    const newsBlock = block.match(/<ht:news_item(?:\s[^>]*)?>([\s\S]*?)<\/ht:news_item>/i)?.[1] || "";
    const newsTitle = xmlTag(newsBlock, "ht:news_item_title");
    const newsUrl = xmlTag(newsBlock, "ht:news_item_url");
    const newsSource = xmlTag(newsBlock, "ht:news_item_source");
    return { id: index + 1, title, traffic: traffic || "Not provided", pubDate, newsTitle, newsUrl, newsSource,
      trendUrl: `https://trends.google.com/trends/explore?geo=${geo}&q=${encodeURIComponent(title)}` };
  }).filter(x => x.title);
  trendCache = { at: Date.now(), geo, items };
  return items;
}
const STOP_WORDS = new Set(["the","and","for","with","from","this","that","your","best","new","how","what","why","when","where","near","today","latest","news","vs","2026","2025"]);
function words(text) { return String(text || "").toLowerCase().match(/[a-z0-9]+/g)?.filter(w => w.length > 2 && !STOP_WORDS.has(w)) || []; }
function attachTrendEvidence(product, trends, geo = "US") {
  const productWords = new Set(words(`${product.name} ${product.supplierSearch} ${product.niche}`));
  const matches = trends.map(t => ({ ...t, overlap: words(t.title).filter(w => productWords.has(w)) }))
    .filter(t => t.overlap.length > 0).slice(0, 3);
  return { ...product, trendEvidence: matches, trendMatchCount: matches.length,
    trendExploreUrl: `https://trends.google.com/trends/explore?geo=${geo}&q=${encodeURIComponent(product.name)}` };
}

function readClicks() {
  try { return JSON.parse(fs.readFileSync(CLICKS_FILE, "utf8")); }
  catch { return []; }
}
function writeClicks(items) {
  fs.writeFileSync(CLICKS_FILE, JSON.stringify(items.slice(-10000), null, 2));
}
function supplierUrl(product) {
  // Replace with a tracked destination from your affiliate network once approved.
  const envKey = `AFFILIATE_URL_${product.id.toUpperCase().replaceAll("-", "_")}`;
  if (process.env[envKey]) return process.env[envKey];
  const base = process.env.ALIEXPRESS_SEARCH_BASE || "https://www.aliexpress.com/w/wholesale-";
  return `${base}${encodeURIComponent(product.supplierSearch).replaceAll("%20", "-")}.html`;
}
function scoreProduct(p) {
  const grossMargin = Math.round(((p.price - p.cost) / p.price) * 100);
  // This is a transparent starter heuristic, not a measured demand signal.
  const score = Math.max(35, Math.min(88, Math.round(35 + grossMargin * 0.38 + (p.shipping === "Lightweight" ? 12 : 3))));
  return { ...p, grossMargin, demoScore: score, supplierUrl: `/go/${p.id}`, trendExploreUrl: `https://trends.google.com/trends/explore?geo=US&q=${encodeURIComponent(p.name)}` };
}

const aiProvider = (process.env.AI_PROVIDER || "ollama").toLowerCase();
app.get("/api/trends", async (req, res) => {
  const geo = String(req.query.geo || "US").toUpperCase();
  try {
    const trends = await getLiveTrends(geo);
    res.json({ source: "Google Trends Trending Now RSS", geo: /^[A-Z]{2}$/.test(geo) ? geo : "US",
      fetchedAt: new Date().toISOString(), cacheSeconds: 600,
      note: "These are live general search trends, not product sales or proof of purchase intent. Check individual product terms in Google Trends before spending money.", trends });
  } catch (err) {
    console.error("Live trends unavailable:", err.message);
    res.status(502).json({ error: `Live Google Trends could not be loaded: ${err.message}`, source: "Google Trends RSS" });
  }
});

app.get("/api/products", (_req, res) => {
  const enabled = aiProvider === "ollama" || (aiProvider === "openai" && Boolean(process.env.OPENAI_API_KEY)) || (aiProvider === "groq" && Boolean(process.env.GROQ_API_KEY));
  res.json({ products: products.map(scoreProduct), mode: enabled ? "ai-enabled" : "demo", provider: aiProvider, note: "The catalog is a starting shortlist. Use /api/trends for live general search topics and validate each product separately." });
});

app.post("/api/research", async (req, res) => {
  const { niche = "all", budget = 35, goal = "balanced", region = "United States" } = req.body || {};
  const baseCandidates = products.filter(p => (niche === "all" || p.niche.toLowerCase() === String(niche).toLowerCase()) && p.cost <= Number(budget));
  if (!baseCandidates.length) return res.json({ mode: "demo", summary: "No products match those filters. Increase the cost limit or select all niches.", results: [] });
  let liveTrends = [];
  try { liveTrends = await getLiveTrends("US"); } catch (e) { console.warn("Trend signal unavailable during research:", e.message); }
  const candidates = baseCandidates.map(p => attachTrendEvidence(scoreProduct(p), liveTrends));

  if (aiProvider !== "ollama" && !(aiProvider === "openai" && process.env.OPENAI_API_KEY) && !(aiProvider === "groq" && process.env.GROQ_API_KEY)) {
    return res.json({
      mode: "demo",
      source: liveTrends.length ? "Google Trends Trending Now RSS" : "catalog only",
      summary: `Local AI is not enabled in server settings. Live Google Trends topics were ${liveTrends.length ? "loaded" : "unavailable"}; topic matches are weak signals, not proof of product sales.` ,
      results: candidates.sort((a,b)=>(b.trendMatchCount-a.trendMatchCount) || b.demoScore-a.demoScore).slice(0,8)
    });
  }
  try {
    const prompt = `You are a cautious ecommerce product research analyst. Evaluate these candidate dropshipping products for ${region}. Goal: ${goal}. Budget is estimated supplier cost per unit <= ${budget}. Do not invent sales volume, ad metrics, supplier ratings, or current prices. Google Trends signals below are general search topics and are not proof of product demand. Rank up to 8 products, treating a direct title overlap with a live trend as weak exploratory evidence only. Return valid JSON with keys summary and results. Each result must include id, opportunityScore (0-100), rationale, risks (array of strings), validationSteps (array of strings), demandEvidence (cite exact supplied trend titles only, otherwise "No direct match in current Google Trending Now feed"), and suggestedAngle. Candidate data with live trend overlaps: ${JSON.stringify(candidates.map(p=>({...p, supplierSearch:undefined})))}`;
    let parsed;
    if (aiProvider === "ollama") {
      const response = await fetch(process.env.OLLAMA_URL || "http://127.0.0.1:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
          prompt,
          format: "json",
          stream: false
        })
      });
      if (!response.ok) throw new Error(`Ollama returned ${response.status}. Check that Ollama is running and the model is installed.`);
      const data = await response.json();
      parsed = JSON.parse(data.response);
    } else if (aiProvider === "groq") {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "Return only valid JSON. Do not invent market data." },
            { role: "user", content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 3500,
          response_format: { type: "json_object" }
        })
      });
      if (!response.ok) throw new Error(`Groq API returned ${response.status}. Check your GROQ_API_KEY and free-tier limits.`);
      const data = await response.json();
      const output = data.choices?.[0]?.message?.content;
      if (!output) throw new Error("Groq returned an empty response.");
      parsed = JSON.parse(output);
    } else {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
          input: prompt,
          text: { format: { type: "json_object" } }
        })
      });
      if (!response.ok) throw new Error(`OpenAI API returned ${response.status}`);
      const data = await response.json();
      const output = data.output_text || data.output?.flatMap(x => x.content || []).find(x => x.type === "output_text")?.text;
      parsed = JSON.parse(output);
    }
    const enriched = (parsed.results || []).map(r => {
      const p = candidates.find(x => x.id === r.id);
      return p ? { ...p, ...r, supplierUrl: `/go/${p.id}` } : null;
    }).filter(Boolean);
    const trendNote = liveTrends.length ? ` Live source: Google Trends Trending Now RSS (${liveTrends.length} topics fetched); direct matches are shown on each product. This is not sales data.` : " Live trend feed was unavailable, so this run uses catalog data only.";
    res.json({ mode: "ai", source: "Google Trends Trending Now RSS", summary: (parsed.summary || "AI-assisted evaluation complete.") + trendNote, fetchedAt: new Date().toISOString(), results: enriched });
  } catch (err) {
    console.error("AI research failed:", err.message);
    res.status(502).json({ error: `AI research failed: ${err.message}` });
  }
});

app.get("/go/:id", (req, res) => {
  const p = products.find(x => x.id === req.params.id);
  if (!p) return res.status(404).send("Product not found");
  const url = supplierUrl(p);
  const clicks = readClicks();
  clicks.push({ productId: p.id, productName: p.name, timestamp: new Date().toISOString(), referrer: String(req.get("referer") || "").slice(0, 500), userAgent: String(req.get("user-agent") || "").slice(0, 300) });
  writeClicks(clicks);
  res.redirect(302, url);
});

app.get("/api/admin/clicks", (req, res) => {
  const token = process.env.ANALYTICS_ADMIN_TOKEN;
  if (!token || req.get("authorization") !== `Bearer ${token}`) return res.status(401).json({ error: "Unauthorized" });
  const clicks = readClicks();
  const byProduct = {};
  for (const c of clicks) byProduct[c.productId] = (byProduct[c.productId] || 0) + 1;
  res.json({ totalClicks: clicks.length, byProduct, recent: clicks.slice(-100).reverse() });
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`ProfitScout running on http://localhost:${PORT}`));
