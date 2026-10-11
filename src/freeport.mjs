import {createHmac} from 'node:crypto';
import {join} from 'node:path';
import {check,requireThat,name,bytes,secret,secureCompare,folder,rootDir,writeOnce,readJson,record,newNonce,put,get,hash,canon,writeReceipt,localKey,listReceipts,verifyReceipt,textOnly} from './common.mjs';
const PERMIT_OP='COMPOSE_LITERAL_TEXT_V0';
const permissionBody=(cellA,cellB,expiresAt,nonce)=>({schema:'freeport.interaction-permit/v0',operation:PERMIT_OP,cellA,cellB,expiresAt,nonce,scope:'one-use,one-pair,no-execution'});
const strictPermit=x=>check(x,['body','mac'],'PERMIT_FIELDS');
export class Freeport {
 constructor({root,portId,operatorSecret,signingKey,now=()=>Date.now()}){
  this.root=rootDir(root);this.id=name(portId,'PORT_ID');this.secret=secret(operatorSecret);this.key=localKey(signingKey);this.now=now;
  for(const p of ['cells','slots','receipts','leases','objects'])folder(this.root,p);
 }
 requireOperator(candidate){requireThat(secureCompare(this.secret,candidate),'LOCAL_OPERATOR_REQUIRED')}
 deposit({slot,payload,claims={kind:'UNVERIFIED',source:'foreign'},declaredBy='unverified'}){
  const slotId=name(slot,'SLOT_ID');check(claims,['kind','source'],'FOREIGN_CLAIM_FIELDS');
  name(claims.kind,'FOREIGN_KIND');name(claims.source,'FOREIGN_SOURCE');name(declaredBy,'DECLARANT');
  const b=bytes(payload),stored=put(this.root,b),cellId=hash(Buffer.from(canon({port:this.id,slot:slotId,address:stored.address}))).slice(7);
  // One berth cannot silently accept a different foreign object.
  const slotRef=hash(Buffer.from(canon({port:this.id,slot:slotId}))).slice(7);
  writeOnce(join(folder(this.root,'slots'),slotRef+'.json'),Buffer.from(JSON.stringify({port:this.id,slot:slotId,cellId,address:stored.address})));
  const cell={schema:'freeport.amber-cell/v0',id:cellId,port:this.id,slot:slotId,address:stored.address,
   byteLength:b.length,originClaims:{...claims,declaredBy,verified:false},status:'FOREIGN_HELD',
   localAdmission:false,executionAuthorized:false,neighborDiscovery:false};
  record(folder(this.root,'cells'),cell,cellId);
  const receipt=writeReceipt(this.root,{schema:'freeport.event/v0',event:'DEPOSIT',port:this.id,
   cells:[cellId],objects:[stored.address],consequence:'FOREIGN_HELD',localAdmission:false},this.key);
  return{cell,receipt};
 }
 cell(id){requireThat(typeof id==='string'&&/^[a-f0-9]{64}$/.test(id),'CELL_REFERENCE_INVALID');const c=readJson(join(folder(this.root,'cells'),id+'.json'));check(c,['schema','id','port','slot','address','byteLength','originClaims','status','localAdmission','executionAuthorized','neighborDiscovery'],'CELL_FIELDS');requireThat(c.schema==='freeport.amber-cell/v0'&&c.id===id&&c.port===this.id&&c.status==='FOREIGN_HELD'&&c.localAdmission===false&&c.executionAuthorized===false&&c.neighborDiscovery===false&&c.byteLength===get(this.root,c.address).length,'CELL_INTEGRITY');return c}
 inspect({cell,operatorSecret}){this.requireOperator(operatorSecret);const c=this.cell(cell);return{cell:c,bytes:get(this.root,c.address)} }
 issueInteractionPermit({cellA,cellB,operatorSecret,ttlMs=10000}){
  this.requireOperator(operatorSecret);requireThat(cellA!==cellB,'SEPARATE_CELL_PAIR_REQUIRED');this.cell(cellA);this.cell(cellB);
  requireThat(Number.isSafeInteger(ttlMs)&&ttlMs>0&&ttlMs<=60000,'BOUNDED_LEASE_REQUIRED');
  const expiresAt=this.now()+ttlMs;requireThat(Number.isSafeInteger(expiresAt),'CLOCK_INVALID');
  const body=permissionBody(cellA,cellB,expiresAt,newNonce());
  return{body,mac:createHmac('sha256',this.secret).update(canon(body)).digest('hex')};
 }
 deny({cellA,cellB,reason}){
  const receipt=writeReceipt(this.root,{schema:'freeport.event/v0',event:'INTERACTION_REFUSED',port:this.id,
   cells:[cellA,cellB],objects:[],consequence:'NONE',reason,
   localAdmission:false},this.key);
  return{status:'REFUSED',reason,receipt};
 }
 compose({cellA,cellB,permit}){
  const fail=reason=>this.deny({cellA,cellB,reason});
  if(cellA===cellB)return fail('SEPARATE_CELL_PAIR_REQUIRED');
  try{this.cell(cellA);this.cell(cellB)}catch{return fail('SOURCE_CELL_UNAVAILABLE')}
  try{strictPermit(permit);const b=permit.body;check(b,['schema','operation','cellA','cellB','expiresAt','nonce','scope'],'PERMIT_BODY_FIELDS');
   requireThat(b.schema==='freeport.interaction-permit/v0'&&b.operation===PERMIT_OP&&b.cellA===cellA&&b.cellB===cellB&&b.scope==='one-use,one-pair,no-execution'&&/^[0-9a-f]{32}$/.test(b.nonce),'PERMIT_SCOPE_MISMATCH');
   requireThat(typeof permit.mac==='string'&&/^[0-9a-f]{64}$/.test(permit.mac)&&createHmac('sha256',this.secret).update(canon(b)).digest('hex')===permit.mac,'PERMIT_SIGNATURE_INVALID');
   requireThat(Number.isSafeInteger(b.expiresAt)&&b.expiresAt>this.now(),'PERMIT_EXPIRED');
   writeOnce(join(folder(this.root,'leases'),b.nonce),Buffer.from(hash(Buffer.from(canon(b)))));
  }catch(e){return fail(e.code==='EEXIST'?'LEASE_ALREADY_SPENT':String(e.message||'PERMIT_REJECTED'))}
  // Fixed bounded inert transform only. Never eval, invoke, deserialize-to-runtime, or shell.
  let derived;try{
   const a=textOnly(get(this.root,this.cell(cellA).address)),b=textOnly(get(this.root,this.cell(cellB).address));
   derived=bytes(Buffer.from(a+'\n-- FREEPORT BOUNDED TEXT JOIN --\n'+b,'utf8'));
  }catch(e){return fail(String(e.message||'DECLARED_TRANSFORM_REFUSED'))}
  const stored=put(this.root,derived),slot='derived-'+newNonce();
  const cellId=hash(Buffer.from(canon({port:this.id,slot,address:stored.address}))).slice(7);
  const cell={schema:'freeport.amber-cell/v0',id:cellId,port:this.id,slot,address:stored.address,
   byteLength:derived.length,originClaims:{kind:'FOREIGN_DERIVED',source:'two-amber-cells',declaredBy:'Freeport-transform',verified:false},
   status:'FOREIGN_HELD',localAdmission:false,executionAuthorized:false,neighborDiscovery:false};
  record(folder(this.root,'cells'),cell,cellId);
  const receipt=writeReceipt(this.root,{schema:'freeport.event/v0',event:'FOREIGN_DERIVED',port:this.id,
   cells:[cellA,cellB,cellId],objects:[this.cell(cellA).address,this.cell(cellB).address,stored.address],
   transform:PERMIT_OP,consequence:'NEW_FOREIGN_CELL',localAdmission:false,permitHash:hash(Buffer.from(canon(permit.body)))},this.key);
  return{status:'FOREIGN_DERIVED',cell,receipt};
 }
 reexport({cell,recipient,operatorSecret}){
  this.requireOperator(operatorSecret);const c=this.cell(cell);name(recipient,'RECIPIENT_WORLD');
  const payload=get(this.root,c.address),envelope={schema:'freeport.transit-envelope/v0',
   originPort:this.id,cell:c.id,recipient,address:c.address,bytesBase64:payload.toString('base64'),
   sourceClaims:c.originClaims,hostAdoption:false,recipientAdmission:false,executionAuthorized:false};
  const receipt=writeReceipt(this.root,{schema:'freeport.event/v0',event:'REEXPORT',port:this.id,
   cells:[c.id],objects:[c.address],recipient,consequence:'OFFER_ONLY',localAdmission:false},this.key);
  return{envelope,receipt};
 }
}
export function checkTransit(envelope){check(envelope,['schema','originPort','cell','recipient','address','bytesBase64','sourceClaims','hostAdoption','recipientAdmission','executionAuthorized'],'TRANSIT_FIELDS');
 requireThat(envelope.schema==='freeport.transit-envelope/v0'&&envelope.hostAdoption===false&&envelope.recipientAdmission===false&&envelope.executionAuthorized===false,'TRANSIT_AUTHORITY_REFUSED');
 name(envelope.originPort,'TRANSIT_PORT');name(envelope.recipient,'TRANSIT_RECIPIENT');requireThat(/^[a-f0-9]{64}$/.test(envelope.cell),'TRANSIT_CELL');
 requireThat(typeof envelope.bytesBase64==='string'&&/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(envelope.bytesBase64),'TRANSIT_BASE64');
 const data=bytes(Buffer.from(envelope.bytesBase64,'base64'));
 requireThat(data.toString('base64')===envelope.bytesBase64&&hash(data)===envelope.address,'TRANSIT_CONTENT_ADDRESS_MISMATCH');
 check(envelope.sourceClaims,['kind','source','declaredBy','verified'],'TRANSIT_CLAIMS');requireThat(envelope.sourceClaims.verified===false,'FOREIGN_CLAIMS_ARE_NOT_VERIFIED');
 return data;
}
export {verifyReceipt,listReceipts};
