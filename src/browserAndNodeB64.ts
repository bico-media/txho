import global from 'global'

const encode =
	global?.btoa ||
	function (str) {
		return Buffer.from(str).toString('base64') 
	}
const decode =
	global?.atob ||
	function (b64) {
		return Buffer.from(b64, 'base64').toString()
	}

export {encode, encode as btoa, encode as toB64, decode, decode as atob, decode as fromB64}
