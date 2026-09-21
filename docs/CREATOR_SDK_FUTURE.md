# Future Creator SDK

The Creator SDK will help approved developers build separate Construct 3 minigames and experiences without receiving the core Mariposa Universe project or privileged backend access.

## What the SDK is

- A versioned client library for the scoped extension API
- A separate sample Construct 3 project
- Manifest schemas and validation tools
- Local test fixtures and a development sandbox
- Documentation for launch, session, result, and return flows

## What the SDK is not

- A copy of the core `.c3p` project or event sheets
- Server source code
- A backend plugin SDK
- Direct database, inventory, economy, or administration access
- A method for executing arbitrary code inside the game server

## Identity and sessions

The main game server authorizes an external launch first. The add-on receives a single-use ticket and exchanges it for a short-lived session bound to the player, character, expansion, version, permissions, platform policy, expiry, and nonce. Creators should receive an expansion-scoped pseudonymous player ID plus only approved profile fields.

## Result model

Creator experiences submit claims with unique submission IDs. The core server independently evaluates session validity, event state, score/evidence limits, duplicates, anomaly signals, and reward policy. High-value rewards require authoritative server observation; a signed package does not make its runtime score trustworthy.

## Return behavior

After final result processing—or through a recovery path if the add-on fails—the core server provides a one-time return ticket. The core client consumes it to rejoin an allowed zone. Returning must not depend on the external experience staying online.

Packages are checksum-verified, publisher-signed, versioned, reviewed, permissioned, platform-aware, suspendable, and revocable.
