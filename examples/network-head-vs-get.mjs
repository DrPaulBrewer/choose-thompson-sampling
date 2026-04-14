import choose from '../index.mjs';

// Random delay between 1-2 seconds
const randomDelay = () => new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

const url = 'https://google.com';

async function fetchHead1() {
  const start = process.hrtime.bigint();
  const res = await fetch(url, { method: 'HEAD' });
  const contentLength = res.headers.get('content-length');
  if (!isFinite(contentLength))
    throw new Error("cannot read content-length, not a number");
  const end = process.hrtime.bigint();
  return { method: 'fetch:HEAD', time: Number(end - start) / 1e6, contentLength };
}

async function fetchHead2(){
  const start = process.hrtime.bigint();
  const res = await https.request(url, { method: 'HEAD' });
  const contentLength = res.headers.get('content-length');
  if (!isFinite(contentLength))
    throw new Error("cannot read content-length, not a number");
  const end = process.hrtime.bigint();
  return { method: 'https: HEAD', time: Number(end - start) / 1e6, contentLength };
}

async function fetchGet() {
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
      console.log(`[Call ${i.toString().padStart(2, ' ')}] Chosen: ${result.method.padEnd(4, ' ')} | Time: ${result.time.toFixed(2).padStart(6, ' ')}ms | Length: ${result.contentLength}`);
    } catch (err) {
      console.error(`[Call ${i}] Failed:`, err);
    }
  }

  console.log("Now we try https HEAD vs fetch GET...");

  for (let i = 1; i <= 20; i++) {
    await randomDelay();
    try {
      const result = await optimizeFetch2();
      console.log(`[Call ${i.toString().padStart(2, ' ')}] Chosen: ${result.method.padEnd(4, ' ')} | Time: ${result.time.toFixed(2).padStart(6, ' ')}ms | Length: ${result.contentLength}`);
    } catch (err) {
      console.error(`[Call ${i}] Failed:`, err);
    }
  }

}

run();
