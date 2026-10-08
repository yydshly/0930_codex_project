const path=require('path');
try{module.exports=require('playwright')}catch{module.exports=require(path.join(path.dirname(process.execPath),'..','node_modules','playwright'))}
