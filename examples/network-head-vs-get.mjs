import choose from '../index.mjs';
import https from 'https';

// Random delay between 1-2 seconds
const randomDelay = () => new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

const url = 'https://google.com';

function isValidContentLength(contentLength) {
  return contentLength !== null && contentLength.toString().trim() !== '' && isFinite(contentLength);
}

async function fetchHead1() {
  console.log("  -> [fetchHead1] Attempting fetch HEAD request...");
  const start = process.hrtime.bigint();
  const res = await fetch(url, { method: 'HEAD' });
  const contentLength = res.headers.get('content-length');
  if (!isValidContentLength(contentLength)) {
    console.error("  -> [fetchHead1] Failed: cannot read content-length, not a number");
    throw new Error("cannot read content-length, not a number");
  }
  const end = process.hrtime.bigint();
  return { method: 'fetch:HEAD', time: Number(end - start) / 1e6, contentLength };
}

async function fetchHead2(){
  console.log("  -> [fetchHead2] Attempting https HEAD request...");
  const start = process.hrtime.bigint();
  const res = await new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'HEAD' }, resolve);
    req.on('error', reject);
    req.end();
  });
  const contentLength = res.headers['content-length'];
  if (!isValidContentLength(contentLength)) {
    console.error("  -> [fetchHead2] Failed: cannot read content-length, not a number");
    throw new Error("cannot read content-length, not a number");
  }
  const end = process.hrtime.bigint();
  return { method: 'https: HEAD', time: Number(end - start) / 1e6, contentLength };
}

async function fetchGet() {
  console.log("  -> [fetchGet] Attempting fetch GET request...");
  const start = process.hrtime.bigint();
  const res = await fetch(url, { method: 'GET' });
  // Read body to actually finish GET request
  const text = await res.text();
  const contentLength = text.length; 
  const end = process.hrtime.bigint();
  return { method: 'GET', time: Number(end - start) / 1e6, contentLength };
}

const optimizeFetch1 = choose(fetchHead1, fetchGet);
const optimizeFetch2 = choose(fetchHead2, fetchGet)

async function run() {
  console.log("Starting fetch HEAD vs fetch GET test...");
  console.log("We will repeatedly request ",url);
  console.log("HEAD should be faster than GET. Watch how the sampler learns over time.\n");

  for (let i = 1; i <= 20; i++) {
    await randomDelay();
    try {
      const result = await optimizeFetch1();
      console.log(`[Call ${i.toString().padStart(2, ' ')}] Chosen: ${result.method.padEnd(10, ' ')} | Time: ${result.time.toFixed(2).padStart(6, ' ')}ms | Length: ${result.contentLength}`);
      console.log(`   Stats F (fetchHead): mu=${optimizeFetch1.stats.F.mu.toFixed(2)} v=${optimizeFetch1.stats.F.v.toFixed(2)} | G (fetchGet): mu=${optimizeFetch1.stats.G.mu.toFixed(2)} v=${optimizeFetch1.stats.G.v.toFixed(2)}`);
    } catch (err) {
      console.error(`[Call ${i}] Failed:`, err);
    }
  }

  console.log("Now we try https HEAD vs fetch GET...");

  for (let i = 1; i <= 20; i++) {
    await randomDelay();
    try {
      const result = await optimizeFetch2();
      console.log(`[Call ${i.toString().padStart(2, ' ')}] Chosen: ${result.method.padEnd(10, ' ')} | Time: ${result.time.toFixed(2).padStart(6, ' ')}ms | Length: ${result.contentLength}`);
      console.log(`   Stats F (httpsHead): mu=${optimizeFetch2.stats.F.mu.toFixed(2)} v=${optimizeFetch2.stats.F.v.toFixed(2)} | G (fetchGet): mu=${optimizeFetch2.stats.G.mu.toFixed(2)} v=${optimizeFetch2.stats.G.v.toFixed(2)}`);
    } catch (err) {
      console.error(`[Call ${i}] Failed:`, err);
    }
  }

}

run();
