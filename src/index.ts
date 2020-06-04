import * as txid from './fromTxid'
import * as rawtx from './fromRawtx'
export default {
	from: {
		txid,
		rawtx,
	},
}
if (require && require.main === module) {
	console.error('Please use "cli" instead of "index"') 
}
