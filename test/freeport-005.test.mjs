import test from 'node:test';
import assert from 'node:assert/strict';
import {observeHarborSignal,FREEPORT_005_GUARDS} from '../src/harbor-signal-005.mjs';

const clock=Date.parse('2026-10-11T16:10:00.000Z');
const valid={
 schema:'freeport.harbor-signal/v0',
 crossing_id:'relatte-crossing-v0:'+'a'.repeat(64),
 cargo_address:'sha256:'+'b'.repeat(64),
 event:'ARRIVAL_NOTICE',
 observed_at:'2026-10-11T16:09:00.000Z',
 expires_at:'2026-10-11T16:11:00.000Z',
 observed_from:'pantry-gate'
};
const observe=(v=valid)=>observeHarborSignal(v,{now:clock});
test('valid operational signal is ONLY a bounded unverified observation, never permission',()=>{
 const r=observe();
 assert.equal(r.status,'UNVERIFIED_HINT');
 assert.equal(r.claim_crossing_id,valid.crossing_id);
 assert.equal(r.claim_cargo_address,valid.cargo_address);
 assert.match(r.signal_fingerprint,/^sha256:[a-f0-9]{64}$/);
 for(const name of ['localAdmission','hostAdoption','cargoAccessible','transmissionAuthorized','renderKeepAuthorized','interactionAuthorized','receiptVerified','sourcePermissionAttested'])
  assert.equal(r[name],false,name+' must be false');
 assert.equal(observe().signal_fingerprint,r.signal_fingerprint);
});
test('unexpected fields, non-object, missing fields, and privilege injection are quarantined',()=>{
 const attempts=[null,[],{}, {...valid,authority:'root'}, {...valid,cargo_bytes:'secret'}, {...valid,recipient_disposition:'ADMIT'}, {...valid,event:undefined}, {...valid,port_operator_key:'private'}];
 for(const value of attempts)assert.equal(observe(value).status,'QUARANTINED');
});
test('foreign/crossing hashes and claimed observer identity cannot be free text',()=>{
 const variants=[{...valid,crossing_id:'not-signed'}, {...valid,cargo_address:'file:///etc/passwd'}, {...valid,observed_from:'admin'}, {...valid,observed_from:'pantry-gate;DROP TABLE'}, {...valid,cargo_address:'sha256:'+'A'.repeat(64)}];
 for(const v of variants)assert.equal(observe(v).status,'QUARANTINED');
});
test('supabase observation claims do not prove an actual sender or signer',()=>{
 for(const observer of ['pantry-gate','WITNESS','freeport-offline']){
  const r=observe({...valid,observed_from:observer});
  assert.equal(r.status,'UNVERIFIED_HINT');
  assert.equal(r.receiptVerified,false);
  assert.equal(r.sourcePermissionAttested,false);
 }
});
test('stale, long-lived, clock-skewed, bad timestamps and zero leases fail closed',()=>{
 const variants=[
  {...valid,expires_at:'2026-10-11T16:30:00.000Z'},
  {...valid,observed_at:'2026-10-11T15:00:00.000Z'},
  {...valid,observed_at:'2026-10-11T16:10:06.000Z'},
  {...valid,expires_at:'2026-10-11T16:09:00.000Z'},
  {...valid,expires_at:'2026-10-11T16:10:00.000Z'},
  {...valid,observed_at:'2026-10-11T16:09:00Z'},
  {...valid,observed_at:'2026-02-30T16:09:00.000Z'},
 ];
 for(const v of variants)assert.equal(observe(v).status,'QUARANTINED');
});
test('an apparent disposition or transit EXIT cannot claim finality',()=>{
 for(const event of ['ARRIVAL_NOTICE','HOLD_NOTICE','REEXPORT_OFFER_NOTICE','INTERVAL_EXIT_NOTICE']){
   const r=observe({...valid,event});
   assert.equal(r.status,'UNVERIFIED_HINT');assert.equal(r.localAdmission,false);
 }
 assert.equal(observe({...valid,event:'ADMIT'}).status,'QUARANTINED');
 assert.equal(observe({...valid,event:'KEEP'}).status,'QUARANTINED');
 assert.equal(observe({...valid,event:'EXECUTE'}).status,'QUARANTINED');
});
test('unknown properties and unbounded values do not survive to projection',()=>{
 const r=observe(valid);
 assert.ok(!Object.prototype.hasOwnProperty.call(r,'bytesBase64'));
 assert.ok(!Object.prototype.hasOwnProperty.call(r,'sourceClaims'));
 assert.ok(!Object.prototype.hasOwnProperty.call(r,'capabilityRef'));
 assert.ok(!Object.prototype.hasOwnProperty.call(r,'payload'));
 assert.ok(!Object.prototype.hasOwnProperty.call(r,'signing'));
});
test('all system-wide integration guardrails remain disabled',()=>{
 for(const [key,value] of Object.entries(FREEPORT_005_GUARDS)){
  if(key==='recommendedDestinationDisposition')assert.equal(value,'HOLD');
  else if(key==='authorizedExperimentalTargets')assert.deepEqual(value,[]);
  else assert.equal(value,false,key);
 }
});
