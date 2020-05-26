#!/usr/bin/env node
require('dotenv').config();
const RpcClient = require('bitcoind-rpc');
import Chiqq from './Chiqq';
import fromTx from './fromTx';
import {TxConf} from './types';

let pool: Chiqq | null = null;

let rpcs = {};
function getRpcClient(conf) {
	if (!rpcs[JSON.stringify(conf)]) {
		rpcs[JSON.stringify(conf)] = new RpcClient(conf);
	}
	return rpcs[JSON.stringify(conf)];
}

export default function (
	hash,
	conf = {
		protocol: 'http',
		user: process.env.BITCOIN_USERNAME || 'root',
		pass: process.env.BITCOIN_PASSWORD || 'bitcoin',
		host: process.env.BITCOIN_IP || '127.0.0.1',
		port: process.env.BITCOIN_PORT || '8332',
	},
	txConfig: TxConf = {}
) {
	if (!pool) {
		pool = new Chiqq({
			concurrency: 5,
			retryMax: 3,
			retryCooling: 1000,
			retryFactor: 2,
			...txConfig.pool,
		});
	}
	const rpc = getRpcClient(conf);
	return pool.add(
		async () =>
			new Promise(function (resolve, reject) {
				rpc.getRawTransaction(hash, async function (err, transaction) {
					if (err) {
						reject(err);
					} else {
						let result = <any>await fromTx(transaction.result, txConfig);
						result.rawtx = transaction.result;
						resolve(result);
					}
				});
			})
	);
}
