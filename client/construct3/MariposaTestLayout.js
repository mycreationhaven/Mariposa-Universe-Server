import { mariposaNetwork } from './MariposaNetwork.js';
import { LocalPlayerPredictor } from './MariposaPrediction.js';

const CONFIG = Object.freeze({
  endpoint: 'ws://localhost:2567',
  zone: 'development_test_zone',
  layer: 'Game',
  sendIntervalMs: 50,
});

class TestLayoutController {
  constructor(runtime) {
    this.runtime = runtime;
    this.keys = new Set();
    this.remoteSprites = new Map();
    this.lastSendAt = 0;
    this.lastInputKey = '';
    this.jumpQueued = false;
    this.currentSequence = 0;
    this.predictor = new LocalPlayerPredictor();
  }

  async start() {
    this.runtime.addEventListener('keydown', event => this.onKeyDown(event));
    this.runtime.addEventListener('keyup', event => this.onKeyUp(event));
    this.runtime.addEventListener('tick', () => this.tick());
    mariposaNetwork.addEventListener('connected', () => this.setStatus('Connected'));
    mariposaNetwork.addEventListener('joined', event =>
      this.setStatus(`Joined ${event.detail.zone}`),
    );
    mariposaNetwork.addEventListener('disconnected', event => {
      this.setStatus(`Disconnected (${event.detail.code})`);
      this.clearRemoteSprites();
    });
    mariposaNetwork.addEventListener('statechange', () => this.reconcileLocalPlayer());

    this.setStatus('Connecting…');
    try {
      await mariposaNetwork.Connect(CONFIG.endpoint);
      await mariposaNetwork.AuthenticateDevelopment(`Construct-${crypto.randomUUID().slice(0, 6)}`);
      await mariposaNetwork.JoinZone(CONFIG.zone);
    } catch (error) {
      console.error('Mariposa connection failed', error);
      this.setStatus(`Connection failed: ${error.message}`);
    }
  }

  onKeyDown(event) {
    this.keys.add(event.code);
    if ((event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') && !event.repeat) {
      this.jumpQueued = true;
    }
  }

  onKeyUp(event) {
    this.keys.delete(event.code);
  }

  tick() {
    const input = this.readInput();
    this.sendInput(input);
    this.stepPrediction(input);
    this.renderLocalPlayer();
    this.renderRemotePlayers();
  }

  readInput() {
    return {
      left: this.keys.has('ArrowLeft') || this.keys.has('KeyA'),
      right: this.keys.has('ArrowRight') || this.keys.has('KeyD'),
      jump: this.jumpQueued,
    };
  }

  sendInput(input) {
    if (!mariposaNetwork.IsConnected()) return;
    const inputKey = `${input.left}:${input.right}`;
    const now = performance.now();
    if (!this.jumpQueued && inputKey === this.lastInputKey && now - this.lastSendAt < CONFIG.sendIntervalMs) return;
    this.currentSequence = mariposaNetwork.SendInput(input.left, input.right, input.jump);
    this.jumpQueued = false;
    this.lastInputKey = inputKey;
    this.lastSendAt = now;
  }

  stepPrediction(input) {
    const authoritative = mariposaNetwork.GetLocalPlayer();
    if (!authoritative) return;
    if (!this.predictor.getState()) this.predictor.initialize(authoritative);
    this.predictor.step(input, this.currentSequence, this.runtime.dt);
  }

  reconcileLocalPlayer() {
    const authoritative = mariposaNetwork.GetLocalPlayer();
    if (authoritative) this.predictor.reconcile(authoritative);
  }

  renderLocalPlayer() {
    const state = this.predictor.getState() ?? mariposaNetwork.GetLocalPlayer();
    const sprite = this.runtime.objects.LocalPlayer?.getFirstInstance();
    if (!state || !sprite) return;
    sprite.x = state.x;
    sprite.y = state.y;
    this.applyFacing(sprite, state.facing);
  }

  renderRemotePlayers() {
    const current = new Set();
    for (const player of mariposaNetwork.GetInterpolatedRemotePlayers()) {
      current.add(player.sessionId);
      let sprite = this.remoteSprites.get(player.sessionId);
      if (!sprite) {
        sprite = this.runtime.objects.RemotePlayer.createInstance(CONFIG.layer, player.x, player.y);
        this.remoteSprites.set(player.sessionId, sprite);
      }
      sprite.x = player.x;
      sprite.y = player.y;
      this.applyFacing(sprite, player.facing);
    }
    for (const [sessionId, sprite] of this.remoteSprites) {
      if (current.has(sessionId)) continue;
      sprite.destroy();
      this.remoteSprites.delete(sessionId);
    }
  }

  applyFacing(sprite, facing) {
    const width = Math.abs(sprite.width);
    sprite.width = facing < 0 ? -width : width;
  }

  setStatus(message) {
    const status = this.runtime.objects.StatusText?.getFirstInstance();
    if (status) status.text = message;
    console.info(`[Mariposa] ${message}`);
  }

  clearRemoteSprites() {
    for (const sprite of this.remoteSprites.values()) sprite.destroy();
    this.remoteSprites.clear();
  }
}

runOnStartup(async runtime => {
  runtime.addEventListener('afterprojectstart', async () => {
    const controller = new TestLayoutController(runtime);
    await controller.start();
  });
});
