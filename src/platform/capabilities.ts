import type { AppConfig } from '../config/env.js';
export interface PlatformCapabilities{steam:boolean;directDownload:boolean;blockchain:boolean;externalWallet:boolean;seasonalContent:boolean}
export function capabilities(c:AppConfig):PlatformCapabilities{return{steam:c.STEAM_ENABLED,directDownload:c.DIRECT_DOWNLOAD_ENABLED,blockchain:!c.STEAM_ENABLED&&c.ARKOVIA_ENABLED,externalWallet:!c.STEAM_ENABLED&&c.EXTERNAL_WALLET_ENABLED,seasonalContent:c.SEASONAL_CONTENT_ENABLED};}
