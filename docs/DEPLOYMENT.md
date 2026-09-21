# Deployment

Use a supported Linux release, Node.js 22+, PostgreSQL, a non-root service account, firewall, and a TLS reverse proxy that supports WebSocket upgrades. Build with `npm ci && npm run build`; apply reviewed migrations once; launch `node dist/index.js` under systemd or a container supervisor. Terminate public TLS at the proxy and expose only HTTPS/WSS.

Health check: `GET /health`. Store production secrets outside the repository. Back up PostgreSQL and test restoration. A single VPS is appropriate for the first controlled test. Add Redis only when multiple workers require shared presence, room discovery, rate limits, or pub/sub.
