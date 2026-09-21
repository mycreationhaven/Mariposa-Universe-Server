import { Server } from 'colyseus';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configureAccessTokens, accessTokens } from '../src/auth/runtime.js';
import { DevelopmentRoom } from '../src/rooms/development-room.js';

describe.sequential('development room integration', () => {
  let testServer: ColyseusTestServer;
  const identity = {
    userId: 'integration-user',
    characterId: 'integration-character',
    displayName: 'Integration Butterfly',
  };

  beforeAll(async () => {
    configureAccessTokens('integration-secret-that-is-at-least-32-characters');
    const server = new Server({ greet: false });
    server.define('development_test_zone', DevelopmentRoom);
    testServer = await boot(server, 2568);
  });

  afterAll(async () => {
    await testServer.shutdown();
  });

  const token = () => accessTokens().issue(identity).accessToken;

  it('rejects missing and tampered access tokens', async () => {
    await expect(testServer.sdk.joinOrCreate('development_test_zone', {})).rejects.toThrow();
    await expect(
      testServer.sdk.joinOrCreate('development_test_zone', { accessToken: `${token()}tampered` }),
    ).rejects.toThrow();
  });

  it('uses authenticated identity and ignores hostile state payloads', async () => {
    const client = await testServer.sdk.joinOrCreate('development_test_zone', {
      accessToken: token(),
    });
    await client.waitForInitialState();
    const serverRoom = testServer.getRoomById<DevelopmentRoom>(client.roomId);
    const player = serverRoom.state.players.get(client.sessionId);
    expect(player?.playerId).toBe(identity.characterId);
    await serverRoom.waitForNextTimestep();
    const startX = serverRoom.state.players.get(client.sessionId)?.x;

    client.send('input_state', {
      sequence: 1,
      left: false,
      right: true,
      jump: false,
      clientTime: 1,
      x: 999_999,
    });
    await serverRoom.waitForNextTimestep();
    expect(serverRoom.state.players.get(client.sessionId)?.x).toBe(startX);

    client.send('input_state', {
      sequence: 2,
      left: false,
      right: true,
      jump: false,
      clientTime: 2,
    });
    await serverRoom.waitForNextTimestep();
    await serverRoom.waitForNextTimestep();
    expect(serverRoom.state.players.get(client.sessionId)?.x).toBeGreaterThan(startX ?? 0);
    await client.leave();
  });

  it('retains the player seat across a dropped connection and reconnects', async () => {
    const client = await testServer.sdk.joinOrCreate('development_test_zone', {
      accessToken: token(),
    });
    await client.waitForInitialState();
    client.reconnection.enabled = false;
    const originalSessionId = client.sessionId;
    const roomId = client.roomId;
    const reconnectToken = client.reconnectionToken;
    const serverRoom = testServer.getRoomById<DevelopmentRoom>(roomId);
    client.connection.close(4001, 'integration network interruption');
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(serverRoom.state.players.has(originalSessionId)).toBe(true);
    const resumed = await testServer.sdk.reconnect(reconnectToken);
    await resumed.waitForInitialState();
    expect(resumed.sessionId).toBe(originalSessionId);
    expect(serverRoom.state.players.has(originalSessionId)).toBe(true);
    await resumed.leave();
  });
});
