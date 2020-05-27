[![npm](https://img.shields.io/npm/v/txho)](https://www.npmjs.com/package/txho)

# TXHO - Transaction Hoisted Object

![](https://bico.media/b7165ca9baf0e73d53c713b257b856443deff17d0169c840d0fceb6dc97ef4f8)

TXHO translates raw bitcoin transaction into JSON format while hoisting larger data so you can easily:

- Store context information and content information separately
- Filter in realtime using JSON filter libraries (such as JQ)

TXHO can be used as a module for node, from the CLI to make sense of a raw bitcoin transaction or as a processing unit when piping data.

# Installation

For CLI

```
npm install txho -g
```

As module for node

```
yarn add txho
```

# Usage

## CLI

Provide one of the following combinations of parameters

    > txid <txid (64 char long string in hex)>

    > rawtx <raw tx data>

For txid see "fromHash" section for configuration of how to contact a bitcoin node.

You can also pipe in data from a file having one txid or rawtx per line. The output will default to a [nldjson](http://nldjson.org) format (= one json object per line):

> txho rawtx < lostOfRawTxs.txt > output.nldjson
> cat lostOfTxids.txt | txho txid > output.nldjson

The sequence of the output is **not** guaranteed to be the same as the input. If this is needed xargs is suggested:

> cat lostOfTxids.txt | xargs txho txid >> output.nldjson

## Node

There are two methods:

1. **fromTx:** Generates JSON from raw transaction data (Local operation and doesn't require a bitcoin node)
2. **fromHash:** Generates JSON from transaction hash. (requires a bitcoin node for JSON-RPC)

### fromTx

Generate JSON from raw transaction string.

Example

```js
const txho = require('txho');
(async function () {
	let result = await txho.fromTx(
		'0100000001d5001345e77e66fa74f0012a81017ea1223c7a8adbcc9e37f2860f95ba97966d000000006b483045022100c1a0c5ffc5b78e39acb5be1438e28a10e5aac8337f5da7e4c25ba4c5f3eb01b5022050e9997bae423585da52d7cdc8951379f5bff07adb6756ffe70e7c7181f8a5bd4121032b345f89620af75f59aa91d47cc359e4dd907816ce0652604922726025712f52ffffffff024a976200000000001976a914c6187747f80b85170eef7013218e7b0fa441479988ac44033f00000000001976a9147e4616b7453185a5f071417bb4ac08e226dbef9888ac00000000'
	);
	console.log(result);
})();
```

### fromHash

The `fromHash` method needs to contact a bitcoin node to use JSON-RPC, therefore you need to have access to a JSON-RPC endpoint.

The first step is to make a `.env` file

```bash
BITCOIN_USERNAME=[Bitcoin Node Username]
BITCOIN_PASSWORD=[Bitcoin Node Password]
BITCOIN_IP=[Bitcoin Node IP]
BITCOIN_PORT=[Bitcoin Node Port]
```

Then, we can get the JSON representation of the transactoin like this:

```js
const txho = require('txho');
(async function () {
	let result = await txho.fromHash(
		'45c6113bb1ecddc976131022bc80f46684d8956ab1a7bb5fc5625b5f7a930438'
	);
	console.log(result);
})();
```

# The output

TXHO outputs a JSON object that represents a transaction. Large data is hoisted from the main structure and placed next to it so that it's easy to manage large data in different ways while still keeping the references to ensure consistency.

Please note that the structure of the default JSON output from TXHO is similar but not equal to the output from [TXO](https://github.com/interplanaria/txo) library or the related MOM notation. You can, however, get the original structure by providing the config variable `txo` with the configuration you normally provide TXO. The TXO functionality has been included to leverage the ability to pipe data.

High level format of the output:

```bash
{
  "tx": {
    "txid": [Transaction hash],
    "in": [    // an array with an object per input
      {
        "origin": {
          "txid": [Transaction h where this input originated]
          "iOut": [Index that this input had in the transactoin where it originated]
          "address": [base58 representation of the public key of the sender (the address)]
        },
        "payload": [ // an array with an object per output
          {
            "b64": [All data defaults to base64 (see more about configuration)]
          },
          {
            "op": [If data is an OP code the property "op" will include the opcode]
			"opName": [string with the name of the opcode]
          },
          {        // if data is larger than includeDataMax (defaults to 512)
            "size": [number of bytes]
            "sha256": [hash of content],
            "uri": [a reference in [bitfs](bitfs.network) notation to identify the location in the data property]
            }
          }
        ]
      }
    ],
    "out": [
      {
		"value": [Amount of sathoshi in the output]
		"address": [receiver address]
        "payload": [ // an array with an object per output (same as input)
          ...
        ],
        "split": [ // an array with arrays of sections split up by the delimiters like  OP_RETURN and the pipe |. Same idea as the BOB format.
          [  // First section - could forexample be a B:// format
            {
              ... objects like in paload
            }
          ],
          [  // second section- could forexample be a signing AIM protocol
            {
              ... object like in paload
            }
          ]
        ]
      }
    ]
  },
  data:[
    {
      "size": [bytesize]
      "sha256": [hash],
      "b64": [data base 64 encoded],
      "uri": [The reference],
      "txid": [transaction hash of this transaction],
      "type": [input or output],
      "iScript": [index amongst input or output],
      "iChunk": [index in the input or output ]
    },
  ]
  }
}
```

# Configuration of the output

The output can be adjusted with the following configuration via cli:

```js
   --network: string,         // main or test
   --maxDataSize: number,     // What is the max size of data not hosted. Defaults to 512. If 0 no data is hoisted
   --cellB64: flag;           // Aways add a base 64 representation of data to each cell. Default true
   --cellStr: flag;           // Aways add a string representation of data to each cell. Default false
   --cellHex: flag;           // Aways add a hex representation of data to each cell. Default false
   --cellHash: flag;          // Aways add a buffer containing a data to each cell. Default false
   --cellAuto: flag;          // Try to guess the most human readable format of str/hex/b64. Will add iso representatoin of utc if string looks like a timestamp
   --cellAll: flag;           // Same as setting cellB63, cellStr, cellHex, cellHash and cellAuto to true
   --cellBuf: flag;           // Aways add a buffer containing a data to each cell. Default false
   --compress: flag;          // Compress the output to one line. Default false. If data is piped: default true.
   --only: string             // Comma seperated list of dot-notated elements to only include in output (like --only=tx.txid,data.sha256)
   --hide: string             // Comma seperated list of dot-notated elements to explude from output (like --hide=data.b64). Overruled by "only"
   --skip: number             // For piped data only: how many lines to skip before starting to execute.
   --txo: object              // The inside of a config object to initiate a TXO output.
   --pool: object;            // The inside of a config object to manage the pool size of rpc requests: See more about chiqq on npm.
                              // Is merged with default: --pool=concurrency:5,retryMax:3,retryCooling:1000,retryFactor:2
```

and following configuration via node:

```js
   network: string,         // main or test
   maxDataSize: number,     // What is the max size of data not hosted. Defaults to 512. If 0 no data is hoisted
   cellB64: flag;           // Aways add a base 64 representation of data to each cell. Default true
   cellStr: flag;           // Aways add a string representation of data to each cell. Default false
   cellHex: flag;           // Aways add a hex representation of data to each cell. Default false
   cellHash: flag;          // Aways add a buffer containing a data to each cell. Default false
   cellAuto: flag;          // Try to guess the most human readable format of str/hex/b64. Will add iso representatoin of utc if string looks like a timestamp
   cellAll: flag;           // Same as setting cellB63, cellStr, cellHex, cellHash and cellAuto to true
   cellBuf: flag;           // Aways add a buffer containing a data to each cell. Default false
   compress: boolean;       // Compress the output to one line. Default false. If data is piped: default true.
   only: string             // Comma seperated list of dot-notated elements to only include in output (like --only=tx.txid,data.sha256)
   hide: string             // Comma seperated list of dot-notated elements to explude from output (like --hide=data.b64). Overruled by "only"
   txo: object              // The inside of a config object to initiate a TXO output.
   pool: object;            // Config object to manage the pool size of rpc requests: See more about chiqq on npm.
							// Is merged with {concurrency:5,retryMax:3,retryCooling:1000,retryFactor:2}
   splitDelimiter: fn       // function to indicate if elements is delimiter
                            // defaults to: (e) => atobPipe === e.b64 || OP.RETURN === e.op || OP.FALSE === e.op,

```

# Example

Here is an example for the CLI that makes it easy to skim what is going on in the OP_RETURN data

```
$ txho txid c27d17bc9f427e5b287bee09437ef6d2749c321650a9670eb185d21873a65169 --cellAuto --only=tx.out.split
```

returns

```json
{
	"tx": {
		"out": [
			{
				"split": [
					[
						{
							"str": "19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut"
						},
						{
							"size": 39011,
							"sha256": "24066cd470667f0358ea48430c77e4e849cf637c8e491af2df14a260137d43d5"
						},
						{
							"str": "text/html"
						},
						{
							"str": "gzip"
						},
						{
							"str": "https://www.bbc.com/news/technology-52388586"
						}
					],
					[
						{
							"str": "1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5"
						},
						{
							"str": "SET"
						},
						{
							"str": "date"
						},
						{
							"utc": "2020-04-23T22:27:25.906Z",
							"str": "1587680845906"
						},
						{
							"str": "source"
						},
						{
							"str": "https://etched.page"
						}
					],
					[
						{
							"str": "15PciHG22SNLQJXMoSUaWVi7WSqc7hCfva"
						},
						{
							"str": "BITCOIN_ECDSA"
						},
						{
							"str": "1ChMHjgVPHmbRsgBH9JoaCZbnEvVsXsSdx"
						},
						{
							"b64": "IDjjAOmdyrv+TtF/4LTfbzKfZzEV84SG7Zh9791WW3opKU21o17jxiScJ3e4lSc1Pb83rci+6M6Ki7MMhgHoFdA="
						}
					]
				]
			},
			{
				"split": [
					[
						{
							"opName": "OP_DUP",
							"op": 118
						},
						{
							"opName": "OP_HASH160",
							"op": 169
						},
						{
							"b64": "E6MFcxM1ofaigmfCWxo53zpEG2Y="
						},
						{
							"opName": "OP_EQUALVERIFY",
							"op": 136
						},
						{
							"opName": "OP_CHECKSIG",
							"op": 172
						}
					]
				]
			}
		]
	}
}
```

---

An example using node with default parameters

```js
const txho = require('txho');
(async function () {
	let result = await txho.fromHash(
		'c27d17bc9f427e5b287bee09437ef6d2749c321650a9670eb185d21873a65169'
	);
	console.log(result);
})();
```

The output will be:

```json
{
	"tx": {
		"txid": "c27d17bc9f427e5b287bee09437ef6d2749c321650a9670eb185d21873a65169",
		"lockTime": 0,
		"in": [
			{
				"seq": 4294967295,
				"origin": {
					"txid": "f2f85e6e75f00ebeed2d9b2ea99e7b314190ebd4a755faa157109bec26c41422",
					"iOut": 1,
					"address": "12nq8ZcrpY6tVkuPzuW9sg4a76feLMHUaN"
				},
				"payload": [
					{
						"b64": "MEQCIGxTaQAfazTcb+fGB3Ycs5a7okXgY3YU28Snz2kfX/niAiBi97GfrwART2kp43GmRw4KYJxpmEme79DHZIUxPFHkpEE="
					},
					{
						"b64": "AzGNaeKeZmKIBy92zsQ+QkMCkQnrPyBd8fTXq1E3UrqN"
					}
				]
			}
		],
		"out": [
			{
				"value": 0,
				"payload": [
					{
						"opName": "OP_FALSE",
						"op": 0
					},
					{
						"opName": "OP_RETURN",
						"op": 106
					},
					{
						"b64": "MTlIeGlnVjRReUJ2M3RIcFFWY1VFUXlxMXB6WlZkb0F1dA=="
					},
					{
						"size": 39011,
						"sha256": "24066cd470667f0358ea48430c77e4e849cf637c8e491af2df14a260137d43d5"
					},
					{
						"b64": "dGV4dC9odG1s"
					},
					{
						"b64": "Z3ppcA=="
					},
					{
						"b64": "aHR0cHM6Ly93d3cuYmJjLmNvbS9uZXdzL3RlY2hub2xvZ3ktNTIzODg1ODY="
					},
					{
						"b64": "fA=="
					},
					{
						"b64": "MVB1UWE3SzYyTWlLQ3Rzc1NMS3kxa2g1NldXVTdNdFVSNQ=="
					},
					{
						"b64": "U0VU"
					},
					{
						"b64": "ZGF0ZQ=="
					},
					{
						"b64": "MTU4NzY4MDg0NTkwNg=="
					},
					{
						"b64": "c291cmNl"
					},
					{
						"b64": "aHR0cHM6Ly9ldGNoZWQucGFnZQ=="
					},
					{
						"b64": "fA=="
					},
					{
						"b64": "MTVQY2lIRzIyU05MUUpYTW9TVWFXVmk3V1NxYzdoQ2Z2YQ=="
					},
					{
						"b64": "QklUQ09JTl9FQ0RTQQ=="
					},
					{
						"b64": "MUNoTUhqZ1ZQSG1iUnNnQkg5Sm9hQ1pibkV2VnNYc1NkeA=="
					},
					{
						"b64": "IDjjAOmdyrv+TtF/4LTfbzKfZzEV84SG7Zh9791WW3opKU21o17jxiScJ3e4lSc1Pb83rci+6M6Ki7MMhgHoFdA="
					}
				],
				"split": [
					[
						{
							"b64": "MTlIeGlnVjRReUJ2M3RIcFFWY1VFUXlxMXB6WlZkb0F1dA=="
						},
						{
							"size": 39011,
							"sha256": "24066cd470667f0358ea48430c77e4e849cf637c8e491af2df14a260137d43d5"
						},
						{
							"b64": "dGV4dC9odG1s"
						},
						{
							"b64": "Z3ppcA=="
						},
						{
							"b64": "aHR0cHM6Ly93d3cuYmJjLmNvbS9uZXdzL3RlY2hub2xvZ3ktNTIzODg1ODY="
						}
					],
					[
						{
							"b64": "MVB1UWE3SzYyTWlLQ3Rzc1NMS3kxa2g1NldXVTdNdFVSNQ=="
						},
						{
							"b64": "U0VU"
						},
						{
							"b64": "ZGF0ZQ=="
						},
						{
							"b64": "MTU4NzY4MDg0NTkwNg=="
						},
						{
							"b64": "c291cmNl"
						},
						{
							"b64": "aHR0cHM6Ly9ldGNoZWQucGFnZQ=="
						}
					],
					[
						{
							"b64": "MTVQY2lIRzIyU05MUUpYTW9TVWFXVmk3V1NxYzdoQ2Z2YQ=="
						},
						{
							"b64": "QklUQ09JTl9FQ0RTQQ=="
						},
						{
							"b64": "MUNoTUhqZ1ZQSG1iUnNnQkg5Sm9hQ1pibkV2VnNYc1NkeA=="
						},
						{
							"b64": "IDjjAOmdyrv+TtF/4LTfbzKfZzEV84SG7Zh9791WW3opKU21o17jxiScJ3e4lSc1Pb83rci+6M6Ki7MMhgHoFdA="
						}
					]
				]
			},
			{
				"value": 925636,
				"address": "12nq8ZcrpY6tVkuPzuW9sg4a76feLMHUaN",
				"payload": [
					{
						"opName": "OP_DUP",
						"op": 118
					},
					{
						"opName": "OP_HASH160",
						"op": 169
					},
					{
						"b64": "E6MFcxM1ofaigmfCWxo53zpEG2Y="
					},
					{
						"opName": "OP_EQUALVERIFY",
						"op": 136
					},
					{
						"opName": "OP_CHECKSIG",
						"op": 172
					}
				],
				"split": [
					[
						{
							"opName": "OP_DUP",
							"op": 118
						},
						{
							"opName": "OP_HASH160",
							"op": 169
						},
						{
							"b64": "E6MFcxM1ofaigmfCWxo53zpEG2Y="
						},
						{
							"opName": "OP_EQUALVERIFY",
							"op": 136
						},
						{
							"opName": "OP_CHECKSIG",
							"op": 172
						}
					]
				]
			}
		]
	},
	"data": [
		{
			"size": 39011,
			"sha256": "24066cd470667f0358ea48430c77e4e849cf637c8e491af2df14a260137d43d5",
			"b64": "H4sIAAAAAAACA+y9aWPb.... lots of data ....HTeOYdsnu5//4/hRkEpDO0AgA=",
			"uri": "c27d17bc9f427e5b287bee09437ef6d2749c321650a9670eb185d21873a65169.out.0.3",
			"txid": "c27d17bc9f427e5b287bee09437ef6d2749c321650a9670eb185d21873a65169",
			"type": "out",
			"iScript": 0,
			"iChunk": 3
		}
	]
}
```
