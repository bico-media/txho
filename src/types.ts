export interface TxCell {
	size?: number
	op?: number
	opName?: string
	b64?: string
	str?: string
	utc?: string
	sha256?: string
	hex?: string
	uri?: string
	buf?: any
	display?: TxCell
}

export interface TxRef {
	size: number
	b64: string
	sha256: string
	uri?: string
	txid?: string
	type?: string
	iScript?: number
	iChunk?: string
}

export interface TxConf {
	maxDataSize?: number
	network?: string
	cellAuto?: boolean
	cellB64?: boolean
	cellStr?: boolean
	cellHex?: boolean
	cellBuf?: boolean
	cellHash?: boolean
	compress?: boolean
	hide?: string
	only?: string
	txo?: any
	pool?: any
	debug?: boolean
	splitDelimiter?: (cell: TxCell, payload: object, index: number) => boolean
	protocol?: string
	user?: string
	pass?: string
	host?: string
	port?: string
	help?: boolean
	cleanData?: boolean
	jsonRpc?: any
}
