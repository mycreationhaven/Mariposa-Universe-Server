# Construct 3 multiplayer test layout

Construct 3 is the Mariposa Universe client engine. The repository now includes the networking bridge and a runnable layout controller, but the visual `.c3p` must be assembled and saved in Construct 3 because the editor is not available in the server validation environment.

## Included scripts

- `client/construct3/MariposaNetwork.js` — Colyseus isolation layer
- `client/construct3/MariposaTestLayout.js` — keyboard input, connection lifecycle, local rendering, remote spawning, interpolation, and despawning

Construct supports importing JavaScript files in the Scripts folder. Its scripts are ES modules, and `runOnStartup(runtime)` provides the runtime interface used by the controller.

## Create the project

1. Create a new Construct 3 project named `Mariposa Multiplayer Test`.
2. Create a layout named `DevelopmentTestZone` sized `2400 × 720`.
3. Rename the initial layer to `Game`.
4. Set the project viewport to a convenient desktop test size such as `1280 × 720`.
5. Add a solid floor extending across the layout with its top at Y `620`.

## Required object types

Names are case-sensitive in JavaScript.

| Construct object | Type   | Required setup                                                                 |
| ---------------- | ------ | ------------------------------------------------------------------------------ |
| `LocalPlayer`    | Sprite | One instance on `Game`; origin at top-left; approximately 40×72                |
| `RemotePlayer`   | Sprite | Object type only; no initial instance; origin at top-left; approximately 40×72 |
| `StatusText`     | Text   | One instance for connection status                                             |

Use visibly different placeholder colors for local and remote sprites. Do not add Construct Platform movement behavior; the server owns movement.

## Import and run

1. Import both included `.js` files into the Construct Scripts folder.
2. Keep their filenames unchanged so the relative module import resolves.
3. Start the server with `npm run dev`.
4. Preview the Construct layout.
5. Use A/D or Left/Right to move and Space, W, or Up to jump.
6. Open a second preview window to create Player B.

The controller connects to `ws://localhost:2567` and joins `development_test_zone`. Change `CONFIG.endpoint` only when testing another server. Production must use `wss://` and a locally vendored compatible Colyseus SDK rather than a remote CDN module.

## Expected result

- Each preview receives a server-generated development player identity.
- Both clients appear in the same room.
- Local and remote sprites follow server state.
- Remote motion is interpolated from buffered snapshots.
- Disconnecting one preview removes its sprite in the other.
- No client submits trusted coordinates.

## Prediction status and current limitations

Local prediction and authoritative reconciliation are now implemented in `MariposaPrediction.js`. The controller simulates input immediately, buffers sequenced frames, discards acknowledged frames, resets to server truth, and replays only unacknowledged input.

The first implementation corrects immediately. Visual smoothing thresholds will be tuned after testing under simulated latency, jitter, and packet loss.

The networking bridge now exposes production registration/login/refresh/logout methods and `ReconnectZone()`. A room reconnection token preserves the same Colyseus session during the server's 20-second interruption window; the account refresh token can obtain a new access token without storing the password. Longer application-restart recovery and restoring a persisted world position remain future work.
