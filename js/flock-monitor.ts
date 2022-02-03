#!/usr/bin/env node
import { FlockBase } from './flock-base'
import winston from 'winston'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import readline from 'readline'

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
    this.logger.add(new winston.transports.Console({}));
  }
  async initialize (): Promise<void> {
    process.on('uncaughtException', (err) => {
      this.send(err);
    });
    await super.initialize()
    this.emitter.on(
      'connect',
      async (inobj: any): Promise<void> => {
        let pubport = inobj.toString()
        if (pubport.match(/^[0-9]+$/)) {
          pubport = `${this.beaconPrefix}:${pubport}`
        }
        try {
          this.beaconSubSock.connect(pubport)
          this.send(`connected to ${pubport}`)
        } catch(e) {
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

  async beaconProcessTxn (inobj: any) : Promise<boolean> {
    this.logger.log('info', inobj)
    return true
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
          datafull[0] === '"') {
        try {
          data = JSON.parse(datafull)
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
      } catch(e) {
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
    const me = this
    // eslint-disable-next-line no-unused-vars
    const argv = yargs(hideBin(process.argv)).command(
      '$0 [port]',
      'the default command',
      (yargs) => {
        return yargs.positional('pubport', {
          describe: 'port value',
          type: 'string'
        })
      },
      (argv) => {
        me.startup(argv)
      }).argv
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  FlockMonitor.runServer()
}
