export const CLIENT_MOTION = Object.freeze({
  runAcceleration: 1800,
  airAcceleration: 900,
  maxRunSpeed: 320,
  groundFriction: 2200,
  gravity: 1900,
  maxFallSpeed: 900,
  jumpSpeed: 690,
  coyoteSeconds: 0.08,
  worldWidth: 2400,
  floorY: 620,
  playerWidth: 40,
  playerHeight: 72,
});

const toward = (value, target, delta) =>
  value < target ? Math.min(value + delta, target) : Math.max(value - delta, target);

export function copyBody(source) {
  return {
    x: source.x,
    y: source.y,
    vx: source.vx,
    vy: source.vy,
    grounded: source.grounded,
    facing: source.facing < 0 ? -1 : 1,
    coyoteRemaining: source.grounded ? CLIENT_MOTION.coyoteSeconds : 0,
  };
}

export function simulatePredicted(body, input, deltaSeconds) {
  const dt = Math.min(Math.max(deltaSeconds, 0), 0.05);
  const axis = Number(input.right) - Number(input.left);
  if (axis !== 0) {
    body.facing = axis;
    const acceleration = body.grounded
      ? CLIENT_MOTION.runAcceleration
      : CLIENT_MOTION.airAcceleration;
    body.vx = toward(body.vx, axis * CLIENT_MOTION.maxRunSpeed, acceleration * dt);
  } else if (body.grounded) {
    body.vx = toward(body.vx, 0, CLIENT_MOTION.groundFriction * dt);
  }

  body.coyoteRemaining = body.grounded
    ? CLIENT_MOTION.coyoteSeconds
    : Math.max(0, body.coyoteRemaining - dt);
  if (input.jump && body.coyoteRemaining > 0) {
    body.vy = -CLIENT_MOTION.jumpSpeed;
    body.grounded = false;
    body.coyoteRemaining = 0;
  }

  body.vy = Math.min(body.vy + CLIENT_MOTION.gravity * dt, CLIENT_MOTION.maxFallSpeed);
  body.x += body.vx * dt;
  body.y += body.vy * dt;

  const maxX = CLIENT_MOTION.worldWidth - CLIENT_MOTION.playerWidth;
  if (body.x < 0) { body.x = 0; body.vx = 0; }
  if (body.x > maxX) { body.x = maxX; body.vx = 0; }
  const floor = CLIENT_MOTION.floorY - CLIENT_MOTION.playerHeight;
  if (body.y >= floor) {
    body.y = floor;
    body.vy = 0;
    body.grounded = true;
  } else {
    body.grounded = false;
  }
}

export class LocalPlayerPredictor {
  constructor() {
    this.body = null;
    this.history = [];
    this.maxHistoryFrames = 240;
  }

  initialize(authoritativeState) {
    this.body = copyBody(authoritativeState);
    this.history.length = 0;
  }

  step(input, sequence, deltaSeconds) {
    if (!this.body) return null;
    const frame = {
      sequence,
      input: { left: input.left, right: input.right, jump: input.jump },
      deltaSeconds: Math.min(Math.max(deltaSeconds, 0), 0.05),
    };
    simulatePredicted(this.body, frame.input, frame.deltaSeconds);
    this.history.push(frame);
    if (this.history.length > this.maxHistoryFrames) this.history.shift();
    return this.body;
  }

  reconcile(authoritativeState) {
    if (!this.body) return this.initialize(authoritativeState);
    const acknowledged = authoritativeState.lastProcessedInputSequence ?? 0;
    this.history = this.history.filter(frame => frame.sequence > acknowledged);
    this.body = copyBody(authoritativeState);
    for (const frame of this.history) {
      simulatePredicted(this.body, frame.input, frame.deltaSeconds);
    }
    return this.body;
  }

  getState() {
    return this.body;
  }
}
