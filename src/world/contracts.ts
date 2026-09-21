export type WorldAddress={worldId:string;regionId:string;zoneId:string;instanceId:string};
export interface InstanceAllocator{allocate(zoneId:string,partyId?:string):Promise<WorldAddress>}
export interface PlayerTransferService{prepare(playerId:string,target:WorldAddress):Promise<{transferToken:string;expiresAt:Date}>;complete(transferToken:string):Promise<void>}
export interface ZoneManager{resolve(zoneId:string):Promise<{zoneId:string;capacity:number;active:boolean}>}
