import choose from '../index.mjs';

function calcPiMonteCarlo() {
  const start = process.hrtime.bigint();
  let insideCircle = 0;
  const N = 10000;
  for (let i = 0; i < N; i++) {
    const x = Math.random() * 2 - 1; // [-1, 1]
    const y = Math.random() * 2 - 1; // [-1, 1]
    if (x * x + y * y <= 1) {
      insideCircle++;
    }
  }
  const pi = 4 * insideCircle / N;
  const end = process.hrtime.bigint();
  return { method: 'Monte Carlo', pi, time: Number(end - start) / 1e6 };
}

function calcPiLeibniz() {
  const start = process.hrtime.bigint();
  let pi = 0;
  const N = 10000;
  for (let i = 0; i < N; i++) {
    const term = (i % 2 === 0 ? 1 : -1) / (2 * i + 1);
    pi += term;
  }
  pi *= 4;
  const end = process.hrtime.bigint();
  return { method: 'Leibniz Series', pi, time: Number(end - start) / 1e6 };
}

const optimizePi = choose(calcPiMonteCarlo, calcPiLeibniz);

async function run() {
  console.log("Starting Math Pi test...");
  console.log("Comparing Monte Carlo (10,000 draws) vs Leibniz Series (10,000 terms).\n");

  for (let i = 1; i <= 20; i++) {
    try {
      // Small sleep so we don't completely lock the event loop, though this is synchronous work
      await new Promise(r => setTimeout(r, 10)); 
      
      const result = await optimizePi();
      console.log(`[Call ${i.toString().padStart(2, ' ')}] Chosen: ${result.method.padEnd(14, ' ')} | Pi: ${result.pi.toFixed(6)} | Time: ${result.time.toFixed(4).padStart(8, ' ')}ms`);
    } catch (err) {
      console.error(`[Call ${i}] Failed:`, err);
    }
  }
}

run();
