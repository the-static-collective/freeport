import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,chmodSync,mkdtempSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sail,coldVerify} from '../src/first-foreign-ship-004.mjs';
const tranchnodeRoot=process.env.FREEPORT_004_TRANCHNODE;
const relatteRoot=process.env.FREEPORT_004_RELATTE;
const enabled=Boolean(tranchnodeRoot&&relatteRoot);
function env(t){const temp=mkdtempSync(join(tmpdir(),'freeport004-'));t.after(()=>rmSync(temp,{force:true,recursive:true}));return {root:join(temp,'run'),tranchnodeRoot,relatteRoot};}
test('native donor code rejects absent or unpinned Git sources',async t=>{
 if(!enabled){t.skip('requires independently checked out pinned donors');return}
 const args=env(t);
 await assert.rejects(sail({...args,relatteRoot:'/tmp/nonexistent-original-relatte'}),/FREEPORT004_|ENOENT/);
});
test('original TranchNode stores three real exact-byte cargo objects; original reLATTE proves nonfinality and independent HOLD',async t=>{
 if(!enabled){t.skip('requires independently checked out pinned donors');return}
 const args=env(t),proof=await sail(args);
 assert.equal(proof.status,'FREEPORT004_NATIVE_CARGO_SIGNED_PASSAGE_LOCAL_HOLD_VERIFIED');
 assert.equal(proof.cargoObjects,3);assert.equal(proof.freeportCells,3);assert.equal(proof.localDisposition,'HOLD');
 assert.equal(proof.sourceReleaseVerified,true);assert.equal(proof.offlineUnresolvedVerified,true);
 assert.equal(proof.receiverSignedHoldVerified,true);assert.equal(proof.bardoStagingDestroyed,true);
 assert.equal(proof.liveSupabaseContacted,false);assert.equal(proof.privateArchiveImported,false);
 assert.equal(proof.hostAdoption,false);assert.equal(proof.authorityTransferred,false);
 assert.equal(proof.renderKeepAuthorized,false);assert.equal(proof.recipientAdmission,false);
 assert.equal((await coldVerify(args)).status,proof.status);
 const evidence=join(args.root,'evidence'),signed=JSON.parse(readFileSync(join(evidence,'crossing.json')));
 const bardo=JSON.parse(readFileSync(join(evidence,'wait.json'))),receipt=JSON.parse(readFileSync(join(evidence,'hold.json')));
 assert.notDeepEqual(signed.signing.public_key,bardo.signing.public_key);
 assert.notDeepEqual(signed.signing.public_key,receipt.signing.public_key);
 assert.equal(signed.requested_effect.destination_disposition,'local');
 const original=readFileSync(join(evidence,'hold.json'),'utf8'),changed=JSON.parse(original);
 changed.semantic_effect='foreign-proposal-kept-and-executed';
 writeFileSync(join(evidence,'hold.json'),JSON.stringify(changed,null,2)+'\n');
 await assert.rejects(coldVerify(args),/SIGNED_RECEIPT_CHANGED_hold/);
 writeFileSync(join(evidence,'hold.json'),original);
 assert.equal((await coldVerify(args)).recipientAdmission,false);
 const crossingOriginal=readFileSync(join(evidence,'crossing.json'),'utf8'),fake=JSON.parse(crossingOriginal);
 fake.requested_effect.render_authority=true;
 writeFileSync(join(evidence,'crossing.json'),JSON.stringify(fake,null,2)+'\n');
 await assert.rejects(coldVerify(args),/SIGNED_CROSSING_TAMPERED/);
 writeFileSync(join(evidence,'crossing.json'),crossingOriginal);
 assert.equal((await coldVerify(args)).bardoStagingDestroyed,true);
 const manifest=join(evidence,'manifest.json'),savedManifest=readFileSync(manifest,'utf8'),smuggle=JSON.parse(savedManifest);
 smuggle.hostAdoption=true;writeFileSync(manifest,JSON.stringify(smuggle));
 await assert.rejects(coldVerify(args),/CLAIM_LIMIT_MISMATCH/);
 writeFileSync(manifest,savedManifest);
 assert.equal((await coldVerify(args)).hostAdoption,false);
});
test('cold verifier rejects bytes corrupted inside the native TranchNode object directory',async t=>{
 if(!enabled){t.skip('requires original native code');return}
 const args=env(t);await sail(args);
 const evidence=JSON.parse(readFileSync(join(args.root,'evidence','manifest.json'),'utf8'));
 const addr=evidence.nativeCargoAddress;const digest=addr.slice(7);
 const path=join(args.root,'native-tranchnode','objects','sha256',digest.slice(0,2),digest.slice(2,4),digest);
 chmodSync(path,0o600); // hostile filesystem owner deliberately defeats read-only mode
 writeFileSync(path,Buffer.from('bad cargo'));
 await assert.rejects(coldVerify(args),error=>error.code==='ARTIFACT_CORRUPTION');
});
test('the destination source remains distinct, no live SupaBardo schema is created',async t=>{
 if(!enabled){t.skip('requires original native code');return}
 const args=env(t);await sail(args);
 const dirs=readdirSync(args.root);
 assert.ok(dirs.includes('native-tranchnode'));assert.ok(dirs.includes('port'));assert.ok(dirs.includes('destination'));
 assert.ok(dirs.includes('evidence'));assert.ok(!dirs.includes('ephemeral-supabardo'));
 const manifest=JSON.parse(readFileSync(join(args.root,'evidence','manifest.json'),'utf8'));
 assert.equal(manifest.destinationDisposition,'HOLD');assert.equal(manifest.liveSupabaseContacted,false);
 assert.equal(manifest.userDataIncluded,false);
});
