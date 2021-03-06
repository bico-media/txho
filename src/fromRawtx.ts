import * as bsv from 'bsv'
import {fromTx as txoFromTx} from './bundle/txo'
import filterObj from './filterObj'
import {opName} from './opCodes'
import {TxConf, TxCell, TxRef} from './types'
import * as base64 from 'base-64'
import {sha256} from 'js-sha256'
import {findHexs} from './misc'

const atobPipe = base64.encode('|')

const re = {
	probablyBinary: /[\x00-\x08\x0E-\x1f]/,
	timestamp: /^[1-2][0-9]{9}$/,
	miliTimestamp: /^[1-2][0-9]{12}$/,
}

const defaultTxConfig = {
	network: bsv.Networks.livenet,
	maxDataSize: 512,
	cellAuto: false,
	cellB64: false,
	cellStr: false,
	cellHex: false,
	cellBuf: false,
	cellHash: false,
	cellAll: false,
	txo: null,
	only: null,
	hide: null,
	pool: null,
	splitDelimiter: (cell, payload, n) =>
		atobPipe === cell.b64 || 'OP_RETURN' === cell.opName || 'OP_FALSE' === cell.opName,
}

export default function(transaction, config: TxConf = defaultTxConfig) {
	const conf = {
		...defaultTxConfig,
		...config,
	}

	if (conf.cleanData) {
		transaction = findHexs(transaction)
			.sort((a, b) => b.length - a.length)
			.shift()
	}

	if (conf.cellAll) {
		conf.cellAuto = conf.cellB64 = conf.cellStr = conf.cellHex = conf.cellHash = true
	}

	if (conf.txo) {
		return filterOutput(txoFromTx(transaction, conf.txo), conf)
	}

	let txData
	try {
		txData = new bsv.Transaction(transaction)
	} catch (e) {
		console.error(e.message)

		if (64 === transaction.length)
			console.error(
				'\nThe input looks like a transaction ID and not the raw transaction data. Try using `txid` instead of `rawtx`.\n'
			)

		if(e.message.includes('deserialize a transaction')){
			console.error('\nIs your input dirty or needs a trim? Try the `cleanData` flag.\n')
		}
		process.exit(1)
	}
	if (!txData) return 'tx not valid'

	let txObj = txData.toObject()
	let tx: any = {
		txid: txObj.hash,
		lockTime: txObj.nLockTime,
		in: [],
		out: [],
	}
	let data: any = []

	txData.inputs?.forEach(function(input, inputIndex) {
		if (!input.script) {
			return tx.in.push(input)
		}

		let payload = input.script.chunks.map(function(c, chunkIndex) {
			let [row, hoistedData] = transformChuncks(c, conf)
			if (hoistedData) {
				row.uri = `${txObj.hash}.in.${inputIndex}.${chunkIndex}`
				row.display.uri = row.uri
				data.push({
					...hoistedData,
					txid: txObj.hash,
					type: 'in',
					iScript: inputIndex,
					iChunk: chunkIndex,
				})
			}

			return row
		})

		let origin: any = {
			txid: input.prevTxId.toString('hex'),
			iOut: input.outputIndex,
		}

		let address = input.script.toAddress(conf.network).toString()
		if (address && address.length > 13) {
			origin.address = address
		}

		tx.in.push({seq: input.sequenceNumber, origin, payload: payload.map(e => e.display || e)})
	})

	txData.outputs?.forEach(function(output, outputIndex) {
		if (!output.script) {
			return tx.out.push(output)
		}

		let payload = output.script.chunks.map(function(c, chunkIndex) {
			let [row, hoistedData] = transformChuncks(c, conf)
			if (hoistedData) {
				row.uri = `${txObj.hash}.out.${outputIndex}.${chunkIndex}`
				row.display.uri = row.uri
				data.push({
					...hoistedData,
					txid: txObj.hash,
					type: 'out',
					iScript: outputIndex,
					iChunk: chunkIndex,
				})
			}

			return row
		})

		let result: any = {value: output.satoshis}

		let address = output.script.toAddress(conf.network).toString()

		if (address && address.length > 13) {
			result.address = address
		}

		result.payload = payload.map(e => e.display || e)

		let split: any = [[]]

		for (let i = 0; i < payload.length; i++) {
			if (conf.splitDelimiter(payload[i], payload, i)) {
				if (0 === split[split.length - 1].length) {
					continue
				}
				split.push([])
				continue
			}
			split[split.length - 1].push(payload[i].display || payload[i])
		}

		result.split = split

		tx.out.push(result)
	})

	return filterOutput({tx, data, datamap: datamap(data)}, conf)
}

function transformChuncks(c, conf: TxConf): [TxCell, TxRef?] {
	let cell: TxCell = {}

	if (c.buf) {
		if (0 < conf.maxDataSize && conf.maxDataSize < c.buf.byteLength) {
			cell = {
				size: c.buf.byteLength,
				sha256: sha256.hex(c.buf),
			}
			return [
				{...cell, display: cell},
				<TxRef>{
					...cell,
					b64: c.buf.toString('base64'),
				},
			]
		}

		cell = {
			b64: c.buf.toString('base64'),
			str: c.buf.toString('utf8'),
			hex: c.buf.toString('hex'),
			buf: c.buf,
			display: {},
		}

		if (conf.cellStr) cell.display.str = cell.str

		if (conf.cellHex) cell.display.hex = cell.hex

		if (conf.cellB64) cell.display.b64 = cell.b64

		if (conf.cellBuf) cell.display.buf = cell.buf

		if (conf.cellHash) cell.sha256 = sha256.hex(c.buf)

		if (conf.cellAuto) {
			if (!re.probablyBinary.test(cell.str)) {
				if (re.timestamp.test(cell.str)) {
					cell.utc = cell.display.utc = new Date(parseInt(cell.str) * 1000).toISOString()
				} else if (re.miliTimestamp.test(cell.str)) {
					cell.utc = cell.display.utc = new Date(parseInt(cell.str)).toISOString()
				}
				cell.display.str = cell.str
			}
			if ([64, 256, 512].includes(cell.hex.length)) cell.display.hex = cell.hex

			if (!cell.display.str && !cell.display.hex) cell.display.b64 = cell.b64
		}

		if (!Object.keys(cell.display).length) {
			cell.display.b64 = cell.b64
		}
	} else if (typeof c.opcodenum !== 'undefined') {
		cell.opName = opName(c.opcodenum)
		cell.op = c.opcodenum
	} else {
		cell.buf = c
	}

	return [cell]
}

function filterOutput(obj: any, conf: TxConf) {
	let filterConfig: any = null

	if (conf.only?.trim().length) {
		filterConfig = {}
		conf.only
			.trim()
			.split(',')
			.forEach((e: any) => (filterConfig[e.trim()] = 1))
		obj = filterObj(obj, filterConfig)
	}

	if (conf.hide?.trim().length) {
		filterConfig = {}
		conf.hide
			.trim()
			.split(',')
			.forEach((e: any) => (filterConfig[e.trim()] = 0))
		obj = filterObj(obj, filterConfig)
	}

	return obj
}

function datamap(data) {
	let datamap: any = {}
	for (let nn in data) {
		const n = +nn
		datamap[`${data[n].txid}.${data[n].type}.${data[n].iScript}.${data[n].iChunk}`] = n
	}
	return datamap
}
