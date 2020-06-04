interface Configuration {
	concurrency?: number
	chill?: number
	paused?: false
	retryMax?: number
	retryCooling?: number
	retryFactor?: number 
}

interface ConfigTask {
	chill?: number
	retryCooling?: number
	addAsFirst?: boolean
}

const delay = async (timeout: number) => {
	return new Promise((resolve) => {
		setTimeout(() => resolve(), timeout)
	})
}

export default class Chiqq {
	concurrency: number
	conf: {
		retryMax: number
		retryCooling: number
		retryFactor: number
		chill: number
	}
	running: number
	paused: boolean
	q: any

	constructor(conf: Configuration) {
		this.conf = {
			chill: (conf.chill || 1) | 0,
			retryMax: (conf.retryMax || 0) | 0,
			retryCooling: (conf.retryCooling || 50) | 0,
			retryFactor: (conf.retryFactor || 0) | 0,
		}
		this.concurrency = (conf.concurrency || 1) | 0
		this.paused = !!conf.paused || false
		this.running = 0
		this.q = []
	}

	async tick() {
		if (this.paused) return

		if (this.concurrency <= this.running) return

		const payload = this.q.shift()

		if (!payload) return

		this.running++

		let conf = {...this.conf, ...payload.conf}

		const run = async () => {
			let result

			try {
				result = await payload.task()
			} catch (e) {
				this.running--

				if (conf.retryMax < 0 || payload.retries++ < conf.retryMax) {
					setTimeout(() => {
						this.q.unshift(payload)
						this.tick()
					}, conf.retryCooling + conf.retryCooling * conf.retryFactor)
				} else {
					payload.reject(e)
				}
				return this.next()
			}

			this.running--

			payload.resolve(result)

			return this.next(conf)
		}

		if (conf.chill) {
			Promise.resolve(setTimeout(() => run(), 0))
		} else {
			Promise.resolve(run())
		}
	}

	add(task: () => any, configObj: ConfigTask = {}) {
		if (typeof task !== 'function') throw new Error('Please pass a function')
		return new Promise(async (resolve, reject) => {
			let conf = {...this.conf, ...configObj}

			if (conf.addAsFirst) {
				this.q.unshift({task, resolve, reject, retried: 0, conf})
			} else {
				this.q.push({task, resolve, reject, retried: 0, conf})
			}

			if (conf.chill && this.running) {
				await delay(conf.chill * this.running)
			}

			this.tick()
		})
	}

	pause() {
		this.paused = true
	}

	resume() {
		this.paused = false

		while (this.q.length && this.running <= this.concurrency) {
			this.tick()
		}
	}

	next(configObj: ConfigTask = {}) {
		let conf = {...this.conf, ...configObj}

		if (conf.chill && this.running) {
			return setTimeout(() => {
				this.tick()
			}, conf.chill)
		}
		return this.tick()
	}

	insight() {
		return {
			concurrency: this.concurrency,
			paused: this.paused,
			qLength: this.q.length,
			running: this.running,
			chill: this.conf.chill,
			retryMax: this.conf.retryMax,
			retryCooling: this.conf.retryMax,
			retryFactor: this.conf.retryFactor,
		}
	}
}
