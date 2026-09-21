import { MOTION, WORLD } from './constants.js';
import type { InputState } from '../networking/protocol.js';
export interface Body{x:number;y:number;vx:number;vy:number;grounded:boolean;facing:-1|1;coyoteRemaining:number;lastProcessedInputSequence:number}
export function spawnBody(offset=0):Body{return{x:WORLD.spawnX+offset,y:WORLD.floorY-WORLD.playerHeight,vx:0,vy:0,grounded:true,facing:1,coyoteRemaining:MOTION.coyoteSeconds,lastProcessedInputSequence:0};}
const toward=(v:number,target:number,delta:number)=>v<target?Math.min(v+delta,target):Math.max(v-delta,target);
export function simulate(body:Body,input:InputState,dt:number):void{
  const step=Math.min(Math.max(dt,0),0.05);const axis=Number(input.right)-Number(input.left);
  if(axis!==0){body.facing=axis as -1|1;body.vx=toward(body.vx,axis*MOTION.maxRunSpeed,(body.grounded?MOTION.runAcceleration:MOTION.airAcceleration)*step);}else if(body.grounded)body.vx=toward(body.vx,0,MOTION.groundFriction*step);
  body.coyoteRemaining=body.grounded?MOTION.coyoteSeconds:Math.max(0,body.coyoteRemaining-step);
  if(input.jump&&body.coyoteRemaining>0){body.vy=-MOTION.jumpSpeed;body.grounded=false;body.coyoteRemaining=0;}
  body.vy=Math.min(body.vy+MOTION.gravity*step,MOTION.maxFallSpeed);body.x+=body.vx*step;body.y+=body.vy*step;
  const maxX=WORLD.width-WORLD.playerWidth; if(body.x<0){body.x=0;body.vx=0;}else if(body.x>maxX){body.x=maxX;body.vx=0;}
  const floor=WORLD.floorY-WORLD.playerHeight;if(body.y>=floor){body.y=floor;body.vy=0;body.grounded=true;}else body.grounded=false;
  body.lastProcessedInputSequence=Math.max(body.lastProcessedInputSequence,input.sequence);
}
