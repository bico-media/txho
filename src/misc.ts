export const RE = {
	notHex: /[^\dA-F]+/gi,
	nls: /\n+/g,
	txidToken: /{txid}/gi,
}

export const DEBUG = false

export async function getUrl(endpoint = '', fetchConf: any, bufPlz = false) {
	const response = await fetch(endpoint, fetchConf)

	response.status

	if (bufPlz) {
		return await response.arrayBuffer()
	}

	const {headers} = response
	const contentType = headers.get('content-type') || ''

	if (contentType.includes('application/json')) {
		return await response.json()
	} else if (contentType.includes('application/text')) {
		return await response.text()
	} else if (contentType.includes('text/html')) {
		return await response.text()
	}

	return await response.text()
}

export function findHexs(str) {
	return str
		.replace(RE.nls, '\r')
		.replace(RE.notHex, '\n')
		.replace(RE.nls, '\n')
		.split('\n')
		.filter(x => !(x.length % 2))
}
