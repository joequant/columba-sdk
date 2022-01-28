#!/usr/bin/env node
// SPDX-License-Identifier: MIT

import zmq = require('zeromq')
import { encode, decode } from '@msgpack/msgpack'
import EventEmitter = require('events')
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export class FlockBase {
  repSockId: string
  replySock: zmq.Reply
  pubSockId: string
  pubSock: zmq.Publisher
  emitter: EventEmitter
  initialized: boolean
  constructor (
    obj: any
  ) {
    this.repSockId = obj.conport
    this.replySock = new zmq.Reply()
    this.pubSockId = obj.pubport
    this.pubSock = new zmq.Publisher()
    this.emitter = new EventEmitter()
    this.initialized = false
  };

  async initialize (): Promise<void> {
    if (this.repSockId !== undefined) {
      await this.replySock.bind(this.repSockId)
    }
    if (this.pubSockId !== undefined) {
      await this.pubSock.bind(this.pubSockId)
    }
    this.emitter.on('echo', async (inobj: any): Promise<void> => {
      this.send(inobj.data)
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
    for await (const [msg] of this.replySock) {
      if (!await this.processTxn(decode(msg))) {
        this.send('unknown command')
      }
    }
  }

  async processTxn (inobj: any) : Promise<boolean> {
    return this.emitter.emit(inobj.cmd, inobj)
  }

  async send (data: any) {
    this.replySock.send(encode(data))
  }

  async sendSock (sock: any, data: any) {
    sock.send(encode(data))
  }

  async shutdown () : Promise<void> {
    process.exit(0)
  }

  static startup (argv: any) : void {
    const app = new FlockBase(argv)
    app.run()
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
        conport: 'tcp://127.0.0.1:3000'
      }).argv
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  FlockBase.runServer()
}
