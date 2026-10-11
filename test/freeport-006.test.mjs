import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {conduct,coldVerify,PINS} from '../src/branch-harbor-006.mjs';
const cannonRoot=process.env.FREEPORT_006_CANNON;
const workbenchRoot=process.env.FREEPORT_006_WORKBENCH;
const ghotRoot=process.env.FREEPORT_006_GHOT;
const enabled=Boolean(cannonRoot&&workbenchRoot&&ghotRoot);
function specimen(t){
 const work=mkdtempSync(join(tmpdir(),'branch-harbor-006-'));
 t.after(()=>rmSync(work,{recursive:true,force:true}));
 return{root:join(work,'voyage'),cannonRoot,workbenchRoot,ghotRoot};
}
test('source commits are mandatory, not plausible branch strings',async t=>{
 if(!enabled){t.skip('requires exact independent Git checkouts');return}
 const args=specimen(t);
 await assert.rejects(conduct({...args,cannonRoot:workbenchRoot}),/FREEPORT006_GIT_PIN_CANNON/);
});
test('native two-branch native Workbench + GHoT keeps original branches intact and recipient on HOLD',async t=>{
 if(!enabled){t.skip('requires original native checkouts');return}
 const args=specimen(t);
 const result=await conduct(args);
 assert.equal(result.status,'COLD_VERIFIED_NATIVE_BRANCH_GRAFT_PROPOSED_UNRUN');
 assert.equal(result.pinned_source_branches,2);
 assert.equal(result.origin_git_blobs_verified,2);
 assert.equal(result.freeport_cells,4);
 assert.equal(result.native_workbench_calculation_verified,true);
 assert.equal(result.native_ghot_manifest_invoked,true);
 assert.equal(result.review_disposition,'HOLD');
 assert.equal(result.git_mutations,0);
 assert.equal(result.foreign_branch_files_executed,0);
 assert.equal(result.remote_transmission,false);
 const root=join(args.root,'evidence');
 const m=JSON.parse(readFileSync(join(root,'manifest.json'),'utf8'));
 const workbench=JSON.parse(readFileSync(join(root,'proposal.json'),'utf8'));
 assert.deepEqual(m.sources.map(s=>s.repository),[PINS.cannon.repository,PINS.workbench.repository]);
 assert.equal(m.branch_created,false);assert.equal(m.selected_for_canon,false);
 assert.equal(workbench.workbench.packet.candidate.status,'PROPOSED_UNRUN');
 assert.equal(workbench.workbench.packet.parallel_alternative.status,'LEFT_OPEN');
 assert.equal(workbench.ghot.result.compatibility_proven,false);
 assert.equal(workbench.ghot.result.merge_authorized,false);
 assert.equal(workbench.workbench.packet.authority,'none');
 assert.equal((await coldVerify(args)).status,result.status);
});
test('tampering with native GHoT result or assistant-review packet cannot survive cold replay',async t=>{
 if(!enabled){t.skip('requires original checkouts');return}
 const args=specimen(t);await conduct(args);
 const path=join(args.root,'evidence','proposal.json'),original=readFileSync(path,'utf8');
 const v=JSON.parse(original);v.ghot.result.candidate_admitted=true;
 writeFileSync(path,JSON.stringify(v));
 await assert.rejects(coldVerify(args),/FREEPORT006_NATIVE_REPLAY_MISMATCH/);
 writeFileSync(path,original);
 assert.equal((await coldVerify(args)).review_disposition,'HOLD');
});
test('promotion, forged source and transit injection are denied',async t=>{
 if(!enabled){t.skip('requires original checkouts');return}
 const args=specimen(t);await conduct(args);
 const mpath=join(args.root,'evidence','manifest.json'),saved=readFileSync(mpath,'utf8');
 const mutation=JSON.parse(saved);mutation.branch_created=true;writeFileSync(mpath,JSON.stringify(mutation));
 await assert.rejects(coldVerify(args),/FREEPORT006_AUTHORITY_PROMOTION/);
 writeFileSync(mpath,saved);
 const p=JSON.parse(saved);p.sources[0].commit='0'.repeat(40);writeFileSync(mpath,JSON.stringify(p));
 await assert.rejects(coldVerify(args),/FREEPORT006_MANIFEST_SOURCES/);
 writeFileSync(mpath,saved);
 const offerPath=join(args.root,'evidence','offer.json'),old=readFileSync(offerPath,'utf8');
 const offer=JSON.parse(old);offer.recipientAdmission=true;writeFileSync(offerPath,JSON.stringify(offer));
 await assert.rejects(coldVerify(args),/TRANSIT_AUTHORITY_REFUSED/);
 writeFileSync(offerPath,old);
 assert.equal((await coldVerify(args)).automatic_merge,false);
});
