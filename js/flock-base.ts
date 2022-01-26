#!/usr/bin/env node
// SPDX-License-Identifier: MIT

import zmq = require('zeromq')
import { encode, decode } from '@msgpack/msgpack'
import EventEmitter = require('events')
import yargs = require('yargs/yargs')
import { hideBin } from 'yargs/helpers'

export class FlockBase {
  replySockId: string
  replySock: zmq.Reply
  emitter: EventEmitter
  initialized: boolean
  constructor (
    replySockId: string
  ) {
    this.replySockId = replySockId
    this.replySock = new zmq.Reply()
    this.emitter = new EventEmitter()
    this.initialized = false
  };

  async initialize (): Promise<void> {
    await this.replySock.bind(this.replySockId)
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

  async publishSock (connId: string) {
    const pubSock = new zmq.Publisher()
    await pubSock.bind(connId)
    return pubSock
  }

  async shutdown () : Promise<void> {
    process.exit(0)
  }

  static startup (argv: any) : void {
  }

  static runServer () : void {
    const me = this
    // eslint-disable-next-line no-unused-vars
    const argv = yargs(hideBin(process.argv)).command(
      '$0 [port]',
      'the default command',
      (yargs: any) => {
        return yargs.positional('port', {
          describe: 'port value',
          type: 'string',
          default: 'tcp://127.0.0.1:3000'
        })
      },
      (argv: any) => {
        me.startup(argv)
      }).argv
  }
}
