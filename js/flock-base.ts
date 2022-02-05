#!/usr/bin/env node
// SPDX-License-Identifier: MIT

import * as zmq from 'zeromq'
import EventEmitter from 'events'
import { encode, decode } from '@msgpack/msgpack'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import winston, { createLogger, format } from 'winston'
import { FlockConnection } from './flock-connection'

export class FlockBase {
  repSockId: string
  pubSockId: string
  replySock: zmq.Reply
  pubSock: zmq.Publisher
  beacon: FlockConnection
  logger: winston.Logger
  initializedBeacon: boolean
  emitter: EventEmitter
  initialized: boolean

  constructor (
    obj: any
  ) {
    this.repSockId = obj.conport
    this.replySock = new zmq.Reply()
    this.pubSockId = obj.pubport
    this.pubSock = new zmq.Publisher()

    this.beacon = new FlockConnection({
      prefix: obj.beaconPrefix
    })
    this.emitter = new EventEmitter()
    this.initialized = false
    this.initializedBeacon = false

    this.logger = createLogger({
      level: 'info',
      format: format.combine(
        format.splat(),
        format.simple()
      )
    })
  };

  async initialize (): Promise<void> {
    this.initialized = true
    if (this.repSockId !== undefined) {
      await this.replySock.bind(this.repSockId)
    }
    if (this.pubSockId !== undefined) {
      await this.pubSock.bind(this.pubSockId)
    }
    this.emitter.on('echo', async (inobj: any): Promise<void> => {
      this.send(inobj.data)
    })

    this.emitter.on(
      'beacon-connect',
      async (inobj: any): Promise<void> => {
        const conport = inobj.data[0].toString()
        const pubport = inobj.data[1].toString()
        try {
          this.beacon.connect(conport, pubport)
          this.send(`connected to ${conport} ${pubport}`)
          this.logger.log(
            'info', 'beaconConnect %s %s',
            conport, pubport
          )
        } catch (e) {
          this.send(e)
        }
      })

    this.emitter.on('version', async (inobj: any): Promise<void> => {
      this.send(this.version())
    })
  }

  version () : string {
    return 'FlockBase'
  }

  async run () : Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }
    this.beaconRun()
    for await (const [msg] of this.replySock) {
      try {
        if (!await this.processTxn(decode(msg))) {
          this.send('unknown command')
        }
      } catch (e) {
        this.send(e)
      }
    }
  }

  async processTxn (inobj: any) : Promise<boolean> {
    return this.emitter.emit(inobj.cmd, inobj)
  }

  async send (data: any) {
    this.replySock.send(encode(data))
  }

  async publish (filter: string, data: any) {
    this.pubSock.send([filter, encode(data)])
  }

  async shutdown () : Promise<void> {
    process.exit(0)
  }

  static startup (argv: any) : void {
    const app = new this(argv)
    app.run()
  }

  // --------------- beacon functions

  async beaconInitialize (): Promise<void> {
  }

  async beaconRun () : Promise<void> {
    if (!this.initializedBeacon) {
      await this.beaconInitialize()
    }
    // eslint-disable-next-line no-unused-vars
    for await (const [filter, msg] of this.beacon.subSock) {
      await this.beaconProcessTxn(filter.toString(), decode(msg))
    }
  }

  async beaconProcessTxn (filter: string, inobj: any) : Promise<boolean> {
    return true
  }

  static _yargs () {
    const me = this
    // eslint-disable-next-line no-unused-vars
    return yargs(hideBin(process.argv)).command(
      '$0 [port]',
      'the default command',
      (yargs: any) => {
      },
      (argv: any) => {
        me.startup(argv)
      })
  }

  static runServer () : void {
    // eslint-disable-next-line no-unused-vars
    const argv = this._yargs().default(
      {
        conport: 'tcp://127.0.0.1:3000',
        beaconprefix: 'tcp://127.0.0.1'
      }).argv
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  FlockBase.runServer()
}
