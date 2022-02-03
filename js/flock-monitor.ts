#!/usr/bin/env node
import { FlockBase } from './flock-base'
import winston from 'winston'
import readline from 'readline'
import JSON5 from 'json5'

function mySplit (
  string: string,
  delimiter: string,
  n: number
) {
  const parts = string.split(delimiter)
  return parts.slice(0, n - 1).concat([parts.slice(n - 1).join(delimiter)])
}

export class FlockMonitor extends FlockBase {
  readInput: boolean
  rl
  constructor (obj: any) {
    super(obj)
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    this.readInput = true
    this.logger.add(new winston.transports.Console({}))
    if (obj.pubport !== undefined) {
      this.subSockConnect(obj.pubport)
    }
    if (obj.subscribe != undefined) {
      this.beaconSubscribe(obj.subscript)
    }
  }

  async initialize (): Promise<void> {
    process.on('uncaughtException', (err) => {
      this.send(err)
    })
    await super.initialize()
    this.emitter.on(
      'connect',
      async (inobj: any): Promise<void> => {
        try {
          const pubport = inobj.data.toString()
          this.subSockConnect(pubport)
          this.send(`connected to ${pubport}`)
        } catch (e) {
          this.send(e)
        }
      })

    this.emitter.on(
      'subscribe',
      async (inobj: any): Promise<void> => {
        this.beaconSubscribe(inobj.data)
        this.send(`subscribed to ${inobj.data}`)
      })
    this.emitter.on(
      'unsubscribe',
      async (inobj: any): Promise<void> => {
        this.beaconUnsubscribe(inobj.data)
        this.send(`unsubscribed to ${inobj.data}`)
      })
  }

  async beaconProcessTxn (filter: string, inobj: any) : Promise<boolean> {
    this.logger.log('info', filter, inobj)
    return true
  }

  subSockConnect(pubport: string) {
    if (pubport.match(/^[0-9]+$/)) {
      pubport = `${this.beaconPrefix}:${pubport}`
    }
    this.beaconSubSock.connect(pubport)
  }

  version () : string {
    return 'FlockMonitor'
  }

  async send (data: any) {
    console.log(data)
  }

  async readline (): Promise<void> {
    const me = this
    this.rl.question('Command: ', async function (answer) {
      const [cmdfull, datafull] = mySplit(answer, ' ', 2)
      const [cmd, subcmd] = mySplit(cmdfull, '.', 2)
      let data
      if (datafull[0] === '[' || datafull[0] === '{' ||
          datafull[0] === '"' || datafull[0] === '\'') {
        try {
          data = JSON5.parse(datafull)
        } catch (e) {
          return e
        }
      } else {
        data = datafull
      }
      try {
        if (!await me.processTxn({
          cmd: cmd,
          subcmd: subcmd,
          data: data
        })) {
          me.send('unknown command')
        }
      } catch (e) {
        me.send(e)
      }
      if (me.readInput) {
        me.readline()
      }
    })
  }

  async run () : Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }
    this.beaconRun()
    await this.readline()
  }

  static runServer () : void {
    // eslint-disable-next-line no-unused-vars
    const argv = this._yargs().default(
      {
        beaconprefix: 'tcp://127.0.0.1'
      }).argv
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  FlockMonitor.runServer()
}
