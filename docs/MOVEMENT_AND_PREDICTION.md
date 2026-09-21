# Movement and prediction

The client sends controls, never coordinates. Server constants define acceleration, speed, friction, gravity, terminal velocity, jump speed, coyote time, body size, floor, and bounds. Delta is capped to prevent a stalled tick from teleporting a body.

Remote rendering interpolates snapshots. Local prediction should copy the simulation mathematics into the client bridge, buffer inputs by sequence, and on each authoritative patch reset to server state then replay unacknowledged inputs. Use a small visual correction window for minor error and a hard snap for material divergence. The server result always wins.

Later maps add immutable platform rectangles, broad-phase spatial partitioning, and swept collision. They must not accept client collision results.
