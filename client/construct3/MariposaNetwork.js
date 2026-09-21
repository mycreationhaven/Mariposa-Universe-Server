import { Client } from 'https://esm.sh/@colyseus/sdk@0.18.2';
export class MariposaNetwork extends EventTarget{
  constructor(){super();this.client=null;this.room=null;this.localSessionId=null;this.sequence=0;this.input={left:false,right:false,jump:false};this.remoteSnapshots=new Map();}
  async Connect(endpoint){this.client=new Client(endpoint);this.dispatchEvent(new Event('connected'));}
  async JoinZone(zone='development_test_zone',options={}){if(!this.client)throw new Error('Call Connect first');this.room=await this.client.joinOrCreate(zone,options);this.localSessionId=this.room.sessionId;this.room.onStateChange(state=>this.#capture(state));this.room.onLeave(code=>this.dispatchEvent(new CustomEvent('disconnected',{detail:{code}})));this.dispatchEvent(new CustomEvent('joined',{detail:{sessionId:this.localSessionId,roomId:this.room.roomId,zone}}));return this.room;}
  SendInput(left,right,jump=false){if(!this.room)return;this.input={left,right,jump};this.room.send('input_state',{sequence:++this.sequence,left,right,jump,clientTime:performance.now()});}
  Interact(targetId,action){this.room?.send('interact',{targetId,action});}
  Disconnect(){this.room?.leave(true);this.room=null;}
  IsConnected(){return Boolean(this.room?.connection?.isOpen);}
  GetLocalPlayer(){return this.room?.state?.players?.get(this.localSessionId)??null;}
  GetRemotePlayers(){if(!this.room)return[];const out=[];this.room.state.players.forEach((p,id)=>{if(id!==this.localSessionId)out.push({sessionId:id,state:p});});return out;}
  GetInterpolatedRemotePlayers(renderTime=performance.now()-100){const result=[];for(const[id,frames]of this.remoteSnapshots){if(id===this.localSessionId||frames.length===0)continue;let a=frames[0],b=frames.at(-1);for(let i=1;i<frames.length;i++){if(frames[i].time>=renderTime){a=frames[i-1];b=frames[i];break;}}const span=Math.max(1,b.time-a.time),t=Math.max(0,Math.min(1,(renderTime-a.time)/span));result.push({sessionId:id,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,facing:b.facing,animation:b.animation});}return result;}
  #capture(state){const now=performance.now(),present=new Set();state.players.forEach((p,id)=>{present.add(id);const frames=this.remoteSnapshots.get(id)??[];frames.push({time:now,x:p.x,y:p.y,facing:p.facing,animation:p.animation});while(frames.length>3)frames.shift();this.remoteSnapshots.set(id,frames);});for(const id of this.remoteSnapshots.keys())if(!present.has(id))this.remoteSnapshots.delete(id);this.dispatchEvent(new Event('statechange'));}
}
export const mariposaNetwork=new MariposaNetwork();
