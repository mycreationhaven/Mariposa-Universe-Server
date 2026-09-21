# Network and hostile-client testing

Mariposa Universe includes deterministic network-condition tests and real Colyseus WebSocket integration tests. Run the focused suite with:

```bash
npm run test:network
```

The deterministic link simulator uses a fixed pseudo-random seed so latency, jitter, packet loss, and delivery order remain reproducible in CI. It verifies that local prediction history stays bounded during an outage and that a final authoritative snapshot removes acknowledged history and restores convergence.

The integration suite boots an actual Colyseus server and JavaScript SDK client. It verifies:

- Missing and tampered access tokens cannot join a room.
- Authenticated character identity comes from signed claims.
- Payloads containing client-authored coordinates are rejected.
- Valid input intentions still move the authoritative body.
- A non-consensual connection drop retains the player's room seat.
- Reconnection uses the stored one-use token and preserves the same session ID.

These tests protect protocol and lifecycle invariants; they do not replace visual testing inside Construct 3 or real-device testing through external network shaping. Before public launch, also run longer soak tests, multi-client load tests, browser/app suspension tests, bandwidth throttling, and regional deployment tests.

## Multi-client load runner

Start the server, then run:

```bash
MARIPOSA_LOAD_CLIENTS=20 MARIPOSA_LOAD_SECONDS=30 MARIPOSA_LOAD_RAMP_MS=25 npm run load:local
```

The runner obtains a separate development identity for every client, joins rooms through normal matchmaking, sends movement intentions at 20 Hz, and reports connection success, room count, message/state-change totals, and join-latency percentiles. Defaults are intentionally modest. Raise concurrency and duration gradually while observing server CPU, memory, event-loop delay, network traffic, and database pressure on production-like infrastructure.
