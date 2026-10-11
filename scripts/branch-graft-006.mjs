#!/usr/bin/env node
import {conduct,coldVerify} from '../src/branch-harbor-006.mjs';
try{
 const [mode,root,cannonRoot,workbenchRoot,ghotRoot]=process.argv.slice(2);
 if(!['run','verify'].includes(mode)||!root||!cannonRoot||!workbenchRoot||!ghotRoot)
  throw Error('Usage: run|verify OUTPUT_ROOT EXACT_CANNON_CHECKOUT EXACT_WORKBENCH_CHECKOUT EXACT_GHOT_CHECKOUT');
 const result=await (mode==='run'?conduct:coldVerify)({root,cannonRoot,workbenchRoot,ghotRoot});
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
}catch(error){process.stderr.write('HOLD: '+String(error?.message||error).slice(0,320)+'\n');process.exitCode=1}
