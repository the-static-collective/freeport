/**
 * FREEPORT 006 — Two actual foreign Git branch specimens, one local proposal.
 *
 * Uses native Freeport 003 amber / recipient gate, original Workbench OLD-GROWTH
 * calculator and original GHoT external adapter mechanism. Never imports,
 * executes, checks out, merges or mutates the selected branch files.
 */
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash,generateKeyPairSync,randomBytes} from 'node:crypto';
import {join,resolve} from 'node:path';
import {existsSync,mkdirSync,readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {Freeport,checkTransit} from './freeport.mjs';
import {DestinationGate} from './destination.mjs';
import {coldVerifyPort,coldVerifyDestination} from './cold-verify.mjs';
import {hash,canon,requireThat,readJson} from './common.mjs';

export const PINS=Object.freeze({
 cannon:{repository:'the-static-collective/CANNON',ref:'experiment/stack-squared-017',
  sha:'3aa5b0d0e9403e90affe05ec4056825e8d166fe4',path:'src/stack-squared-017.mjs'},
 workbench:{repository:'the-static-collective/static-workbench',ref:'feature/old-growth-002-pinned-graft-import',
  sha:'16b0d5a2eb9c4c9b7da27f9ee1d8d8ba422a35a2',path:'static_workbench/old_growth_import.py'},
 ghot:{repository:'the-static-collective/GHoT',ref:'external-adapter-manifest-001',
  sha:'e12ce3e62486feb1e5cd2324d1ae5a6a2be8b19b'}
});
const fail=(ok,code)=>requireThat(ok,'FREEPORT006_'+code);
const sha=b=>createHash('sha256').update(b).digest('hex');
const write=(path,value)=>writeFileSync(path,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
function git(root,...args){return execFileSync('git',['-C',root,...args],{encoding:'buffer',timeout:12000,maxBuffer:200000}).toString('utf8').trim()}
function donor(root,pin,label){
 fail(typeof root==='string','MISSING_'+label);
 const home=realpathSync(resolve(root));
 fail(git(home,'rev-parse','HEAD')===pin.sha,'GIT_PIN_'+label);
 return home;
}
function select(root,pin){
 const lines=git(root,'ls-tree',pin.sha,'--',pin.path).split('\n');
 fail(lines.length===1&&/^100644 blob [a-f0-9]{40}\t/.test(lines[0])&&lines[0].split('\t')[1]===pin.path,'NON_REGULAR_GIT_BLOB');
 const objectId=lines[0].split(/\s+/)[2];
 const immutable=execFileSync('git',['-C',root,'show',pin.sha+':'+pin.path],{timeout:12000,maxBuffer:180000});
 const working=readFileSync(join(root,pin.path));
 fail(immutable.length>512&&immutable.length<=65536,'SOURCE_BOUNDS');
 fail(immutable.equals(working),'SOURCE_WORKTREE_CHANGED');
 const content=immutable.toString('utf8');
 fail(Buffer.from(content,'utf8').equals(immutable),'SOURCE_NOT_UTF8');
 return {repo:pin.repository,commit:pin.sha,path:pin.path,content,content_sha256:sha(immutable),
  blob_sha1:objectId,size:immutable.length,ref_hint:pin.ref,bytes:immutable};
}
function selectedInput(x){return{repository:x.repo,commit:x.commit,path:x.path,content:x.content,
 content_sha256:x.content_sha256,start_byte:0,end_byte:512}}
const declarations={
 keep:'Each source remains independently addressable at its exact immutable commit and may be refused',
 bend:'Offer a read-only, reviewable graft proposal without changing either source checkout',
 question:'Can two pinned branch specimens share a foreign harbor and produce a provenance-bound unrun candidate?',
 relation_lane:'lineage',move:'fuse'
};
function helper({cannon,workbench,ghot},sourceA,sourceB){
 const request={sources:[selectedInput(sourceA),selectedInput(sourceB)],declarations};
 const script=join(new URL('../scripts/',import.meta.url).pathname,'native-branch-graft-006.py');
 const adapter=join(new URL('../scripts/',import.meta.url).pathname,'synthetic-graft-adapter-006.py');
 const p=spawnSync('python3',[script,workbench,ghot,adapter],{
  input:JSON.stringify(request),encoding:'utf8',timeout:12000,maxBuffer:200000,
  env:{...process.env,GHOT_ADAPTER_MANIFESTS:''}
 });
 fail(p.status===0,'NATIVE_GRAFT_REFUSED_'+(p.stderr||'').trim().slice(0,160));
 const parsed=JSON.parse(p.stdout);
 fail(parsed.schema==='freeport.native-graft-calculation/v0'&&
 parsed.review_status==='PROPOSED_UNRUN'&&parsed.foreign_branch_files_executed===0&&
 parsed.merge_authorized===false,'NATIVE_OUTPUT_UNSAFE');
 return parsed;
}
function refs(x){return{repository:x.repo,branch_hint:x.ref_hint,commit:x.commit,path:x.path,
 git_blob_sha1:x.blob_sha1,sha256:'sha256:'+x.content_sha256,byte_length:x.size}}
export async function conduct({root,cannonRoot,workbenchRoot,ghotRoot}){
 fail(!existsSync(root),'CREATE_ONLY');
 const cannon=donor(cannonRoot,PINS.cannon,'CANNON');
 const workbench=donor(workbenchRoot,PINS.workbench,'WORKBENCH');
 const ghot=donor(ghotRoot,PINS.ghot,'GHOT');
 const a=select(cannon,PINS.cannon),b=select(workbench,PINS.workbench);
 const base=resolve(root);mkdirSync(base,{recursive:true,mode:0o700});
 mkdirSync(join(base,'evidence'),{mode:0o700});
 const operatorSecret=randomBytes(32),worldSecret=randomBytes(32);
 const port=new Freeport({root:join(base,'freeport'),portId:'Branch-Harbor',
  operatorSecret,signingKey:generateKeyPairSync('ed25519').privateKey});
 const first=port.deposit({slot:'cannon-stack-017',payload:a.bytes,
  claims:{kind:'GIT_BRANCH_BLOB',source:'CANNON'}}).cell;
 const second=port.deposit({slot:'workbench-growth-002',payload:b.bytes,
  claims:{kind:'GIT_BRANCH_BLOB',source:'STATIC_WORKBENCH'}}).cell;
 fail(port.inspect({cell:first.id,operatorSecret}).bytes.equals(a.bytes),'FIRST_CARGO_CHANGED');
 fail(port.inspect({cell:second.id,operatorSecret}).bytes.equals(b.bytes),'SECOND_CARGO_CHANGED');
 const denied=port.compose({cellA:first.id,cellB:second.id});
 fail(denied.status==='REFUSED','AMBIENT_COMPOSITION');
 const permit=port.issueInteractionPermit({cellA:first.id,cellB:second.id,operatorSecret});
 const joined=port.compose({cellA:first.id,cellB:second.id,permit});
 fail(joined.status==='FOREIGN_DERIVED','BOUNDED_COMPOSITION');
 fail(port.compose({cellA:first.id,cellB:second.id,permit}).status==='REFUSED','REPLAY_NOT_REFUSED');
 // Separate operator-directed Workbench calculation: the 003 permit only
 // authorizes the fixed inert text join above; it does NOT grant any new
 // general execution or foreign code adaptation authority.
 const calculated=helper({cannon,workbench,ghot},a,b);
 const proposalBytes=Buffer.from(canon(calculated),'utf8');
 const candidate=port.deposit({slot:'workbench-native-unrun-candidate',payload:proposalBytes,
  claims:{kind:'PROPOSED_UNRUN',source:'WORKBENCH'}}).cell;
 const offered=port.reexport({cell:candidate.id,recipient:'Review-World',operatorSecret});
 fail(checkTransit(offered.envelope).equals(proposalBytes)&&offered.envelope.hostAdoption===false,
  'REEXPORT_ADOPTED');
 const world=new DestinationGate({root:join(base,'destination'),worldId:'Review-World',
  operatorSecret:worldSecret,signingKey:generateKeyPairSync('ed25519').privateKey});
 const accepted=world.decide({envelope:offered.envelope,disposition:'HOLD',operatorSecret:worldSecret});
 fail(accepted.decision.disposition==='HOLD'&&!accepted.decision.localAdmission,'REVIEW_ADMITTED');
 const source=[refs(a),refs(b)];
 const manifest={schema:'freeport.branch-graft/v0',version:'006',pins:PINS,
  sources:source,source_cells:[first.id,second.id],joined_cell:joined.cell.id,
  candidate_cell:candidate.id,candidate_packet_sha256:'sha256:'+calculated.workbench.packet_sha256,
  candidate_receipt_sha256:'sha256:'+calculated.workbench.receipt_sha256,
  ghot_capability:calculated.ghot.capability,review_offer_address:candidate.address,
  destination:'Review-World',disposition:'HOLD',candidate_branch_name:'experiment/branch-harbor-review-'+calculated.workbench.packet_sha256.slice(0,12),
  branch_created:false,git_mutations:0,donor_branch_modules_executed:0,
  exact_selected_source_bytes_preserved:true,host_admitted:false,receiver_admitted:false,
  selected_for_canon:false,permission_to_publish:false,remote_transmission:false,
  deployment_count:0};
 write(join(base,'evidence','proposal.json'),calculated);
 write(join(base,'evidence','offer.json'),offered.envelope);
 write(join(base,'evidence','manifest.json'),manifest);
 return coldVerify({root:base,cannonRoot:cannon,workbenchRoot:workbench,ghotRoot:ghot});
}
export async function coldVerify({root,cannonRoot,workbenchRoot,ghotRoot}){
 const cannon=donor(cannonRoot,PINS.cannon,'CANNON');
 const workbench=donor(workbenchRoot,PINS.workbench,'WORKBENCH');
 const ghot=donor(ghotRoot,PINS.ghot,'GHOT');
 const a=select(cannon,PINS.cannon),b=select(workbench,PINS.workbench);
 const base=resolve(root),evidence=join(base,'evidence'),m=readJson(join(evidence,'manifest.json')),
  calculation=readJson(join(evidence,'proposal.json')),offer=readJson(join(evidence,'offer.json'));
 fail(m.schema==='freeport.branch-graft/v0'&&m.version==='006'&&
  canon(m.pins)===canon(PINS)&&canon(m.sources)===canon([refs(a),refs(b)]),'MANIFEST_SOURCES');
 fail(m.branch_created===false&&m.git_mutations===0&&m.donor_branch_modules_executed===0&&
  m.selected_for_canon===false&&m.permission_to_publish===false&&m.remote_transmission===false&&
  m.host_admitted===false&&m.receiver_admitted===false&&m.deployment_count===0&&
  m.disposition==='HOLD'&&m.destination==='Review-World','AUTHORITY_PROMOTION');
 const fresh=helper({cannon,workbench,ghot},a,b);
 fail(canon(calculation)===canon(fresh),'NATIVE_REPLAY_MISMATCH');
 const p=coldVerifyPort(join(base,'freeport')),d=coldVerifyDestination(join(base,'destination'));
 fail(p.cells===4&&p.derived===1&&p.denied===2&&p.hostAdoptions===0&&
  d.decisions===1&&d.admissions===0,'LOCAL_RECEIPT_PROOF');
 const cells=[...m.source_cells,m.joined_cell,m.candidate_cell];
 for(const id of cells){
  fail(typeof id==='string'&&/^[0-9a-f]{64}$/.test(id),'CELL_ID_INVALID');
 }
 const byId=id=>readJson(join(base,'freeport','cells',id+'.json'));
 fail(byId(m.source_cells[0]).address===hash(a.bytes)&&
  byId(m.source_cells[1]).address===hash(b.bytes),'ORIGINAL_CARGO_ADDRESS');
 const proposalBytes=Buffer.from(canon(fresh),'utf8');
 fail(byId(m.candidate_cell).address===hash(proposalBytes)&&
  m.review_offer_address===hash(proposalBytes),'PROPOSAL_CELL_MISMATCH');
 fail(checkTransit(offer).equals(proposalBytes)&&offer.cell===m.candidate_cell&&
  offer.recipient==='Review-World'&&offer.hostAdoption===false,'REVIEW_OFFER_MISMATCH');
 fail(m.candidate_packet_sha256==='sha256:'+fresh.workbench.packet_sha256&&
  m.candidate_receipt_sha256==='sha256:'+fresh.workbench.receipt_sha256 &&
  m.ghot_capability===fresh.ghot.capability,'NATIVE_PACKET_CHANGED');
 fail(m.candidate_branch_name==='experiment/branch-harbor-review-'+fresh.workbench.packet_sha256.slice(0,12),'BRANCH_PROPOSAL_CHANGED');
 return {schema:'freeport.branch-graft-proof/v0',status:'COLD_VERIFIED_NATIVE_BRANCH_GRAFT_PROPOSED_UNRUN',
  pinned_source_branches:2,origin_git_blobs_verified:2,
  freeport_cells:p.cells,freeport_signed_local_receipts:p.receipts,
  ghot_synthetic_capability_only:true,native_workbench_calculation_verified:true,
  native_ghot_manifest_invoked:true,foreign_branch_files_executed:0,
  review_disposition:'HOLD',git_mutations:0,remote_transmission:false,
  automatic_merge:false,canon_selected:false,execution_or_publication_granted:false};
}
