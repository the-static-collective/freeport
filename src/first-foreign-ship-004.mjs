/**
 * FREEPORT 004 — native donor-code integration, not an invented compatible mock.
 * Original TranchNode immutable CAS + original reLATTE P-256 crossing/receipts.
 * Existing FREEPORT 003 cells + separate local recipient gate.
 * SupaBardo is represented only as a signed *offline* non-final interval.
 */
import {generateKeyPairSync,randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdtempSync,mkdirSync,existsSync,rmSync,readFileSync,writeFileSync,realpathSync,lstatSync} from 'node:fs';
import {Freeport,checkTransit} from './freeport.mjs';
import {DestinationGate} from './destination.mjs';
import {coldVerifyPort,coldVerifyDestination} from './cold-verify.mjs';
import {hash,canon,requireThat,check} from './common.mjs';

export const PINS=Object.freeze({
 tranchnode:'7fbb0c868befd5f6a7478bdd0447477a0e8e075e',
 relatte:'dcc8cdca84c440aa4294134f020fb7095bf87f24'
});
const files=['crossing.json','release.json','wait.json','hold.json','exit.json','offer.json','manifest.json'];
const expect=(test,message)=>requireThat(test,'FREEPORT004_'+message);
const same=(a,b)=>canon(a)===canon(b);
const parse=p=>JSON.parse(readFileSync(p,'utf8'));
const write=(p,x)=>writeFileSync(p,JSON.stringify(x,null,2)+'\n',{flag:'wx',mode:0o600});
function pin(root,sha,name){
 expect(typeof root==='string'&&root.length>0,'MISSING_'+name);
 const base=realpathSync(resolve(root));
 expect(lstatSync(base).isDirectory(),'NOT_DIRECTORY_'+name);
 const observed=execFileSync('git',['-C',base,'rev-parse','HEAD'],{encoding:'utf8',timeout:10000}).trim();
 expect(observed===sha,'COMMIT_PIN_CHANGED_'+name);
 return base;
}
export async function originalModules(tranchnodeRoot,relatteRoot){
 const tranch=pin(tranchnodeRoot,PINS.tranchnode,'TRANCHNODE');
 const relatte=pin(relatteRoot,PINS.relatte,'RELATTE');
 // Node loader is the original TranchNode repository's installed TSX.
 const artifact=await import(pathToFileURL(join(tranch,'src/artifact-store.ts')).href);
 const protocol=await import(pathToFileURL(join(relatte,'src/protocol.ts')).href);
 expect(typeof artifact.FilesystemArtifactStore==='function'&&typeof artifact.artifactAddress==='function','MISSING_ORIGINAL_TRANCHNODE');
 for(const symbol of ['generateP256KeyPair','sealCrossingEnvelope','sealReceipt','verifyCrossingEnvelope','verifyReceipt'])
  expect(typeof protocol[symbol]==='function','MISSING_ORIGINAL_RELATTE_'+symbol);
 return{artifact,protocol};
}
const timestamp=()=>new Date().toISOString();
function receiptDraft(crossingId,{kind,world,particular,effect='none',pre=null,post=null,extensions={}}){
 return {schema:'relatte.receipt/v0',crossing_id:crossingId,world_id:world,receiver_particular:particular,
  kind,semantic_effect:effect,contract_ref:null,pre_state_ref:pre,post_state_ref:post,
  descendant_refs:[],residual_refs:[],note:null,created_at:timestamp(),extensions};
}
export async function sail({root,tranchnodeRoot,relatteRoot}){
 expect(!existsSync(root),'ROOT_MUST_BE_FRESH');
 const {artifact,protocol}=await originalModules(tranchnodeRoot,relatteRoot);
 const base=resolve(root),temporary=join(base,'ephemeral-supabardo'),nativeRoot=join(base,'native-tranchnode'),evidence=join(base,'evidence');
 mkdirSync(base,{recursive:true,mode:0o700});
 mkdirSync(temporary,{mode:0o700});mkdirSync(evidence,{mode:0o700});
 mkdirSync(nativeRoot,{recursive:true,mode:0o700});const native=new artifact.FilesystemArtifactStore(nativeRoot);
 const aBytes=Buffer.from('Synthetic World A song: porch light / fading station\n','utf8'),
       bBytes=Buffer.from('Synthetic World D visual grammar: ink, tape, paper, train steam\n','utf8');
 // These exact bytes live in original TranchNode CAS FIRST, not merely Freeport's old local object layout.
 const nativeA=await native.put(aBytes),nativeB=await native.put(bBytes);
 expect((await native.get(nativeA.address)).equals(aBytes)&&(await native.get(nativeB.address)).equals(bBytes),'NATIVE_INGRESS_CHANGED');
 expect((await native.put(aBytes)).created===false,'NATIVE_IDEMPOTENCY');
 const operatorSecret=randomBytes(32),destSecret=randomBytes(32);
 const port=new Freeport({root:join(base,'port'),portId:'Port-B',operatorSecret,
  signingKey:generateKeyPairSync('ed25519').privateKey});
 const ca=port.deposit({slot:'world-a-song',payload:await native.get(nativeA.address),
  claims:{kind:'SONG',source:'World-A'}}).cell;
 const cb=port.deposit({slot:'world-d-visual',payload:await native.get(nativeB.address),
  claims:{kind:'VISUAL',source:'World-D'}}).cell;
 const refused=port.compose({cellA:ca.id,cellB:cb.id});
 expect(refused.status==='REFUSED'&&refused.receipt.body.consequence==='NONE','UNAUTHORIZED_COMPOSITION');
 const permit=port.issueInteractionPermit({cellA:ca.id,cellB:cb.id,operatorSecret});
 const created=port.compose({cellA:ca.id,cellB:cb.id,permit});
 expect(created.status==='FOREIGN_DERIVED'&&created.cell.localAdmission===false,'DERIVATION');
 const repeated=port.compose({cellA:ca.id,cellB:cb.id,permit});
 expect(repeated.status==='REFUSED'&&repeated.reason==='LEASE_ALREADY_SPENT','REPLAY_WON');
 // The third child's exact bytes become native CAS cargo; no execution occurs.
 const childBytes=port.inspect({cell:created.cell.id,operatorSecret}).bytes;
 const putChild=await native.put(childBytes);
 expect(putChild.address===created.cell.address&&
   (await native.get(putChild.address)).equals(childBytes),'NATIVE_CHILD_CUSTODY');
 const sourceKey=await protocol.generateP256KeyPair(),bardoKey=await protocol.generateP256KeyPair(),
       worldKey=await protocol.generateP256KeyPair();
 expect(!same(sourceKey.publicKeyJwk,bardoKey.publicKeyJwk)&&!same(sourceKey.publicKeyJwk,worldKey.publicKeyJwk)&&!same(bardoKey.publicKeyJwk,worldKey.publicKeyJwk),'SIGNER_ROLE_COLLAPSE');
 const crossing=await protocol.sealCrossingEnvelope({
  schema:'relatte.crossing-envelope/v0',protocol_version:'0',source_particular:'foreign-child:'+created.cell.id,
  source_world:'freeport:Port-B',source_history_head:null,
  parents:[ca.id,cb.id],declared_kind:'FREEPORT_FOREIGN_DERIVED_INERT_TEXT',
  payload_refs:[{address:putChild.address,role:'payload',media_type:'text/plain'}],
  requested_effect:{destination_disposition:'local',render_authority:false,execution_authority:false},
  capability_ref:null,privacy_policy:'SYNTHETIC_FIXTURE_ONLY',audience_policy:'OFFLINE_EXPERIMENT_ONLY',
  return_address:null,created_at:timestamp(),
  extensions:{freeport004:{custody_not_ownership:true,foreign:true,owner_rights_not_attested:true,host_admission:false}}
 },sourceKey);
 expect(await protocol.verifyCrossingEnvelope(crossing),'SOURCE_CROSSING_INVALID');
 const release=await protocol.sealReceipt(receiptDraft(crossing.crossing_id,{
  kind:'FREEPORT004_RELEASE',world:'freeport:Port-B',particular:'foreign-child:'+created.cell.id,
  effect:'crossing-released',post:crossing.crossing_id,
  extensions:{freeport004:{custody_only:true,source_cells:[ca.id,cb.id],offer_only:true}}
 }),sourceKey);
 // An offline SupaBardo-shaped WAIT receipt; NOT the actual Supabase membrane.
 const wait=await protocol.sealReceipt(receiptDraft(crossing.crossing_id,{
  kind:'FREEPORT004_UNRESOLVED',world:'offline-bardo:transit',
  particular:'foreign-child:'+created.cell.id,pre:release.receipt_id,
  extensions:{supabardo:{state:'OPEN',destination_disposition:null,mode:'OFFLINE_SYNTHETIC',live_supabase:false}}
 }),bardoKey);
 write(join(temporary,'wait.json'),wait);
 const offered=port.reexport({cell:created.cell.id,recipient:'World-C',operatorSecret});
 expect(offered.envelope.address===putChild.address&&
  checkTransit(offered.envelope).equals(await native.get(putChild.address))&&
  offered.envelope.hostAdoption===false,'PORT_ADOPTED_EXPORT');
 const destination=new DestinationGate({root:join(base,'destination'),worldId:'World-C',
  operatorSecret:destSecret,signingKey:generateKeyPairSync('ed25519').privateKey});
 const local=destination.decide({envelope:offered.envelope,disposition:'HOLD',operatorSecret:destSecret});
 expect(local.decision.disposition==='HOLD'&&!local.decision.localAdmission,'DESTINATION_WAS_ADMITTED');
 const hold=await protocol.sealReceipt(receiptDraft(crossing.crossing_id,{
  kind:'R3_HOLD',world:'world:World-C',particular:'offer:'+created.cell.id,
  effect:'proposal-held-locally',pre:wait.receipt_id,post:local.receipt.id,
  extensions:{freeport004:{destination_disposition:'HOLD',local_decision_receipt:local.receipt.id,
   render_authority:false,execution_authority:false,inherited_source_authority:false}}
 }),worldKey);
 const exit=await protocol.sealReceipt(receiptDraft(crossing.crossing_id,{
  kind:'FREEPORT004_EXIT',world:'offline-bardo:transit',particular:'foreign-child:'+created.cell.id,
  effect:'none',pre:wait.receipt_id,post:hold.receipt_id,
  extensions:{supabardo:{state:'EXIT',semantic_effect:'none',live_supabase:false}}
 }),bardoKey);
 for(const r of [release,wait,hold,exit])expect(await protocol.verifyReceipt(r),'RELATTE_SIGNED_RECEIPT_INVALID');
 const manifest={schema:'freeport.first-foreign-ship/v0',name:'FREEPORT-004',donors:PINS,
  sourceCells:[ca.id,cb.id],sourceCargo:[nativeA.address,nativeB.address],derivedCell:created.cell.id,
  nativeCargoAddress:putChild.address,crossingId:crossing.crossing_id,
  receipts:{release:release.receipt_id,wait:wait.receipt_id,hold:hold.receipt_id,exit:exit.receipt_id},
  localDecisionReceipt:local.receipt.id,recipient:'World-C',destinationDisposition:'HOLD',
  localAdmission:false,hostAdoption:false,sourceAuthorityTransferred:false,renderAuthority:false,
  liveSupabaseContacted:false,userDataIncluded:false,deployments:0};
 for(const [name,value] of Object.entries({crossing,release,wait,hold,exit,offer:offered.envelope,manifest}))
  write(join(evidence,name+'.json'),value);
 rmSync(temporary,{recursive:true,force:true});
 expect(!existsSync(temporary),'SUPABARDO_STAGE_SURVIVED');
 return coldVerify({root:base,tranchnodeRoot,relatteRoot});
}
export async function coldVerify({root,tranchnodeRoot,relatteRoot}){
 const {artifact,protocol}=await originalModules(tranchnodeRoot,relatteRoot);
 const base=resolve(root),native=new artifact.FilesystemArtifactStore(join(base,'native-tranchnode')),
  e=join(base,'evidence');
 expect(!existsSync(join(base,'ephemeral-supabardo')),'OPEN_INTERVAL_PERSISTED');
 const data=Object.fromEntries(files.map(name=>[name.slice(0,-5),parse(join(e,name))]));
 const m=data.manifest;check(m,['schema','name','donors','sourceCells','sourceCargo','derivedCell','nativeCargoAddress',
  'crossingId','receipts','localDecisionReceipt','recipient','destinationDisposition','localAdmission','hostAdoption',
  'sourceAuthorityTransferred','renderAuthority','liveSupabaseContacted','userDataIncluded','deployments'],'MANIFEST_FIELDS');
 expect(m.schema==='freeport.first-foreign-ship/v0'&&m.name==='FREEPORT-004'&&same(m.donors,PINS)&&
 m.destinationDisposition==='HOLD'&&m.localAdmission===false&&m.hostAdoption===false&&
 m.sourceAuthorityTransferred===false&&m.renderAuthority===false&&m.liveSupabaseContacted===false&&
 m.userDataIncluded===false&&m.deployments===0,'CLAIM_LIMIT_MISMATCH');
 expect(await protocol.verifyCrossingEnvelope(data.crossing),'SIGNED_CROSSING_TAMPERED');
 const c=data.crossing;
 expect(c.crossing_id===m.crossingId&&c.source_world==='freeport:Port-B'&&
 c.declared_kind==='FREEPORT_FOREIGN_DERIVED_INERT_TEXT'&&c.payload_refs.length===1&&
 c.payload_refs[0].address===m.nativeCargoAddress&&c.requested_effect.destination_disposition==='local'&&
 c.requested_effect.render_authority===false&&c.requested_effect.execution_authority===false&&
 c.extensions.freeport004.custody_not_ownership===true&&
 c.extensions.freeport004.owner_rights_not_attested===true&&
 c.privacy_policy==='SYNTHETIC_FIXTURE_ONLY','CROSSING_AUTHORITY_SMUGGLED');
 const [release,wait,hold,exit]=[data.release,data.wait,data.hold,data.exit];
 for(const [key,r] of Object.entries({release,wait,hold,exit}))
  expect(await protocol.verifyReceipt(r)&&r.crossing_id===c.crossing_id&&
    r.receipt_id===m.receipts[key],'SIGNED_RECEIPT_CHANGED_'+key);
 expect(release.kind==='FREEPORT004_RELEASE'&&release.signing.public_key.x===c.signing.public_key.x&&
  release.signing.public_key.y===c.signing.public_key.y&&
  release.semantic_effect==='crossing-released'&&release.post_state_ref===c.crossing_id,
  'SOURCE_RELEASE_BINDING');
 expect(wait.kind==='FREEPORT004_UNRESOLVED'&&wait.semantic_effect==='none'&&
  wait.pre_state_ref===release.receipt_id&&wait.extensions.supabardo.state==='OPEN'&&
  wait.extensions.supabardo.destination_disposition===null&&wait.extensions.supabardo.live_supabase===false,
  'BARDO_PREMATURE_ADMISSION');
 expect(hold.kind==='R3_HOLD'&&hold.semantic_effect==='proposal-held-locally'&&
  hold.pre_state_ref===wait.receipt_id&&hold.post_state_ref===m.localDecisionReceipt&&
  hold.extensions.freeport004.destination_disposition==='HOLD'&&
  hold.extensions.freeport004.render_authority===false&&
  hold.extensions.freeport004.inherited_source_authority===false&&
  hold.extensions.freeport004.execution_authority===false,'RECEIVER_MEANING_SMUGGLED');
 expect(exit.kind==='FREEPORT004_EXIT'&&exit.semantic_effect==='none'&&
  exit.pre_state_ref===wait.receipt_id&&exit.post_state_ref===hold.receipt_id&&
  exit.extensions.supabardo.state==='EXIT'&&exit.extensions.supabardo.live_supabase===false,'EXIT_MEANING_STOLEN');
 const keys=[c.signing.public_key,wait.signing.public_key,hold.signing.public_key];
 expect(new Set(keys.map(canon)).size===3&&same(keys[0],release.signing.public_key)&&
  same(keys[1],exit.signing.public_key),'SIGNER_ROLE_COLLAPSE');
 const proof=coldVerifyPort(join(base,'port')),world=coldVerifyDestination(join(base,'destination'));
 expect(proof.cells===3&&proof.derived===1&&proof.denied===2&&proof.hostAdoptions===0&&
  world.decisions===1&&world.admissions===0&&world.authorityInherited===false,'LOCAL_PORT_WORLD_PROOF_CHANGED');
 expect(m.sourceCells.length===2&&m.sourceCargo.length===2&&
  m.nativeCargoAddress===c.payload_refs[0].address,'CARGO_BINDING_CHANGED');
 for(const addr of [...m.sourceCargo,m.nativeCargoAddress]){
  const bytes=await native.get(addr);
  expect(artifact.artifactAddress(bytes)===addr,'ORIGINAL_TRANCHNODE_CORRUPTION');
 }
 const child=await native.get(m.nativeCargoAddress),offer=data.offer;
 expect(checkTransit(offer).equals(child)&&offer.recipient===m.recipient&&
  offer.cell===m.derivedCell&&offer.address===m.nativeCargoAddress&&
  offer.hostAdoption===false&&offer.recipientAdmission===false&&
  offer.sourceClaims.verified===false,'FOREIGN_OFFER_CORRUPT');
 return {status:'FREEPORT004_NATIVE_CARGO_SIGNED_PASSAGE_LOCAL_HOLD_VERIFIED',
  nativeStore:'original-tranchnode@'+PINS.tranchnode,
  signedTransport:'original-relatte@'+PINS.relatte,
  cargoObjects:3,freeportCells:proof.cells,portReceipts:proof.receipts,
  sourceReleaseVerified:true,offlineUnresolvedVerified:true,receiverSignedHoldVerified:true,
  bardoExitNonsemantic:true,bardoStagingDestroyed:true,localDisposition:'HOLD',
  liveSupabaseContacted:false,privateArchiveImported:false,
  hostAdoption:false,authorityTransferred:false,renderKeepAuthorized:false,
  recipientAdmission:false,deployments:0};
}
