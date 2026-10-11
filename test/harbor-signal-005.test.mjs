import test from 'node:test';
import assert from 'node:assert/strict';
import {observeHarborSignal,FREEPORT_005_GUARDS} from '../src/harbor-signal-005.mjs';
const NOW=Date.parse('2026-10-11T16:10:00.000Z');
function signal(changes={}){return {
 schema:'freeport.harbor-signal/v0',event:'ARRIVAL_NOTICE',
 crossing_id:'relatte-crossing-v0:'+'a'.repeat(64),
 cargo_address:'sha256:'+'b'.repeat(64),
 observed_from:'pantry-gate',observed_at:'2026-10-11T16:09:30.000Z',
 expires_at:'2026-10-11T16:10:30.000Z',...changes
}}
test('an apparently valid arrival is only an unverified hint, not a release or ADMIT',()=>{
 const x=observeHarborSignal(signal(),{now:NOW});
 assert.equal(x.status,'UNVERIFIED_HINT');
 assert.equal(x.localAdmission,false);
 assert.equal(x.hostAdoption,false);
 assert.equal(x.cargoAccessible,false);
 assert.equal(x.transmissionAuthorized,false);
 assert.equal(x.receiptVerified,false);
 assert.equal(x.sourcePermissionAttested,false);
 assert.equal(x.renderKeepAuthorized,false);
});
test('HOLD, REEXPORT and EXIT claims still never grant ownership or passage',()=>{
 for(const event of ['HOLD_NOTICE','REEXPORT_OFFER_NOTICE','INTERVAL_EXIT_NOTICE']){
  const x=observeHarborSignal(signal({event}),{now:NOW});
  assert.equal(x.status,'UNVERIFIED_HINT');
  assert.equal(x.localAdmission,false);
  assert.equal(x.transmissionAuthorized,false);
  assert.equal(x.interactionAuthorized,false);
 }
});
test('an authoritative-looking state or any hidden payload bytes is quarantined',()=>{
 for(const extra of [{admission:'ADMIT'},{verified:true},{payload_b64:'secret'},{owner:'World-C'},
 {receipt:{kind:'ADMIT'}},{private_jwk:'never'}, {headers:{authorization:'Bearer secret'}}]){
  const x=observeHarborSignal(signal(extra),{now:NOW});
  assert.equal(x.status,'QUARANTINED');
  assert.equal(x.reason,'UNEXPECTED_FIELD_OR_MISSING_FIELD');
  assert.equal(x.localAdmission,false);
 }
});
test('expired, replayed, future, overly persistent or malformed notices fail closed',()=>{
 for(const changes of [
  {observed_at:'2026-10-11T16:04:00.000Z'}, 
  {expires_at:'2026-10-11T16:09:31.000Z'},
  {observed_at:'2026-10-11T16:10:06.000Z'},
  {expires_at:'2026-10-11T16:30:00.000Z'},
  {expires_at:'yesterday'},
  {observed_at:'2026-10-11T16:09:30Z'},
 ]){
  const x=observeHarborSignal(signal(changes),{now:NOW});
  assert.equal(x.status,'QUARANTINED');
  assert.equal(x.localAdmission,false);
 }
});
test('observer and hashes must be syntax-bounded and cannot imply a signer',()=>{
 for(const changes of [
  {observed_from:'other-private-project'},
  {observed_from:'../../auth'},
  {cargo_address:'sha256:spoofed'},
  {crossing_id:'freeport-authority:root'},
  {event:'ADMIT'},
  {schema:'supabase.owner-confirmation/v0'}
 ]){
  const x=observeHarborSignal(signal(changes),{now:NOW});
  assert.equal(x.status,'QUARANTINED');
 }
});
test('metadata fingerprints are deterministic but do not attest signature authenticity',()=>{
 const a=observeHarborSignal(signal(),{now:NOW}),b=observeHarborSignal(signal(),{now:NOW});
 assert.equal(a.signal_fingerprint,b.signal_fingerprint);
 assert.equal(a.receiptVerified,false);
 assert.equal(a.claim_cargo_address,'sha256:'+'b'.repeat(64));
});
test('live integration defaults forbid public payload broadcasts and MX13 auto admission',()=>{
 assert.equal(FREEPORT_005_GUARDS.realtimeIsAuthority,false);
 assert.equal(FREEPORT_005_GUARDS.allowRealtimePayloadBytes,false);
 assert.equal(FREEPORT_005_GUARDS.allowAutoAdmitFromMx13,false);
 assert.equal(FREEPORT_005_GUARDS.allowPrivateWitnessArchive,false);
 assert.deepEqual(FREEPORT_005_GUARDS.authorizedExperimentalTargets,[]);
 assert.equal(FREEPORT_005_GUARDS.recommendedDestinationDisposition,'HOLD');
});
