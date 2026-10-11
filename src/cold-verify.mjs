/** Independent read-only cold verifier. Does not import Freeport or DestinationGate. */
import {createHash,createPublicKey,verify as cryptoVerify} from 'node:crypto';
import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import {join,resolve} from 'node:path';
const assert=(x,c)=>{if(!x)throw Error(c)};
const digest=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
function ordered(x){if(Array.isArray(x))return x.map(ordered);if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,ordered(x[k])]));return x}
const canonical=x=>JSON.stringify(ordered(x));
const read=p=>{assert(lstatSync(p).isFile()&&!lstatSync(p).isSymbolicLink(),'UNSAFE_ARCHIVE_FILE');return readFileSync(p)};
const dirs=(root,sub)=>{const d=join(root,sub);assert(lstatSync(d).isDirectory()&&!lstatSync(d).isSymbolicLink(),'UNSAFE_ARCHIVE_DIRECTORY');return d};
const json=p=>JSON.parse(read(p).toString('utf8'));
function records(root,sub,allowed){return readdirSync(dirs(root,sub)).sort().map(n=>{assert(allowed.test(n),'UNSAFE_RECORD_NAME');return[n,json(join(root,sub,n))]})}
function verifyReceipt(receipt){assert(Object.keys(receipt).sort().join('|')==='body|id|publicKey|signature','RECEIPT_FIELDS');
 const id=digest(Buffer.from(canonical({body:receipt.body,publicKey:receipt.publicKey})));
 assert(receipt.id===id,'RECEIPT_HASH_CHANGED');
 const key=createPublicKey({key:Buffer.from(receipt.publicKey,'base64'),format:'der',type:'spki'});
 assert(key.asymmetricKeyType==='ed25519','RECEIPT_KEY_CHANGED');
 assert(cryptoVerify(null,Buffer.concat([Buffer.from('FREEPORT_RECEIPT_V0\0'),Buffer.from(id)]),key,Buffer.from(receipt.signature,'base64')),'RECEIPT_SIGNATURE_CHANGED');
 return receipt.body;
}
function objects(root){return new Map(readdirSync(dirs(root,'objects')).sort().map(n=>{assert(/^[a-f0-9]{64}$/.test(n),'OBJECT_NAME');const b=read(join(root,'objects',n));assert(digest(b)==='sha256:'+n,'OBJECT_BYTES_CHANGED');return['sha256:'+n,b]}))}
export function coldVerifyPort(path){const root=resolve(path),files=objects(root);
 const cells=records(root,'cells',/^[a-f0-9]{64}\.json$/).map(([n,c])=>{assert(c.schema==='freeport.amber-cell/v0'&&n===c.id+'.json'&&c.status==='FOREIGN_HELD'&&c.executionAuthorized===false&&c.localAdmission===false&&c.neighborDiscovery===false&&c.originClaims.verified===false,'CELL_CONSEQUENCE_FRAUD');
 assert(files.has(c.address)&&files.get(c.address).length===c.byteLength,'CELL_PAYLOAD_MISSING');
 assert(digest(Buffer.from(canonical({port:c.port,slot:c.slot,address:c.address}))).slice(7)===c.id,'CELL_ID_CHANGED');return c});
 const byId=new Map(cells.map(c=>[c.id,c]));assert(byId.size===cells.length,'CELL_DUPLICATE');
 const slots=records(root,'slots',/^[a-f0-9]{64}\.json$/);assert(slots.length===cells.filter(c=>!c.slot.startsWith('derived-')).length,'SLOT_RESERVATION_MISMATCH');
 for(const [id,slot] of slots){assert(id===digest(Buffer.from(canonical({port:slot.port,slot:slot.slot}))).slice(7)+'.json','SLOT_RESERVATION_ID');const cell=byId.get(slot.cellId);assert(cell?.slot===slot.slot&&cell.port===slot.port&&cell.address===slot.address,'SLOT_RESERVED_CELL_MISSING')}
 const receipts=records(root,'receipts',/^[a-f0-9]{64}\.json$/).map(([n,r])=>{assert(r.id.slice(7)+'.json'===n,'RECEIPT_FILE_ID_CHANGED');return verifyReceipt(r)});
 const denied=receipts.filter(r=>r.event==='INTERACTION_REFUSED'),derived=receipts.filter(r=>r.event==='FOREIGN_DERIVED');
 for(const r of receipts){assert(r.localAdmission===false,'HOST_ADMISSION_FRAUD');assert(['DEPOSIT','INTERACTION_REFUSED','FOREIGN_DERIVED','REEXPORT'].includes(r.event),'UNKNOWN_PORT_RECEIPT');for(const id of r.cells)if(r.event!=='INTERACTION_REFUSED')assert(byId.has(id),'UNKNOWN_RECEIPT_CELL')}
 for(const e of derived){assert(e.cells.length===3&&e.objects.length===3&&e.transform==='COMPOSE_LITERAL_TEXT_V0'&&e.consequence==='NEW_FOREIGN_CELL','COMPOSITION_SCHEMA_MISMATCH');
  const [a,b,c]=e.cells.map(x=>byId.get(x)),data=Buffer.concat([files.get(a.address),Buffer.from('\n-- FREEPORT BOUNDED TEXT JOIN --\n'),files.get(b.address)]);
  assert(digest(data)===c.address&&c.originClaims.kind==='FOREIGN_DERIVED','COMPOSITION_NOT_EXACT');}
 for(const e of receipts.filter(x=>x.event==='REEXPORT'))assert(e.consequence==='OFFER_ONLY'&&e.cells.length===1,'REEXPORT_CONSTITUTED');
 return{schema:'freeport.cold-verification/v0',cells:cells.length,receipts:receipts.length,denied:denied.length,derived:derived.length,
  objects:files.size,authorityGained:false,hostAdoptions:0,executionEvents:0};
}
export function coldVerifyDestination(path){const root=resolve(path),stored=objects(root),decisions=records(root,'decisions',/^[a-f0-9]{64}\.json$/),
 receipts=records(root,'receipts',/^[a-f0-9]{64}\.json$/).map(([n,x])=>{assert(x.id.slice(7)+'.json'===n,'WORLD_RECEIPT_FILENAME');return verifyReceipt(x)});
 assert(decisions.length===receipts.length,'MISSING_WORLD_RECEIPT');
 for(const [n,d] of decisions){assert(d.schema==='freeport.receiver-decision/v0'&&n===d.request.slice(7)+'.json','WORLD_DECISION_ID');assert(['HOLD','REFUSE','ADMIT'].includes(d.disposition),'WORLD_DISPOSITION');assert(d.localAdmission===(d.disposition==='ADMIT')&&d.executionAuthorized===false&&d.sourceAuthorityTransferred===false,'WORLD_AUTHORITY_FRAUD');
  assert(d.storedAddress===null||stored.has(d.storedAddress),'WORLD_STORED_OBJECT_MISSING');assert(receipts.some(x=>x.request===d.request&&x.disposition===d.disposition&&x.world===d.world),'WORLD_DECISION_NOT_RECEIPTED');}
 return{schema:'freeport.destination-cold-verification/v0',decisions:decisions.length,receipts:receipts.length,
  admissions:decisions.filter(([,d])=>d.disposition==='ADMIT').length,executionEvents:0,authorityInherited:false};
}
