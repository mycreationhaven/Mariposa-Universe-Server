import { describe, expect, it } from 'vitest';
import {
  CLIENT_MOTION,
  LocalCorrectionSmoother,
  LocalPlayerPredictor,
} from '../client/construct3/MariposaPrediction.js';

const serverState = (overrides = {}) => ({
  x: 200,
  y: 548,
  vx: 0,
  vy: 0,
  grounded: true,
  facing: 1,
  lastProcessedInputSequence: 0,
  ...overrides,
});

describe('local prediction and reconciliation', () => {
  it('responds before the next server snapshot', () => {
    const predictor = new LocalPlayerPredictor();
    predictor.initialize(serverState());
    predictor.step({ left: false, right: true, jump: false }, 1, 1 / 60);
    expect(predictor.getState().x).toBeGreaterThan(200);
  });

  it('drops acknowledged frames and replays only pending input', () => {
    const predictor = new LocalPlayerPredictor();
    predictor.initialize(serverState());
    predictor.step({ left: false, right: true, jump: false }, 1, 1 / 60);
    predictor.step({ left: false, right: true, jump: false }, 2, 1 / 60);
    predictor.reconcile(serverState({ x: 201, vx: 30, lastProcessedInputSequence: 1 }));
    expect(predictor.history.every((frame) => frame.sequence > 1)).toBe(true);
    expect(predictor.getState().x).toBeGreaterThan(201);
  });

  it('uses the same speed and floor constraints as the server', () => {
    const predictor = new LocalPlayerPredictor();
    predictor.initialize(serverState());
    for (let i = 1; i < 300; i++) {
      predictor.step({ left: false, right: true, jump: false }, i, 1 / 60);
    }
    expect(predictor.getState().vx).toBe(CLIENT_MOTION.maxRunSpeed);
    expect(predictor.getState().y).toBe(CLIENT_MOTION.floorY - CLIENT_MOTION.playerHeight);
  });
});

describe('visual correction smoothing', () => {
  it('softens a small correction without changing predicted physics', () => {
    const smoother = new LocalCorrectionSmoother({ halfLifeSeconds: 0.06, snapDistance: 120 });
    const before = serverState({ x: 110 });
    const corrected = serverState({ x: 100 });
    smoother.addCorrection(before, corrected);
    const rendered = smoother.sample(corrected, 1 / 60);
    expect(rendered.x).toBeGreaterThan(100);
    expect(rendered.x).toBeLessThan(110);
    expect(corrected.x).toBe(100);
  });

  it('converges visually and snaps large corrections', () => {
    const smoother = new LocalCorrectionSmoother({ halfLifeSeconds: 0.03, snapDistance: 120 });
    const corrected = serverState({ x: 100 });
    smoother.addCorrection(serverState({ x: 110 }), corrected);
    for (let frame = 0; frame < 60; frame++) smoother.sample(corrected, 1 / 60);
    expect(smoother.sample(corrected, 1 / 60).x).toBeCloseTo(100, 2);

    smoother.addCorrection(serverState({ x: 400 }), corrected);
    expect(smoother.sample(corrected, 0).x).toBe(100);
  });
});
