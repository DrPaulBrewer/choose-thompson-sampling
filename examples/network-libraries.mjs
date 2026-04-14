import choose from '../index.mjs';
import axios from 'axios';
import request from 'request';
import https from 'https';

const url = 'https://google.com'

// Random delay between 1-2 seconds
const randomDelay = () => new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

async function fetchWithNodeFetch() {
  const start = process.hrtime.bigint();
  const res = await fetch(url);
  await res.text();
  const end = process.hrtime.bigint();
  return { lib: 'node:fetch', time: Number(end - start) / 1e6 };
}

async function fetchWithAxios() {
  const start = process.hrtime.bigint();
  await axios.get(url);
  const end = process.hrtime.bigint();
  return { lib: 'axios', time: Number(end - start) / 1e6 };
}

async function fetchWithRequest() {
  const start = process.hrtime.bigint();
  return new Promise((resolve, reject) => {
    request(url, (error, response, body) => {
      if (error) return reject(error);
      const end = process.hrtime.bigint();
      resolve({ lib: 'request', time: Number(end - start) / 1e6 });
    });
  });
}

async function fetchWithHttps() {
  const start = process.hrtime.bigint();
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const end = process.hrtime.bigint();
        resolve({ lib: 'https', time: Number(end - start) / 1e6 });
      });
    }).on('error', reject);
  });
}


const optimizeFetchVsAxios = choose(fetchWithNodeFetch, fetchWithAxios);
const optimizeHttpsVsRequest = choose(fetchWithHttps, fetchWithRequest);

async function run() {
  console.log("Starting Network Libraries Comparison...");
  console.log("We will repeatedly GET https://google.com with different libraries.\n");

  console.log("--- TEST 1: node:fetch vs axios ---");
  for (let i = 1; i <= 20; i++) {
    await randomDelay();
    try {
      const result = await optimizeFetchVsAxios();
      console.log(`[Call ${i.toString().padStart(2, ' ')}] Chosen: ${result.lib.padEnd(11, ' ')} | Time: ${result.time.toFixed(2).padStart(6, ' ')}ms`);
    } catch (err) {
      console.error(`[Call ${i}] Failed:`, err);
    }
  }

  console.log("\n--- TEST 2: node:https vs request ---");
  for (let i = 1; i <= 20; i++) {
    await randomDelay();
    try {
      const result = await optimizeHttpsVsRequest();
      console.log(`[Call ${i.toString().padStart(2, ' ')}] Chosen: ${result.lib.padEnd(11, ' ')} | Time: ${result.time.toFixed(2).padStart(6, ' ')}ms`);
    } catch (err) {
      console.error(`[Call ${i}] Failed:`, err);
    }
  }
}

run();
