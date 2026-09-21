import { Client, type Room } from '@colyseus/sdk';

const endpoint = process.env.MARIPOSA_SERVER_URL ?? 'ws://localhost:2567';
const httpEndpoint = endpoint.replace(/^ws/, 'http').replace(/\/$/, '');
const clientCount = boundedInteger(process.env.MARIPOSA_LOAD_CLIENTS, 20, 1, 500);
const durationSeconds = boundedInteger(process.env.MARIPOSA_LOAD_SECONDS, 30, 1, 3_600);
const rampMilliseconds = boundedInteger(process.env.MARIPOSA_LOAD_RAMP_MS, 25, 0, 10_000);
const sendIntervalMilliseconds = 50;

interface LoadClient {
  room: Room;
  sequence: number;
  stateChanges: number;
  joinMilliseconds: number;
}

const connected: LoadClient[] = [];
const failures: string[] = [];
let stopping = false;

process.on('SIGINT', () => {
  stopping = true;
});
process.on('SIGTERM', () => {
  stopping = true;
});

try {
  for (let index = 0; index < clientCount && !stopping; index++) {
    const started = performance.now();
    try {
      const accessToken = await developmentToken(`Load-${String(index + 1).padStart(3, '0')}`);
      const client = new Client(endpoint);
      const room = await client.joinOrCreate('development_test_zone', { accessToken });
      const loadClient: LoadClient = {
        room,
        sequence: 0,
        stateChanges: 0,
        joinMilliseconds: performance.now() - started,
      };
      room.onStateChange(() => {
        loadClient.stateChanges += 1;
      });
      connected.push(loadClient);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
    if (rampMilliseconds > 0) await delay(rampMilliseconds);
  }

  const testStarted = performance.now();
  while (!stopping && performance.now() - testStarted < durationSeconds * 1_000) {
    const elapsed = performance.now() - testStarted;
    for (const [index, participant] of connected.entries()) {
      const phase = Math.floor(elapsed / 2_000 + index) % 2;
      participant.sequence += 1;
      participant.room.send('input_state', {
        sequence: participant.sequence,
        left: phase === 1,
        right: phase === 0,
        jump: participant.sequence % 80 === 1,
        clientTime: performance.now(),
      });
    }
    await delay(sendIntervalMilliseconds);
  }

  const joinTimes = connected.map((value) => value.joinMilliseconds).sort((a, b) => a - b);
  const stateChanges = connected.reduce((sum, value) => sum + value.stateChanges, 0);
  const roomIds = new Set(connected.map((value) => value.room.roomId));
  console.log(
    JSON.stringify(
      {
        requestedClients: clientCount,
        connectedClients: connected.length,
        failedClients: failures.length,
        roomsUsed: roomIds.size,
        durationSeconds,
        inputMessagesSent: connected.reduce((sum, value) => sum + value.sequence, 0),
        stateChanges,
        joinLatencyMilliseconds: {
          p50: percentile(joinTimes, 0.5),
          p95: percentile(joinTimes, 0.95),
          maximum: joinTimes.at(-1) ?? 0,
        },
        failures: failures.slice(0, 10),
      },
      null,
      2,
    ),
  );

  if (connected.length !== clientCount || failures.length > 0) process.exitCode = 1;
} finally {
  await Promise.allSettled(connected.map((value) => value.room.leave()));
}

async function developmentToken(displayName: string): Promise<string> {
  const response = await fetch(`${httpEndpoint}/auth/development`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ displayName }),
  });
  if (!response.ok) throw new Error(`Development authentication failed (${response.status})`);
  const body = (await response.json()) as { accessToken?: unknown };
  if (typeof body.accessToken !== 'string')
    throw new Error('Development authentication returned no access token');
  return body.accessToken;
}

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = value === undefined ? fallback : Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const value = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
  return Number(value!.toFixed(2));
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
