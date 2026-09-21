export interface NPCState{id:string;definitionId:string;zoneId:string;x:number;y:number;scheduleState:string;dialogueState:string;updatedAt:Date}
export interface NPCService{getPresent(zoneId:string):Promise<NPCState[]>;interact(playerId:string,npcId:string,action:string):Promise<{dialogueKey?:string;interactionId:string}>;persist(state:NPCState):Promise<void>}
