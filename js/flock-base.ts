#!/usr/bin/env node
// SPDX-License-Identifier: MIT

import * as zmq from 'zeromq'
import EventEmitter from 'events'
import { encode, decode } from '@msgpack/msgpack'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import winston, { createLogger, format } from 'winston'

export class FlockBase {
  repSockId: string
  pubSockId: string
  replySock: zmq.Reply
  pubSock: zmq.Publisher
  beaconReqSock: zmq.Request
  beaconSubSock: zmq.Subscriber
  logger: winston.Logger

  emitter: EventEmitter
  initialized: boolean
  initializedBeacon: boolean
  beaconPrefix: string
  constructor (
    obj: any
  ) {
    this.repSockId = obj.conport
    this.replySock = new zmq.Reply()
    this.pubSockId = obj.pubport
    this.pubSock = new zmq.Publisher()
    this.beaconReqSock = new zmq.Request()
    this.beaconSubSock = new zmq.Subscriber()
    this.emitter = new EventEmitter()
    this.initialized = false
    this.initializedBeacon = false
    this.beaconPrefix = obj.beaconprefix
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
        let conport = inobj.data[0].toString()
        let pubport = inobj.data[1].toString()
        if (conport.match(/^[0-9]+$/)) {
          conport = `${this.beaconPrefix}:${conport}`
        }
        if (pubport.match(/^[0-9]+$/)) {
          pubport = `${this.beaconPrefix}:${pubport}`
        }
        try {
          await this.beaconConnect(conport, pubport)
          this.send(`connected to ${conport} ${pubport}`)
        } catch(e) {
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
      } catch(e) {
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
    this.initializedBeacon = true
  }

  async beaconConnect (
    beaconControl: string,
    beaconPublisher: string
  ) : Promise<void> {
    this.beaconReqSock.connect(beaconControl)
    this.beaconSubSock.connect(beaconPublisher)
    this.logger.log(
      'info', 'beaconConnect %s %s',
      beaconControl, beaconPublisher
    )
  }

  async beaconRun () : Promise<void> {
    if (!this.initializedBeacon) {
      await this.beaconInitialize()
    }

    for await (const [filter, msg] of this.beaconSubSock) {
      this.logger.log('info', decode(msg))
      await this.beaconProcessTxn(decode(msg))
    }
  }

  async beaconProcessTxn (inobj: any) : Promise<boolean> {
    return true
  }

  async beaconSend (data: any) {
    this.beaconReqSock.send(data)
  }

  async beaconSubscribe (data: string) {
    this.beaconSubSock.subscribe(data)
  }

  async beaconUnsubscribe (data: string) {
    this.beaconSubSock.unsubscribe(data)
  }

  static runServer () : void {
    const me = this
    // eslint-disable-next-line no-unused-vars
    const argv = yargs(hideBin(process.argv)).command(
      '$0 [port]',
      'the default command',
      (yargs: any) => {
      },
      (argv: any) => {
        me.startup(argv)
      }).default(
      {
        conport: 'tcp://127.0.0.1:3000',
        beaconprefix: 'tcp://127.0.0.1'
      }).argv
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  FlockBase.runServer()
}
