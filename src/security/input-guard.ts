import type { Client } from 'colyseus';
const windows=new Map<string,{start:number,count:number}>();
export function permitInput(client:Client,now=Date.now(),limit=90):boolean{const previous=windows.get(client.sessionId);if(!previous||now-previous.start>=1000){windows.set(client.sessionId,{start:now,count:1});return true;}previous.count++;return previous.count<=limit;}
export function releaseInputGuard(sessionId:string):void{windows.delete(sessionId);}
