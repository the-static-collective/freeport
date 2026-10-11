import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {generateKeyPairSync,randomBytes} from 'node:crypto';
import {Freeport} from '../src/freeport.mjs';
import {DestinationGate} from '../src/destination.mjs';
import {coldVerifyPort,coldVerifyDestination} from '../src/cold-verify.mjs';
const root=mkdtempSync(join(tmpdir(),'freeport-demo-')),key=randomBytes(32),worldKey=randomBytes(32);
try{
 const port=new Freeport({root:join(root,'port'),portId:'Port-B',operatorSecret:key,signingKey:generateKeyPairSync('ed25519').privateKey});
 const a=port.deposit({slot:'song',payload:Buffer.from('A synthetic song\n'),claims:{kind:'SONG',source:'World-A'}}).cell;
 const b=port.deposit({slot:'art',payload:Buffer.from('A synthetic visual grammar\n'),claims:{kind:'VISUAL',source:'World-D'}}).cell;
 const refused=port.compose({cellA:a.id,cellB:b.id});
 const permit=port.issueInteractionPermit({cellA:a.id,cellB:b.id,operatorSecret:key});
 const child=port.compose({cellA:a.id,cellB:b.id,permit});
 const offered=port.reexport({cell:child.cell.id,recipient:'World-C',operatorSecret:key});
 const destination=new DestinationGate({root:join(root,'world'),worldId:'World-C',operatorSecret:worldKey,signingKey:generateKeyPairSync('ed25519').privateKey});
 const local=destination.decide({envelope:offered.envelope,disposition:'HOLD',operatorSecret:worldKey});
 console.log(JSON.stringify({demo:'FREEPORT-003',refused:refused.reason,child:child.status,
  hostAdopted:offered.envelope.hostAdoption,recipientDisposition:local.decision.disposition,
  port:coldVerifyPort(join(root,'port')),recipient:coldVerifyDestination(join(root,'world'))},null,2));
}finally{rmSync(root,{recursive:true,force:true})}
