#!/usr/bin/env node
export * from './fromHash';
export * from './fromTx';
import cli from './cli';

if (require.main === module) {
	cli();
}
