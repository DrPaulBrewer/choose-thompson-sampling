// Hybrid of AI Generated Code with Google Gemini 3 and human review

import pkg from 'jstat';
const { jStat: jstat } = pkg;

const T = process.hrtime.bigint;

/**
 * Returns an async function that stochastically chooses between F and G.
 * Supports both synchronous and Promise-returning functions.
 */
export default function choose(F, G, reset) {
  const stats = {
    lambda: 0.99,
    F: { mu: 7.0, v: 1.0, alpha: 2.0, beta: 2.0 },
    G: { mu: 7.0, v: 1.0, alpha: 2.0, beta: 2.0 }
  };
  
  let callCount = 0;

  const wrapper = async function(...args) {
    let primaryKey;

    if (callCount === 0) {
      primaryKey = 'F';
    } else if (callCount === 1) {
      primaryKey = 'G';
    } else {
      const scoreF = sampleModel(stats.F);
      const scoreG = sampleModel(stats.G);
      primaryKey = scoreF < scoreG ? 'F' : 'G';
    }
    
    callCount++;

    const fallbackKey = primaryKey === 'F' ? 'G' : 'F';
    const primaryFn = primaryKey === 'F' ? F : G;
    const fallbackFn = fallbackKey === 'F' ? F : G;

    let result;
    const start = T();

    try {
      // await handles both Promises and immediate values
      result = await primaryFn(...args);
      const end = T();
      
      updateWithObs(stats[primaryKey], Number(end - start) / 1e6, false, stats.lambda);
    } catch (err) {
      const failPoint = T();
      
      // Fallback execution on primary failure
      try { 
        if (typeof reset === 'function') reset({error: err, args: [...args]});
        result = await fallbackFn(...args);
        const end = T();

        // Penalty: Primary charged for total time including fallback wait
      updateWithObs(stats[primaryKey], Number(end - start) / 1e6, true, stats.lambda);
      
        // Data: Fallback charged only for its own successful duration
        updateWithObs(stats[fallbackKey], Number(end - failPoint) / 1e6, false, stats.lambda);
      } catch(err2){ 
          throw new AggregateError([err, err2], "Both functions failed");
      }
    }

    return result;
  };

  const readOnlyHandler = {
    get(target, prop, receiver) {
      const val = Reflect.get(target, prop, receiver);
      if (typeof val === 'object' && val !== null) {
        return new Proxy(val, readOnlyHandler);
      }
      return val;
    },
    set() {
      throw new TypeError("Cannot modify read-only model parameters");
    },
    defineProperty() {
      throw new TypeError("Cannot modify read-only model parameters");
    },
    deleteProperty() {
      throw new TypeError("Cannot modify read-only model parameters");
    }
  };

  wrapper.stats = new Proxy(stats, readOnlyHandler);

  return wrapper;
}

function updateWithObs(m, msObs, applyCap, lambda) {
  let finalMs = Math.max(msObs, 0.001);
  
  if (applyCap && m.alpha > 1) { // Alpha > 1 required for variance estimate
    const estVar = m.beta / (m.alpha - 1);
    const p95 = Math.exp(jstat.normal.inv(0.95, m.mu, Math.sqrt(estVar)));
    finalMs = Math.min(finalMs, p95);
  }

  const logObs = Math.log(finalMs);
  
  // Apply discount factor
  m.v *= lambda;
  m.alpha *= lambda;
  
  const nextV = m.v + 1;
  const nextMu = (m.v * m.mu + logObs) / nextV;
  
  m.beta = m.beta + (m.v * Math.pow(logObs - m.mu, 2)) / (2 * nextV);
  m.mu = nextMu;
  m.v = nextV;
  m.alpha += 0.5;
}

function sampleModel(m) {
  const precision = jstat.gamma.sample(m.alpha, 1 / m.beta);
  const stdDev = Math.sqrt(1 / (precision * m.v));
  return Math.exp(jstat.normal.sample(m.mu, stdDev));
}
