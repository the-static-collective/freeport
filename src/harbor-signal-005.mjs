/**
 * FREEPORT 005: safe, deliberately non-authoritative projection of a
 * Supabase Realtime/Edge operational notification.
 *
 * It does not connect to Supabase, verify a reLATTE receipt, move cargo,
 * open a cell, authorize inspection, create a permit or authorize import.
 * All operational messages are attacker-controlled until separately proven.
 */
import {createHash} from 'node:crypto';

const EVENTS=new Set(['ARRIVAL_NOTICE','HOLD_NOTICE','REEXPORT_OFFER_NOTICE','INTERVAL_EXIT_NOTICE']);
const FIELDS=['schema','crossing_id','cargo_address','event','observed_at','expires_at','observed_from'];
const ADDRESS=/^sha256:[0-9a-f]{64}$/;
const CROSSING=/^relatte-crossing-v0:[0-9a-f]{64}$/;
const NAME=/^[A-Za-z0-9][A-Za-z0-9:._-]{0,63}$/;
const MAX_OBSERVATION_AGE_MS=5*60*1000;
const allowedHolders=new Set(['pantry-gate','WITNESS','freeport-offline']);

function plainObject(x){return x!==null && typeof x==='object' && !Array.isArray(x) &&
  Object.getPrototypeOf(x)===Object.prototype}
function reject(code){return {status:'QUARANTINED',reason:code,
  localAdmission:false,hostAdoption:false,cargoAccessible:false,
  transmissionAuthorized:false,renderKeepAuthorized:false,interactionAuthorized:false}}
function iso(x){return typeof x==='string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(x) &&
  Number.isFinite(Date.parse(x)) && new Date(x).toISOString()===x}

/** A Supabase notification is a discovery hint, never a verified receipt or warrant. */
export function observeHarborSignal(input,{now=Date.now()}={}){
 if(!plainObject(input)||Object.keys(input).sort().join('|')!==FIELDS.slice().sort().join('|'))
  return reject('UNEXPECTED_FIELD_OR_MISSING_FIELD');
 if(input.schema!=='freeport.harbor-signal/v0'||!EVENTS.has(input.event))
  return reject('UNRECOGNIZED_EVENT');
 if(typeof input.crossing_id!=='string'||!CROSSING.test(input.crossing_id) ||
  typeof input.cargo_address!=='string'||!ADDRESS.test(input.cargo_address))
  return reject('UNBOUND_REFERENCE');
 if(typeof input.observed_from!=='string'||!NAME.test(input.observed_from)||
    !allowedHolders.has(input.observed_from))return reject('UNEXPECTED_OBSERVER');
 if(!iso(input.observed_at)||!iso(input.expires_at)||!Number.isFinite(now))
  return reject('INVALID_TIME');
 const start=Date.parse(input.observed_at),expiry=Date.parse(input.expires_at);
 if(start>now+5000||expiry<=start||expiry-start>MAX_OBSERVATION_AGE_MS||expiry<=now ||
   now-start>MAX_OBSERVATION_AGE_MS)return reject('STALE_OR_OVERLONG_SIGNAL');
 const digest='sha256:'+createHash('sha256').update(JSON.stringify(FIELDS.map(k=>[k,input[k]]))).digest('hex');
 return {schema:'freeport.harbor-observation/v0',status:'UNVERIFIED_HINT',event:input.event,
  signal_fingerprint:digest,claim_crossing_id:input.crossing_id,
  claim_cargo_address:input.cargo_address,claimed_observer:input.observed_from,
  localAdmission:false,hostAdoption:false,cargoAccessible:false,
  transmissionAuthorized:false,renderKeepAuthorized:false,interactionAuthorized:false,
  receiptVerified:false,sourcePermissionAttested:false,
  note:'Only a bounded discovery hint; original native signature checks and destination-local gates remain mandatory'};
}

export const FREEPORT_005_GUARDS=Object.freeze({
  realtimeIsAuthority:false,
  edgeJwtIsWorldAuthority:false,
  portIsReceiver:false,
  allowRealtimePayloadBytes:false,
  allowAmbientRemoteCargoRead:false,
  allowAutoAdmitFromMx13:false,
  allowImplicitCrossCellInteraction:false,
  allowPrivateWitnessArchive:false,
  authorizedExperimentalTargets:[],
  recommendedDestinationDisposition:'HOLD'
});
