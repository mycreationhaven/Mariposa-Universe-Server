import { Client } from 'https://esm.sh/@colyseus/sdk@0.18.2';

export class MariposaNetwork extends EventTarget {
  constructor() {
    super();
    this.client = null;
    this.room = null;
    this.localSessionId = null;
    this.sequence = 0;
    this.input = { left: false, right: false, jump: false };
    this.remoteSnapshots = new Map();
  }

  async Connect(endpoint) {
    this.endpoint = endpoint;
    this.client = new Client(endpoint);
    this.dispatchEvent(new Event('connected'));
  }

  async Register(email, password, displayName) {
    return this.#authenticate('/auth/register', { email, password, displayName });
  }

  async Login(email, password) {
    return this.#authenticate('/auth/login', { email, password });
  }

  async RefreshAuthentication() {
    if (!this.authentication?.refreshToken) throw new Error('No refresh token is available');
    return this.#authenticate('/auth/refresh', { refreshToken: this.authentication.refreshToken });
  }

  async Logout() {
    if (this.authentication?.refreshToken) {
      await this.#request('/auth/logout', { refreshToken: this.authentication.refreshToken });
    }
    this.authentication = null;
  }

  async AuthenticateDevelopment(displayName = 'Development Butterfly') {
    return this.#authenticate('/auth/development', { displayName });
  }

  async JoinZone(zone = 'development_test_zone', options = {}) {
    if (!this.client) throw new Error('Call Connect first');
    const accessToken = options.accessToken ?? this.authentication?.accessToken;
    if (!accessToken) throw new Error('Authenticate before joining');
    this.room = await this.client.joinOrCreate(zone, { accessToken });
    this.#bindRoom(this.room, zone);
    return this.room;
  }

  async ReconnectZone() {
    if (!this.client || !this.reconnectionToken)
      throw new Error('No reconnectable room session is available');
    this.room = await this.client.reconnect(this.reconnectionToken);
    this.#bindRoom(this.room, this.zone);
    this.dispatchEvent(
      new CustomEvent('reconnected', {
        detail: { sessionId: this.localSessionId, roomId: this.room.roomId },
      }),
    );
    return this.room;
  }

  SendInput(left, right, jump = false) {
    if (!this.room) return this.sequence;
    this.input = { left, right, jump };
    const sequence = ++this.sequence;
    this.room.send('input_state', { sequence, left, right, jump, clientTime: performance.now() });
    return sequence;
  }

  Interact(targetId, action) {
    this.room?.send('interact', { targetId, action });
  }
  Disconnect() {
    this.room?.leave(true);
    this.room = null;
  }
  IsConnected() {
    return Boolean(this.room?.connection?.isOpen);
  }
  GetLocalPlayer() {
    return this.room?.state?.players?.get(this.localSessionId) ?? null;
  }

  GetRemotePlayers() {
    if (!this.room) return [];
    const out = [];
    this.room.state.players.forEach((state, sessionId) => {
      if (sessionId !== this.localSessionId) out.push({ sessionId, state });
    });
    return out;
  }

  GetInterpolatedRemotePlayers(renderTime = performance.now() - 100) {
    const result = [];
    for (const [sessionId, frames] of this.remoteSnapshots) {
      if (sessionId === this.localSessionId || frames.length === 0) continue;
      let a = frames[0];
      let b = frames.at(-1);
      for (let i = 1; i < frames.length; i++) {
        if (frames[i].time >= renderTime) {
          a = frames[i - 1];
          b = frames[i];
          break;
        }
      }
      const span = Math.max(1, b.time - a.time);
      const t = Math.max(0, Math.min(1, (renderTime - a.time) / span));
      result.push({
        sessionId,
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        facing: b.facing,
        animation: b.animation,
      });
    }
    return result;
  }

  async #authenticate(path, body) {
    this.authentication = await this.#request(path, body);
    return this.authentication;
  }

  async #request(path, body) {
    if (!this.client) throw new Error('Call Connect first');
    const base = this.endpoint.replace(/^ws/, 'http').replace(/\/$/, '');
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    return response.status === 204 ? null : response.json();
  }

  #bindRoom(room, zone) {
    this.zone = zone;
    this.localSessionId = room.sessionId;
    this.reconnectionToken = room.reconnectionToken;
    room.onStateChange((state) => this.#capture(state));
    room.onLeave((code) =>
      this.dispatchEvent(
        new CustomEvent('disconnected', {
          detail: { code, reconnectable: Boolean(this.reconnectionToken) },
        }),
      ),
    );
    this.dispatchEvent(
      new CustomEvent('joined', {
        detail: { sessionId: this.localSessionId, roomId: room.roomId, zone },
      }),
    );
  }

  #capture(state) {
    const now = performance.now();
    const present = new Set();
    state.players.forEach((player, sessionId) => {
      present.add(sessionId);
      const frames = this.remoteSnapshots.get(sessionId) ?? [];
      frames.push({
        time: now,
        x: player.x,
        y: player.y,
        facing: player.facing,
        animation: player.animation,
      });
      while (frames.length > 3) frames.shift();
      this.remoteSnapshots.set(sessionId, frames);
    });
    for (const sessionId of this.remoteSnapshots.keys())
      if (!present.has(sessionId)) this.remoteSnapshots.delete(sessionId);
    this.dispatchEvent(new Event('statechange'));
  }
}

export const mariposaNetwork = new MariposaNetwork();
