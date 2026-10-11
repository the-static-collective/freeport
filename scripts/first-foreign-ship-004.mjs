#!/usr/bin/env node
import {sail,coldVerify} from '../src/first-foreign-ship-004.mjs';
try {
 const [mode,output,tranchnodeRoot,relatteRoot]=process.argv.slice(2);
 if(!['run','verify'].includes(mode)||!output||!tranchnodeRoot||!relatteRoot)
  throw Error('Usage: run|verify OUT_DIR EXACT_TRANCHNODE_CHECKOUT EXACT_RELATTE_CHECKOUT');
 const result=await (mode==='run'?sail:coldVerify)({root:output,tranchnodeRoot,relatteRoot});
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
}catch(error){console.error('HOLD:',String(error?.message??error).slice(0,300));process.exitCode=1}
