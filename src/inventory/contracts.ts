export interface ItemDefinition{id:string;name:string;stackable:boolean;maxStack:number}
export interface ItemInstance{id:string;definitionId:string;ownerCharacterId:string;quantity:number;metadata:Readonly<Record<string,unknown>>}
export interface InventoryService{list(characterId:string):Promise<ItemInstance[]>;transfer(instanceId:string,fromCharacterId:string,toCharacterId:string,quantity:number,idempotencyKey:string):Promise<void>}
