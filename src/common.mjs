import {createHash, createPublicKey, sign, verify, randomBytes, timingSafeEqual} from 'node:crypto';
import {mkdirSync, readFileSync, readdirSync, lstatSync, realpathSync, openSync, closeSync, writeSync, fsyncSync, constants} from 'node:fs';
import {resolve, join} from 'node:path';
export const hash=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
export const canon=x=>JSON.stringify(sort(x));
function sort(x){if(Array.isArray(x))return x.map(sort);if(x&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype)return Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])]));return x}
export function check(v,keys,code){if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype||Object.keys(v).sort().join('|')!==[...keys].sort().join('|'))throw Error(code)}
export function requireThat(x,code){if(!x)throw Error(code)}
export function name(s,code){requireThat(typeof s==='string'&&/^[A-Za-z][A-Za-z0-9_.:-]{0,96}$/.test(s),code);return s}
export function bytes(input){requireThat(Buffer.isBuffer(input)||input instanceof Uint8Array,'BYTES_REQUIRED');let b=Buffer.from(input);requireThat(b.length>0&&b.length<=65536,'PAYLOAD_SIZE_REFUSED');return b}
export function secret(s){let b=Buffer.from(s||[]);requireThat(b.length>=32&&b.length<=256,'OPERATOR_SECRET_REQUIRED');return b}
export function secureCompare(a,b){const x=hash(secret(a)),y=hash(secret(b));return timingSafeEqual(Buffer.from(x),Buffer.from(y))}
export function folder(root,part){const p=join(root,part);mkdirSync(p,{recursive:true,mode:0o700});requireThat(lstatSync(p).isDirectory()&&!lstatSync(p).isSymbolicLink(),'UNSAFE_STORAGE_DIRECTORY');return p}
export function rootDir(p){const r=resolve(p);mkdirSync(r,{recursive:true,mode:0o700});requireThat(lstatSync(r).isDirectory()&&!lstatSync(r).isSymbolicLink()&&realpathSync(r)===r,'UNSAFE_STORAGE_ROOT');return r}
export function writeOnce(path,buffer){const fd=openSync(path,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY|constants.O_NOFOLLOW,0o600);try{let at=0;while(at<buffer.length)at+=writeSync(fd,buffer,at,buffer.length-at,at);fsyncSync(fd)}finally{closeSync(fd)}}
export function existingBytes(p){const stat=lstatSync(p);requireThat(stat.isFile()&&!stat.isSymbolicLink(),'UNSAFE_FILE_REFERENCE');return readFileSync(p)}
export function put(root,content){let b=bytes(content),digest=hash(b),path=join(folder(root,'objects'),digest.slice(7));try{writeOnce(path,b);return{address:digest,created:true,byteLength:b.length}}catch(e){if(e.code!=='EEXIST')throw e;const present=existingBytes(path);requireThat(hash(present)===digest&&present.equals(b),'OBJECT_COLLISION_OR_CORRUPTION');return{address:digest,created:false,byteLength:b.length}}}
export function get(root,address){requireThat(typeof address==='string'&&/^sha256:[a-f0-9]{64}$/.test(address),'INVALID_ADDRESS');const b=existingBytes(join(folder(root,'objects'),address.slice(7)));requireThat(hash(b)===address,'STORED_BYTES_CORRUPT');return b}
export function readJson(path){const b=existingBytes(path);requireThat(b.length<1000000,'JSON_BOUNDS');return JSON.parse(b.toString('utf8'))}
export function record(dir,value,id){writeOnce(join(dir,id+'.json'),Buffer.from(JSON.stringify(value,null,2)+'\n'))}
export function rows(dir){return readdirSync(dir).sort().map(n=>{requireThat(/^[a-f0-9]{64}\.json$/.test(n),'UNSAFE_RECORD_FILENAME');return [n.slice(0,-5),readJson(join(dir,n))]})}
export function newNonce(){return randomBytes(16).toString('hex')}
const domain=Buffer.from('FREEPORT_RECEIPT_V0\0');
export function signReceipt(body,privateKey){const publicKey=createPublicKey(privateKey).export({format:'der',type:'spki'}).toString('base64');const sealed={body,publicKey};const id=hash(Buffer.from(canon(sealed)));const signature=sign(null,Buffer.concat([domain,Buffer.from(id)]),privateKey).toString('base64');return{id,body,publicKey,signature}}
export function verifyReceipt(r){check(r,['id','body','publicKey','signature'],'RECEIPT_FIELDS');requireThat(typeof r.publicKey==='string'&&typeof r.signature==='string','RECEIPT_SIGNING');const id=hash(Buffer.from(canon({body:r.body,publicKey:r.publicKey})));requireThat(r.id===id,'RECEIPT_ID_CHANGED');const pk=createPublicKey({key:Buffer.from(r.publicKey,'base64'),format:'der',type:'spki'});requireThat(pk.asymmetricKeyType==='ed25519'&&verify(null,Buffer.concat([domain,Buffer.from(id)]),pk,Buffer.from(r.signature,'base64')),'RECEIPT_SIGNATURE_INVALID');return true}
export function listReceipts(root){return rows(folder(root,'receipts')).map(([id,r])=>{verifyReceipt(r);requireThat(r.id==='sha256:'+id,'RECEIPT_FILENAME');return r})}
export function localKey(key){requireThat(key?.asymmetricKeyType==='ed25519'&&key.type==='private','ED25519_PRIVATE_KEY_REQUIRED');return key}
export function writeReceipt(root,body,key){const result=signReceipt(body,localKey(key));record(folder(root,'receipts'),result,result.id.slice(7));return result}
export function textOnly(data){try{return new TextDecoder('utf-8',{fatal:true}).decode(data)}catch{throw Error('TEXT_DECODER_REFUSED')}}
