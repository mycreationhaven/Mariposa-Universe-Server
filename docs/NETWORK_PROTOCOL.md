# Network protocol

Client messages: `input_state` (strict `{sequence,left,right,jump,clientTime}`), `heartbeat`, `interact` (reserved), and `leave_room`. Joining occurs through Colyseus `joinOrCreate`; clients never choose authoritative player IDs.

Server messages: `heartbeat_ack` gives server time. Join metadata comes from the Colyseus room, while synchronized room state contains the server-issued public development identity, server tick, and players keyed by Colyseus session ID: position, velocity, grounded, facing, animation, and last processed input sequence.

Simulation runs at 60 Hz; default desired network update rate is 20 Hz (Colyseus patches may be tuned during production-like load testing). Remote clients render roughly 100 ms behind and interpolate between snapshots. The local client records unacknowledged inputs, applies matching movement rules, reconciles to authoritative state, replays inputs newer than `lastProcessedInputSequence`, and decays ordinary visual correction error without delaying authoritative physics.

Sequences must rise monotonically. The server ignores stale/replayed input, validates type/shape, rate-limits input, clamps simulation delta, and resolves opposing directions. Disconnect deletes all room state. True temporary-interruption reconnection requires Phase 4 authenticated session storage; milestone one safely rejoins with a new development identity.
