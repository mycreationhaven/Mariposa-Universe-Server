import { MapSchema, Schema, type } from '@colyseus/schema';
export class PlayerState extends Schema{@type('string') playerId='';@type('number') x=0;@type('number') y=0;@type('number') vx=0;@type('number') vy=0;@type('boolean') grounded=true;@type('number') facing=1;@type('string') animation='idle';@type('number') lastProcessedInputSequence=0;}
export class TestRoomState extends Schema{@type({map:PlayerState}) players=new MapSchema<PlayerState>();@type('number') serverTick=0;@type('string') zoneId='development_test_zone';}
