# Movement, prediction, and reconciliation

The client sends controls, never coordinates. Server constants define acceleration, speed, friction, gravity, terminal velocity, jump speed, coyote time, body size, floor, and bounds. Delta time is capped to prevent a stalled tick from teleporting a body.

## Remote players

Remote players render about 100 ms behind real time and interpolate between buffered authoritative snapshots. Disconnected player histories are removed immediately.

## Local player

`MariposaPrediction.js` mirrors the milestone-one movement rules for responsiveness only. Every Construct tick:

1. Read local input.
2. Simulate it immediately on the predicted body.
3. Record the input sequence and frame delta.
4. Render the predicted body.

When authoritative state arrives:

1. Read `lastProcessedInputSequence`.
2. Remove acknowledged input frames.
3. Reset the prediction body to server position and velocity.
4. Replay only unacknowledged frames.
5. Render the reconciled result.

The server always wins. Prediction never sends coordinates and never changes authoritative state.

## Current limitations

- Client/server movement constants are duplicated and must remain version-matched.
- The initial correction is immediate; visual error smoothing and snap thresholds come after real latency testing.
- The test world has one floor and horizontal boundaries.
- Packet-loss, jitter, and artificial-latency testing remains a required milestone.

Later maps add immutable platform rectangles, broad-phase spatial partitioning, and swept collision. They must not accept client collision results.
