#!/usr/bin/env node

import * as dotenv from 'dotenv'
dotenv.config()
const JSON5 = require('json5')
const readline = require('readline')
const argv = require('minimist')(process.argv.slice(2))
import fromTxid from './fromTxid'
import fromRawtx from './fromRawtx' 
import filterObj from './filterObj'
import {TxConf} from './types'
;(function () {
	const [command, data] = argv._

	if (!command) {
		kill('No command provided')
	}

	let conf: TxConf = {
		...filterObj(argv, {_: 0}),
		jsonRpc: {
			protocol: process.env.BITCOIN_PROTOCOL || 'http',
			user: process.env.BITCOIN_USERNAME || 'root',
			pass: process.env.BITCOIN_PASSWORD || 'bitcoin',
			host: process.env.BITCOIN_IP || '127.0.0.1',
			port: process.env.BITCOIN_PORT || '8332',
		},
	}

	if (conf.debug) {
		console.warn({...filterObj(conf, {jsonRpc: 0})})
	}

	if (conf.help) {
		return kill()
	}

	if (conf.txo) {
		conf.txo = JSON5.stringify(`{${conf.txo}}`)
	}

	if (conf.pool) {
		conf.pool = JSON5.stringify(`{${conf.pool}}`)
	}


	if (process && process.stdin && !process.stdin.isTTY) {
		pipeData(command, conf)
		return
	}

	if (!data) {
		kill('No data provided')
	}

	let res = new Promise(() => {})
	switch (command) {
		case 'txid':
			res = fromTxid(data, conf)
			break
		case 'rawtx':
			res = fromRawtx(data, conf)
			break
		default:
			kill('Unknown command')
	}
	echo(res, conf)

})()

function pipeData(command, config) {
	const conf = {compress: true, skip: 0, ...config}

	const rl = readline.createInterface({
		input: process.stdin,
		//output: process.stdout,
		terminal: false,
	})

	let i_ = 0
	rl.on('line', (line:string) => {
		const i = ++i_
		if (i <= (conf.skip | 0)) return

		line = line.trim()
		if (!line.length) return

		let res = new Promise(() => {return ''})

		switch (command) {
			case 'txid':
				res = fromTxid(line, conf)
				break
			case 'rawtx':
				res = fromRawtx(line, conf)
				break
			default:
				kill('Unknown command')
		}

		echo(res, conf, `Problem on line ${i}: `)
	})
}

function echo(res:any, conf: TxConf, prependErrMsg = '') {
	console.log(JSON.stringify(res, null, conf.compress ? undefined : 2))
}

function kill(str = '') {
	str.length && console.error('\n ❌ ' + str)

	console.error('\nPlease make sure to provide one of the following combination of parameters')
	console.error('   $ txho txid [data (64 char long hex)]')
	console.error('   $ txho rawtx [data (raw tx)]')
	console.error('\n Example: ')
	console.error('   $ txho txid 0726963652a3...data...2274785e756d5f --cellStr --hide=data.b64')

	console.error('\nYou can pipe in data from a file having txid or rawtx per line. Example: ')

	console.error('   $ cat lostOfTxids.txt | txho txid ')
	console.error('   $ txho rawtx < lostOfRawTxs.txt > output.txt')
	console.error('   $ cat lostOfRawTxs.txt | txho rawtx --cellHash')
	console.error(`\nConfiguration
   network: string,         // main or test  
   maxDataSize: number,     // What is the max size of data not hosted. Defaults to 512. If 0 no data is hoisted
   cellStr: boolean;        // Aways add a string representation of data to each cell. Default false
   cellHex: boolean;        // Aways add a hex representation of data to each cell. Default false
   cellBuf: boolean;        // Aways add a buffer containing a data to each cell. Default false
   cellHash: boolean;       // Aways add a buffer containing a data to each cell. Default false	
   compress: boolean;       // Compress the output to one line. Default false. If data is piped: default true. 	
   only: string             // Comma seperated list of dot-notated elements to only include in output (like --only=tx.txid,data.sha256)
   hide: string             // Comma seperated list of dot-notated elements to explude from output (like --hide=data.b64). Overruled by "only"
   skip: number             // For piped data only: how many lines to skip before starting to execute. 
   txo: object              // The inside of a config object to manage TXO output. 
   pool: object;            // The inside of a config object to manage the pool size of rpc requests: See more about chiqq on npm.
                            // Is merged with default: --pool=concurrency:5,retryMax:3,retryCooling:1000,retryFactor:2
	`)

	str.length && console.error('\n ❌ ' + str)
	console.error()

	process.exit(1)
}
