import { describe, expect, it } from 'vitest';
import { LocalPlayerPredictor } from '../client/construct3/MariposaPrediction.js';

class SeededNetworkLink {
  constructor({ latencyMs, jitterMs, lossRate, seed }) {
    this.latencyMs = latencyMs;
    this.jitterMs = jitterMs;
    this.lossRate = lossRate;
    this.state = seed >>> 0;
    this.queue = [];
  }

  random() {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  send(payload, now) {
    if (this.random() < this.lossRate) return false;
    const jitter = (this.random() * 2 - 1) * this.jitterMs;
    this.queue.push({ deliverAt: now + Math.max(0, this.latencyMs + jitter), payload });
    this.queue.sort((left, right) => left.deliverAt - right.deliverAt);
    return true;
  }

  receive(now) {
    const delivered = [];
    while (this.queue[0]?.deliverAt <= now) delivered.push(this.queue.shift().payload);
    return delivered;
  }
}

const authoritative = (sequence) => ({
  x: 120 + sequence * 2,
  y: 548,
  vx: sequence === 0 ? 0 : 120,
  vy: 0,
  grounded: true,
  facing: 1,
  lastProcessedInputSequence: sequence,
});

describe('network-condition simulation', () => {
  it('is deterministic for a fixed seed and preserves delivery order', () => {
    const run = () => {
      const link = new SeededNetworkLink({ latencyMs: 100, jitterMs: 40, lossRate: 0.2, seed: 42 });
      for (let sequence = 1; sequence <= 20; sequence++) link.send(sequence, sequence * 16);
      return link.receive(1_000);
    };
    expect(run()).toEqual(run());
    expect(run().length).toBeGreaterThan(10);
  });

  it('reconciles after delayed, jittered, and lost snapshots', () => {
    const link = new SeededNetworkLink({ latencyMs: 120, jitterMs: 55, lossRate: 0.25, seed: 7 });
    const predictor = new LocalPlayerPredictor();
    predictor.initialize(authoritative(0));
    let now = 0;
    for (let sequence = 1; sequence <= 120; sequence++) {
      now += 1000 / 60;
      predictor.step({ left: false, right: true, jump: false }, sequence, 1 / 60);
      link.send(authoritative(sequence), now);
      for (const snapshot of link.receive(now)) predictor.reconcile(snapshot);
    }

    const final = authoritative(120);
    predictor.reconcile(final);
    expect(predictor.history).toHaveLength(0);
    expect(predictor.getState()).toMatchObject({ x: final.x, y: final.y, vx: final.vx });
  });

  it('bounds prediction history during a prolonged outage', () => {
    const predictor = new LocalPlayerPredictor();
    predictor.initialize(authoritative(0));
    for (let sequence = 1; sequence <= 1_000; sequence++) {
      predictor.step({ left: false, right: true, jump: false }, sequence, 1 / 60);
    }
    expect(predictor.history).toHaveLength(240);
  });
});
