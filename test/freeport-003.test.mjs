import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {generateKeyPairSync,randomBytes} from 'node:crypto';
import {Freeport,checkTransit,verifyReceipt} from '../src/freeport.mjs';
import {DestinationGate} from '../src/destination.mjs';
import {coldVerifyPort,coldVerifyDestination} from '../src/cold-verify.mjs';
function specimen(t,{now=()=>1000}={}){const root=mkdtempSync(join(tmpdir(),'freeport-003-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const operatorSecret=randomBytes(32),recipientSecret=randomBytes(32);
 const port=new Freeport({root:join(root,'port'),portId:'Freeport-001',operatorSecret,signingKey:generateKeyPairSync('ed25519').privateKey,now});
 const world=new DestinationGate({root:join(root,'world'),worldId:'World-C',operatorSecret:recipientSecret,signingKey:generateKeyPairSync('ed25519').privateKey});
 const a=port.deposit({slot:'amber-a',payload:Buffer.from('{"authority":"root","callback":"not-running"}'),claims:{kind:'SYNTHETIC',source:'World-A'}}),
  b=port.deposit({slot:'amber-b',payload:Buffer.from('console.log("never executed")'),claims:{kind:'SYNTHETIC',source:'World-B'}});
 return{root,port,world,a:a.cell,b:b.cell,operatorSecret,recipientSecret};}
test('two amber cells remain inert, isolated, inspectable only by a local operator',t=>{
 const x=specimen(t);assert.notEqual(x.a.id,x.b.id);assert.equal(x.a.executionAuthorized,false);assert.equal(x.b.neighborDiscovery,false);
 assert.throws(()=>x.port.inspect({cell:x.a.id}),/OPERATOR_SECRET_REQUIRED/);
 assert.equal(x.port.inspect({cell:x.a.id,operatorSecret:x.operatorSecret}).bytes.toString().includes('authority'),true);
 assert.equal(readdirSync(join(x.root,'world','objects')).length,0);
 const proof=coldVerifyPort(join(x.root,'port'));assert.equal(proof.cells,2);assert.equal(proof.admissions,undefined);assert.equal(proof.hostAdoptions,0);
});
test('no permit, forged permit, wrong pair and expired permit yield signed attributable refusal',t=>{
 const x=specimen(t);const bad=x.port.compose({cellA:x.a.id,cellB:x.b.id});assert.equal(bad.status,'REFUSED');assert.equal(bad.receipt.body.consequence,'NONE');assert.equal(verifyReceipt(bad.receipt),true);
 const permit=x.port.issueInteractionPermit({cellA:x.a.id,cellB:x.b.id,operatorSecret:x.operatorSecret});
 const changed=structuredClone(permit);changed.body.operation='EXECUTE';assert.equal(x.port.compose({cellA:x.a.id,cellB:x.b.id,permit:changed}).status,'REFUSED');
 const wrong=x.port.compose({cellA:x.b.id,cellB:x.a.id,permit});assert.equal(wrong.status,'REFUSED');
 assert.throws(()=>x.port.issueInteractionPermit({cellA:x.a.id,cellB:x.b.id,operatorSecret:randomBytes(32)}),/LOCAL_OPERATOR_REQUIRED/);
 assert.throws(()=>x.port.issueInteractionPermit({cellA:x.a.id,cellB:x.b.id,operatorSecret:x.operatorSecret,ttlMs:60001}),/BOUNDED_LEASE_REQUIRED/);
 assert.equal(coldVerifyPort(join(x.root,'port')).denied,3);
});
test('authorized one-time inert transform makes a new foreign child, replay refuses',t=>{
 const x=specimen(t);const p=x.port.issueInteractionPermit({cellA:x.a.id,cellB:x.b.id,operatorSecret:x.operatorSecret});
 const result=x.port.compose({cellA:x.a.id,cellB:x.b.id,permit:p});assert.equal(result.status,'FOREIGN_DERIVED');assert.equal(result.cell.originClaims.kind,'FOREIGN_DERIVED');
 assert.equal(result.cell.localAdmission,false);assert.equal(verifyReceipt(result.receipt),true);
 assert.equal(x.port.compose({cellA:x.a.id,cellB:x.b.id,permit:p}).reason,'LEASE_ALREADY_SPENT');
 const proof=coldVerifyPort(join(x.root,'port'));assert.equal(proof.cells,3);assert.equal(proof.derived,1);assert.equal(proof.denied,1);
 assert.equal(readdirSync(join(x.root,'world','objects')).length,0);
});
test('lease expiry wins against potential double propagation',t=>{
 let time=5000;const x=specimen(t,{now:()=>time});const p=x.port.issueInteractionPermit({cellA:x.a.id,cellB:x.b.id,operatorSecret:x.operatorSecret,ttlMs:10});time+=10;
 const r=x.port.compose({cellA:x.a.id,cellB:x.b.id,permit:p});assert.equal(r.status,'REFUSED');assert.equal(r.reason,'PERMIT_EXPIRED');
 assert.equal(coldVerifyPort(join(x.root,'port')).derived,0);
});
test('re-export from host World B to World C is not World B adoption, destination chooses independently',t=>{
 const x=specimen(t);const exported=x.port.reexport({cell:x.a.id,recipient:'World-C',operatorSecret:x.operatorSecret});
 assert.equal(exported.envelope.hostAdoption,false);assert.equal(exported.envelope.recipientAdmission,false);
 assert.equal(checkTransit(exported.envelope).toString(),'{"authority":"root","callback":"not-running"}');
 assert.equal(readdirSync(join(x.root,'world','decisions')).length,0);
 assert.throws(()=>x.world.decide({envelope:exported.envelope,disposition:'ADMIT',operatorSecret:randomBytes(32)}),/RECEIVER_OPERATOR_REQUIRED/);
 const foreign={...exported.envelope,recipient:'World-D'};
 assert.throws(()=>x.world.decide({envelope:foreign,disposition:'ADMIT',operatorSecret:x.recipientSecret}),/WRONG_RECIPIENT_WORLD/);
 const refused={...exported.envelope,hostAdoption:true};assert.throws(()=>checkTransit(refused),/TRANSIT_AUTHORITY_REFUSED/);
 const corrupted={...exported.envelope,bytesBase64:Buffer.from('changed').toString('base64')};assert.throws(()=>checkTransit(corrupted),/TRANSIT_CONTENT_ADDRESS_MISMATCH/);
 const unknown={...exported.envelope,lawfulAuthority:'root'};assert.throws(()=>checkTransit(unknown),/TRANSIT_FIELDS/);
 const decision=x.world.decide({envelope:exported.envelope,disposition:'HOLD',operatorSecret:x.recipientSecret});
 assert.equal(decision.decision.localAdmission,false);assert.equal(decision.receipt.body.disposition,'HOLD');
 assert.throws(()=>x.world.decide({envelope:exported.envelope,disposition:'ADMIT',operatorSecret:x.recipientSecret}),/LOCAL_DECISION_ALREADY_FINAL/);
 assert.equal(coldVerifyPort(join(x.root,'port')).hostAdoptions,0);assert.equal(coldVerifyDestination(join(x.root,'world')).admissions,0);
});
test('independent receiver may explicitly ADMIT but still not execute or inherit authority',t=>{
 const x=specimen(t);const offer=x.port.reexport({cell:x.a.id,recipient:'World-C',operatorSecret:x.operatorSecret});
 const r=x.world.decide({envelope:offer.envelope,disposition:'ADMIT',operatorSecret:x.recipientSecret});
 assert.equal(r.decision.localAdmission,true);assert.equal(r.decision.executionAuthorized,false);assert.equal(r.decision.sourceAuthorityTransferred,false);
 assert.equal(coldVerifyDestination(join(x.root,'world')).admissions,1);assert.equal(coldVerifyPort(join(x.root,'port')).hostAdoptions,0);
});
test('unknown consequential manifest shape, duplicate slot, oversize, invalid UTF8 and tampering fail closed',t=>{
 const x=specimen(t);
 assert.throws(()=>x.port.deposit({slot:'bad',payload:Buffer.from('x'),claims:{kind:'SYNTHETIC',source:'World-A',authority:'owner'}}),/FOREIGN_CLAIM_FIELDS/);
 assert.throws(()=>x.port.deposit({slot:'huge',payload:Buffer.alloc(65537,1)}),/PAYLOAD_SIZE_REFUSED/);
 assert.throws(()=>x.port.deposit({slot:'amber-a',payload:Buffer.from('different')}),/EEXIST/);
 const invalid=x.port.deposit({slot:'binary',payload:Buffer.from([255])}).cell;
 const p=x.port.issueInteractionPermit({cellA:x.a.id,cellB:invalid.id,operatorSecret:x.operatorSecret});
 assert.equal(x.port.compose({cellA:x.a.id,cellB:invalid.id,permit:p}).reason,'TEXT_DECODER_REFUSED');
 const obj=join(x.root,'port','objects',x.a.address.slice(7));writeFileSync(obj,Buffer.from('malicious replacement'));
 assert.throws(()=>x.port.inspect({cell:x.a.id,operatorSecret:x.operatorSecret}),/STORED_BYTES_CORRUPT/);
 assert.throws(()=>coldVerifyPort(join(x.root,'port')),/OBJECT_BYTES_CHANGED/);
});
test('signed receipts fail cold validation if modified without the original signer',t=>{
 const x=specimen(t);const file=join(x.root,'port','receipts',readdirSync(join(x.root,'port','receipts'))[0]);const receipt=JSON.parse(readFileSync(file));receipt.body.consequence='ADMITTED';writeFileSync(file,JSON.stringify(receipt));
 assert.throws(()=>coldVerifyPort(join(x.root,'port')),/RECEIPT_HASH_CHANGED/);
});
