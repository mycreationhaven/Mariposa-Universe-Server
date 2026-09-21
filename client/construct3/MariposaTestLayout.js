import { mariposaNetwork } from './MariposaNetwork.js';

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

    this.setStatus('Connecting…');
    try {
      await mariposaNetwork.Connect(CONFIG.endpoint);
      await mariposaNetwork.JoinZone(CONFIG.zone, {
        developmentName: `Construct-${crypto.randomUUID().slice(0, 6)}`,
      });
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
    this.sendInput();
    this.renderLocalPlayer();
    this.renderRemotePlayers();
  }

  sendInput() {
    if (!mariposaNetwork.IsConnected()) return;
    const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA');
    const right = this.keys.has('ArrowRight') || this.keys.has('KeyD');
    const inputKey = `${left}:${right}`;
    const now = performance.now();
    if (!this.jumpQueued && inputKey === this.lastInputKey && now - this.lastSendAt < CONFIG.sendIntervalMs) return;
    mariposaNetwork.SendInput(left, right, this.jumpQueued);
    this.jumpQueued = false;
    this.lastInputKey = inputKey;
    this.lastSendAt = now;
  }

  renderLocalPlayer() {
    const state = mariposaNetwork.GetLocalPlayer();
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
