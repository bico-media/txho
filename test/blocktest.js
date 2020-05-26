var TXHO = require('../dist/index');
const block = require('./block.json');
(async function() {
  for(let i=0; i<block.result.tx.length; i++) { 
    let t = block.result.tx[i];
    let raw = t.hex;
    let result = await TXHO.fromTx(raw)
    console.log(JSON.stringify(result, null, 2))
  }
})();
