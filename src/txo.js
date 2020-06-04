// Cloned from https://github.com/interplanaria/txo/blob/master/index.js to remove the hashbang. Licence: https://github.com/interplanaria/txo/blob/master/LICENSE

export const fromTx = function (transaction, options) {
	return new Promise(function (resolve, reject) {
		let gene = new bsv.Transaction(transaction)
		let t = gene.toObject()
		let result = []
		let inputs = []
		let outputs = []
		let graph = {}
		if (gene.inputs) {
			gene.inputs.forEach(function (input, input_index) {
				if (input.script) {
					let xput = {i: input_index, seq: input.sequenceNumber}
					input.script.chunks.forEach(function (c, chunk_index) {
						let chunk = c
						if (c.buf) {
							if (c.buf.byteLength >= 1000000) {
								xput['xlb' + chunk_index] = c.buf.toString('base64')
							} else if (c.buf.byteLength >= 512 && c.buf.byteLength < 1000000) {
								xput['lb' + chunk_index] = c.buf.toString('base64')
							} else {
								xput['b' + chunk_index] = c.buf.toString('base64')
							}
							if (options && options.h && options.h > 0) {
								xput['h' + chunk_index] = c.buf.toString('hex')
							}
						} else {
							if (typeof c.opcodenum !== 'undefined') {
								xput['b' + chunk_index] = {
									op: c.opcodenum,
								}
							} else {
								xput['b' + chunk_index] = c
							}
						}
					})
					let sender = {
						h: input.prevTxId.toString('hex'),
						i: input.outputIndex,
					}
					let address = input.script.toAddress(bsv.Networks.livenet).toString()
					if (address && address.length > 0) {
						sender.a = address
					}
					xput.e = sender
					inputs.push(xput)
				}
			})
		}
		if (gene.outputs) {
			gene.outputs.forEach(function (output, output_index) {
				if (output.script) {
					let xput = {i: output_index}
					output.script.chunks.forEach(function (c, chunk_index) {
						let chunk = c
						if (c.buf) {
							if (c.buf.byteLength >= 1000000) {
								xput['xlb' + chunk_index] = c.buf.toString('base64')
								xput['xls' + chunk_index] = c.buf.toString('utf8')
							} else if (c.buf.byteLength >= 512 && c.buf.byteLength < 1000000) {
								xput['lb' + chunk_index] = c.buf.toString('base64')
								xput['ls' + chunk_index] = c.buf.toString('utf8')
							} else {
								xput['b' + chunk_index] = c.buf.toString('base64')
								xput['s' + chunk_index] = c.buf.toString('utf8')
							}
							if (options && options.h && options.h > 0) {
								xput['h' + chunk_index] = c.buf.toString('hex')
							}
						} else {
							if (typeof c.opcodenum !== 'undefined') {
								xput['b' + chunk_index] = {
									op: c.opcodenum,
								}
							} else {
								xput['b' + chunk_index] = c
							}
						}
					})
					let receiver = {
						v: output.satoshis,
						i: output_index,
					}
					let address = output.script.toAddress(bsv.Networks.livenet).toString()
					if (address && address.length > 0) {
						receiver.a = address
					}
					xput.e = receiver
					outputs.push(xput)
				}
			})
		}
		let r = {
			tx: {h: t.hash},
			in: inputs,
			out: outputs,
			lock: t.nLockTime,
		}
		// confirmations
		if (options && options.confirmations) {
			r.confirmations = options.confirmations
		}
		resolve(r)
	})
}
