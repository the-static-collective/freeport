import {join} from 'node:path';
import {rootDir,folder,secret,secureCompare,requireThat,name,writeReceipt,localKey,put,hash,canon,record,readJson} from './common.mjs';
import {checkTransit} from './freeport.mjs';
/** Receiver-owned reference gate, NOT a Freeport method or a transferable power. */
export class DestinationGate {
 constructor({root,worldId,operatorSecret,signingKey}){
  this.root=rootDir(root);this.world=name(worldId,'WORLD_ID');this.secret=secret(operatorSecret);this.key=localKey(signingKey);
  for(const dir of ['objects','decisions','receipts'])folder(this.root,dir);
 }
 decide({envelope,disposition,operatorSecret}){
  requireThat(secureCompare(this.secret,operatorSecret),'RECEIVER_OPERATOR_REQUIRED');
  requireThat(['HOLD','REFUSE','ADMIT'].includes(disposition),'RECEIVER_DISPOSITION');
  const material=checkTransit(envelope);requireThat(envelope.recipient===this.world,'WRONG_RECIPIENT_WORLD');
  const request=hash(Buffer.from(canon(envelope)));const file=join(folder(this.root,'decisions'),request.slice(7)+'.json');
  let decision;
  try{decision=readJson(file);requireThat(decision.disposition===disposition,'LOCAL_DECISION_ALREADY_FINAL')}catch(e){if(e.code!=='ENOENT')throw e;
   const store=disposition==='REFUSE'?null:put(this.root,material);
   decision={schema:'freeport.receiver-decision/v0',world:this.world,request,disposition,
    storedAddress:store?.address??null,localAdmission:disposition==='ADMIT',
    executionAuthorized:false,sourceAuthorityTransferred:false};
   record(folder(this.root,'decisions'),decision,request.slice(7));
  }
  const body={schema:'freeport.receiver-receipt/v0',...decision};
  const receipt=writeReceipt(this.root,body,this.key);
  return{decision,receipt};
 }
}
