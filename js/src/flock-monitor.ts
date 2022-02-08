#!/usr/bin/env node
import { FlockBase } from './flock-base'
import winston from 'winston'
import readline from 'readline'
import JSON5 from 'json5'
import { mySplit } from './flock-util'

/**
 * class for reading events from flock
 *
 * @param obj.subport - port to connect
 * @param obj.subscribe - filter to subscribe
 */

export class FlockMonitor extends FlockBase {
  private readInput: boolean
  private rl
  constructor (obj: any) {
    super(obj)
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    this.readInput = true
    this.logger.add(new winston.transports.Console({}))
    if (obj.subport !== undefined) {
      this.beacon.connect(null, obj.subport.toString())
    }
    if (obj.subscribe !== undefined) {
      this.beacon.subscribe(obj.subscribe.toString())
    } else {
      this.beacon.subscribe()
    }
  }

  override async initialize (): Promise<void> {
    process.on('uncaughtException', (err) => {
      this.send(err)
    })
    await super.initialize()
    this.emitter.on(
      'connect',
      async (inobj: any): Promise<void> => {
        try {
          const subport = inobj.data.toString()
          this.beacon.connect(null, subport)
          this.send(`connected to ${subport}`)
        } catch (e) {
          this.send(e)
        }
      })

    this.emitter.on(
      'subscribe',
      async (inobj: any): Promise<void> => {
        this.beacon.subscribe(inobj.data)
        this.send(`subscribed to ${inobj.data}`)
      })
    this.emitter.on(
      'subscribe-all',
      async (inobj: any): Promise<void> => {
        this.beacon.subscribe()
        this.send('subscribed to all')
      })
    this.emitter.on(
      'unsubscribe',
      async (inobj: any): Promise<void> => {
        this.beacon.unsubscribe(inobj.data)
        this.send(`unsubscribed to ${inobj.data}`)
      })
    this.emitter.on(
      'unsubscribe-all',
      async (inobj: any): Promise<void> => {
        this.beacon.unsubscribe()
        this.send('unsubscribed to all')
      })
  }

  override async beaconProcessTxn (filter: string, inobj: any) : Promise<boolean> {
    this.logger.log('info', filter, inobj)
    return true
  }

  override version () : string {
    return 'FlockMonitor'
  }

  override async send (data: any) {
    console.log(data)
  }

  async readline (): Promise<void> {
    this.rl.question('Monitor> ', async (answer) => {
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
        if (!await this.processTxn({
          cmd: cmd,
          subcmd: subcmd,
          data: data
        })) {
          this.send('unknown command')
        }
      } catch (e) {
        this.send(e)
      }
      if (this.readInput) {
        this.readline()
      }
    })
  }

  override async run () : Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }
    this.beaconRun()
    await this.readline()
  }

  static override runServer () : void {
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
