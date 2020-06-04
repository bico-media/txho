const RpcClient = require('bitcoind-rpc')
import Chiqq from './Chiqq'
import fromTx from './fromRawtx'
import {TxConf} from './types'

let pool: Chiqq | null = null

let rpcs:any = {} 
function getRpcClient(conf:any) {
	if (!rpcs[JSON.stringify(conf)]) {
		rpcs[JSON.stringify(conf)] = new RpcClient(conf)
	}
	return rpcs[JSON.stringify(conf)]
}

export default function (hash: string, conf: TxConf = {}) {
	if (!pool) {
		pool = new Chiqq({
			concurrency: 5,
			retryMax: 3,
			retryCooling: 1000,
			retryFactor: 2,
			...conf.pool,
		})
	}
	
	const rpc = getRpcClient(conf.jsonRpc)
	return pool.add(
		async () =>
			new Promise(function (resolve, reject) {
				rpc.getRawTransaction(hash, async function (err, transaction) {
					if (err) {
						reject(err)
					} else {
						let result = <any>await fromTx(transaction.result, conf)
						result.rawtx = transaction.result
						resolve(result)
					}
				})
			})
	)
}
