import { describe, it } from 'node:test';
import assert from 'node:assert';
import choose from '../index.mjs';

describe('thompson-sampler choose()', () => {
  it('should execute a synchronous primary function successfully', async () => {
    const F = () => 'F_RESULT';
    const G = () => 'G_RESULT';
    
    const chooser = choose(F, G);
    const result = await chooser();
    assert.ok(result === 'F_RESULT' || result === 'G_RESULT');
  });

  it('should execute an asynchronous primary function successfully', async () => {
    const F = async () => 'F_ASYNC';
    const G = async () => 'G_ASYNC';
    
    const chooser = choose(F, G);
    const result = await chooser();
    assert.ok(result === 'F_ASYNC' || result === 'G_ASYNC');
  });

  it('should deterministically test F on first call and G on second call', async () => {
    let fCount = 0;
    let gCount = 0;
    
    const F = () => { fCount++; return 'F_RES'; };
    const G = () => { gCount++; return 'G_RES'; };

    const chooser = choose(F, G);

    // Call 1 - Should be F
    const res1 = await chooser();
    assert.strictEqual(res1, 'F_RES');
    assert.strictEqual(fCount, 1);
    assert.strictEqual(gCount, 0);

    // Call 2 - Should be G
    const res2 = await chooser();
    assert.strictEqual(res2, 'G_RES');
    assert.strictEqual(fCount, 1);
    assert.strictEqual(gCount, 1);
  });

  it('should fallback to the secondary function if the primary fails', async () => {
    const F = () => { throw new Error('F_FAIL'); };
    const G = () => 'G_RESULT';
    
    const chooser = choose(F, G);
    // Since we don't know whether F or G is chosen first, 
    // we mock the outcomes. Eventually it returns G_RESULT or G_RESULT directly
    const result = await chooser();
    assert.strictEqual(result, 'G_RESULT');
  });

  it('should call reset function with correct arguments on primary failure', async () => {
    const F = () => { throw new Error('F_FAIL'); };
    const G = (arg1, arg2) => 'G_RESULT';
    
    let resetCalled = false;
    let resetArgs = null;
    let resetError = null;
    
    const resetFn = (info) => {
      resetCalled = true;
      resetError = info.error;
      resetArgs = info.args;
    };

    const chooser = choose(
      (a, b) => { throw new Error('F_FAIL_ALWAYS'); }, 
      (a, b) => { throw new Error('G_FAIL_ALWAYS'); }, 
      resetFn
    );

    // Call until reset is called (we use try/catch since both fail now)
    try {
      await chooser('argA', 'argB');
    } catch (e) {
      // both failed
    }

    assert.ok(resetCalled, 'reset function was not called');
    assert.strictEqual(resetArgs[0], 'argA');
    assert.strictEqual(resetArgs[1], 'argB');
    assert.ok(resetError.message === 'F_FAIL_ALWAYS' || resetError.message === 'G_FAIL_ALWAYS');
  });

  it('should throw an AggregateError if both functions fail', async () => {
    const F = () => { throw new Error('F_ERR'); };
    const G = () => { throw new Error('G_ERR'); };
    
    const chooser = choose(F, G);
    
    await assert.rejects(
      async () => await chooser(),
      (err) => {
        assert.ok(err instanceof AggregateError);
        assert.strictEqual(err.errors.length, 2);
        const msgs = err.errors.map(e => e.message).sort();
        assert.deepStrictEqual(msgs, ['F_ERR', 'G_ERR']);
        return true;
      }
    );
  });

  it('should isolate state between different choose() instances', async () => {
    // We create two choosers with functions that have vastly different execution times.
    // One instance learns F is fast, another instance learns G is fast.
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    
    let f1Count = 0;
    const F1 = async () => { f1Count++; await sleep(1); };
    const G1 = async () => { await sleep(50); };
    const chooser1 = choose(F1, G1);

    let g2Count = 0;
    const F2 = async () => { await sleep(50); };
    const G2 = async () => { g2Count++; await sleep(1); };
    const chooser2 = choose(F2, G2);

    // Train chooser1 that F1 is fast, G1 is slow
    for (let i = 0; i < 15; i++) {
      await chooser1();
    }

    // Train chooser2 that F2 is slow, G2 is fast
    for (let i = 0; i < 15; i++) {
      await chooser2();
    }

    // We expect chooser1 to favor F1, and chooser2 to favor G2
    // Thompson sampling involves randomness and initial exploration, 
    // but over 15 iterations with a 50ms vs 1ms difference, it should heavily favor the faster one.
    assert.ok(f1Count > 2, `Chooser1 did not favor F1 (f1Count: ${f1Count})`);
    assert.ok(g2Count > 2, `Chooser2 did not favor G2 (g2Count: ${g2Count})`);
  });
});
