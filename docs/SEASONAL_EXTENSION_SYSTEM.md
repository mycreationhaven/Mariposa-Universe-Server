# Seasonal extension system

An approved manifest declares expansion/developer IDs, versions, compatibility, permissions, active dates, endpoint allowlist, checksum, signature, and approval state. A seasonal client may request a server-created session and submit a result; it cannot award inventory, experience, or ARKOS.

The server validates event status, identity/session binding, expiry, expansion, score bounds, objectives, duplicate submission, creator approval, and reward mapping. Reward claims use independent idempotency. The included in-memory service demonstrates these invariants; persistence and cryptographic manifest verification remain future work.
