#!/usr/bin/env node
// SPDX-License-Identifier: MIT

import zmq = require('zeromq')
import { encode, decode } from '@msgpack/msgpack'
import EventEmitter = require('events')

export default class FlockServer {
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
  }

  async run () : Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }
    for await (const [msg] of this.replySock) {
      const inobj: any = decode(msg)
      if (!this.emitter.emit(inobj.cmd, inobj)) {
        this.send('unknown command')
      }
    }
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
}
