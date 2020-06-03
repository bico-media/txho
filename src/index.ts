export * as fromHash from './fromHash';
export * as fromTx from './fromTx';

import * as txid from './fromHash';
import * as rawtx from './fromTx';
export default {
	from: {
		txid, rawtx
	}
}