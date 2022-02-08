#!/usr/bin/env node
// SPDX-License-Identifier: MIT

/**
 * Base module for flocks
 *
 * @module
 */

import * as zmq from 'zeromq'
import EventEmitter from 'events'
import { encode, decode } from '@msgpack/msgpack'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import winston, { createLogger, format } from 'winston'
import { FlockConnection } from './flock-connection'

/** Base class for flocks
 * @param obj.conport - address of control port
 * @param obj.pubport - address of publish port
 * @param obj.beaconprefix - prefix to add to numerical ports
 */

export class FlockBase {
  private repSockId: string
  private pubSockId: string
  private replySock: zmq.Reply
  private pubSock: zmq.Publisher

  protected initializedBeacon: boolean
  protected initialized: boolean
  protected beacon: FlockConnection
  protected logger: winston.Logger
  protected emitter: EventEmitter

  constructor (
    obj: any
  ) {
    this.repSockId = obj.conport
    this.replySock = new zmq.Reply()
    this.pubSockId = obj.pubport
    this.pubSock = new zmq.Publisher()

    this.beacon = new FlockConnection({
      prefix: obj.beaconprefix
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
  }

  protected async initialize (): Promise<void> {
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

  /**
   * begin event loop
   */

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

  async send (data: unknown) {
    this.replySock.send(encode(data))
  }

  async publish (filter: string, data: unknown) {
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

  protected async beaconInitialize (): Promise<void> {
    // empty function
  }

  /**
   * monitor beacon for new events
   */

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

  protected static _yargs () {
    // eslint-disable-next-line no-unused-vars
    return yargs(hideBin(process.argv)).command(
      '$0 [port]',
      'the default command',
      (yargs: any) => {
        // do nothing
      },
      (argv: any) => {
        this.startup(argv)
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
