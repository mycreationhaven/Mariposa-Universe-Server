import { randomUUID } from 'node:crypto';
export interface DevelopmentIdentity{playerId:string;displayName:string}
export function issueDevelopmentIdentity(name?:string):DevelopmentIdentity{const id=`dev_${randomUUID()}`;return{playerId:id,displayName:(name?.trim().slice(0,24)||`Butterfly-${id.slice(-6)}`)}}
