import { describe,expect,it } from 'vitest';import { loadConfig } from '../src/config/env.js';import { capabilities } from '../src/platform/capabilities.js';
const base={DATABASE_URL:'postgresql://x:y@localhost:5432/x',JWT_SECRET:'x'.repeat(32),SESSION_SECRET:'y'.repeat(32)};
describe('platform separation',()=>{it('refuses blockchain in Steam mode',()=>expect(()=>loadConfig({...base,STEAM_ENABLED:'true',ARKOVIA_ENABLED:'true'})).toThrow());it('keeps direct download configurable',()=>expect(capabilities(loadConfig({...base,DIRECT_DOWNLOAD_ENABLED:'true'})).directDownload).toBe(true));});
