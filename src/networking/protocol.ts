import { z } from 'zod';
export const InputStateSchema=z.object({sequence:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),left:z.boolean(),right:z.boolean(),jump:z.boolean(),clientTime:z.number().finite().nonnegative()}).strict();
export type InputState=z.infer<typeof InputStateSchema>;
export const ClientMessages={input:'input_state',heartbeat:'heartbeat',interact:'interact',leave:'leave_room'} as const;
export interface JoinOptions{accessToken:string}
export interface StateFrame{serverTick:number;lastProcessedInputSequence:number;x:number;y:number;vx:number;vy:number;facing:-1|1;grounded:boolean;animation:'idle'|'run'|'jump'|'fall'}
