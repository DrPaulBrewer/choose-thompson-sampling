import choose from '../index.mjs';

// Random delay between 1-2 seconds
const randomDelay = () => new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

async function fetchHead() {
  const start = process.hrtime.bigint();
  const res = await fetch('https://github.com/index.html', { method: 'HEAD' });
  const contentLength = res.headers.get('content-length');
  const end = process.hrtime.bigint();
  return { method: 'HEAD', time: Number(end - start) / 1e6, contentLength };
}

async function fetchGet() {
  const start = process.hrtime.bigint();
  const res = await fetch('https://github.com/index.html', { method: 'GET' });
  // Read body to actually finish GET request
  const text = await res.text();
  const contentLength = text.length; 
  const end = process.hrtime.bigint();
  return { method: 'GET', time: Number(end - start) / 1e6, contentLength };
}

const optimizeFetch = choose(fetchHead, fetchGet);

async function run() {
  console.log("Starting HEAD vs GET test...");
  console.log("We will repeatedly request https://github.com/index.html.");
  console.log("HEAD should be faster than GET. Watch how the sampler learns over time.\n");

  for (let i = 1; i <= 20; i++) {
    await randomDelay();
    try {
      const result = await optimizeFetch();
      console.log(`[Call ${i.toString().padStart(2, ' ')}] Chosen: ${result.method.padEnd(4, ' ')} | Time: ${result.time.toFixed(2).padStart(6, ' ')}ms | Length: ${result.contentLength}`);
    } catch (err) {
      console.error(`[Call ${i}] Failed:`, err);
    }
  }
}

run();
