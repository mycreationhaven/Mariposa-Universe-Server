import { describe, expect, it } from 'vitest';
import { CLIENT_MOTION, LocalPlayerPredictor } from '../client/construct3/MariposaPrediction.js';

const serverState = (overrides = {}) => ({
  x: 200, y: 548, vx: 0, vy: 0, grounded: true, facing: 1,
  lastProcessedInputSequence: 0, ...overrides,
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
    expect(predictor.history.every(frame => frame.sequence > 1)).toBe(true);
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
