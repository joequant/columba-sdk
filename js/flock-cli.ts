#!/usr/bin/env node
// SPDX-License-Identifier: MIT

import zmq = require('zeromq')
import readline = require('readline');
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { encode, decode } from '@msgpack/msgpack'
import { createLogger, format, transports } from 'winston'

const myTransports = {
  file: new transports.File({ filename: 'cli.log' }),
  console: new transports.Console()
}

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.splat(),
    format.simple()
  ),
  transports: [
    myTransports.file,
    myTransports.console
  ]
})

function mySplit (
  string: string,
  delimiter: string,
  n: number
) {
  const parts = string.split(delimiter)
  return parts.slice(0, n - 1).concat([parts.slice(n - 1).join(delimiter)])
}

export class FlockCli {
  sockList: Map<string, any>
  ports: Map<string, string>
  readInput: boolean
  rl
  constructor () {
    this.sockList = new Map<string, any>()
    this.ports = new Map<string, string>()
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    this.readInput = true
  }

  async send (command: string): Promise<any> {
    const [cmdfull, datafull] = mySplit(command, ' ', 2)
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
    if (cmdfull === '.exit') {
      this.portDisconnectAll()
      this.readInput = false
      return ''
    } else if (cmdfull === '.port-connect') {
      let [name, port] = mySplit(data, ' ', 2)
      if (port.match(/^[0-9]+/)) {
        port = `tcp://127.0.0.1:${port}`
      }
      return await this.portConnect(name, port)
    } else if (cmdfull === '.port-disconnect') {
      return await this.portDisconnect(data)
    } else if (cmdfull === '.port-list') {
      return await this.portList()
    }

    const [cmd2, subcmd] = mySplit(cmdfull, '.', 2)
    let cmd: string, port: string
    if (cmd2.includes('/')) {
      [port, cmd] = mySplit(cmd2, '/', 2)
    } else {
      cmd = cmd2
      port = 'default'
    }
    if (this.sockList.get(port) === undefined) {
      return 'no connection'
    }
    await this.sockList.get(port).send(encode({
      cmd: cmd,
      subcmd: subcmd,
      data: data
    }))
    const [result] = await this.sockList.get(port).receive()
    return decode(result)
  }

  async portConnect (name: string, port: string): Promise<any> {
    if (this.sockList.get(name) === undefined) {
      this.sockList.set(name, new zmq.Request())
    } else {
      this.sockList.get(name).disconnect()
    }
    this.ports.set(name, port)
    this.sockList.get(name).connect(port)
    logger.log('info', 'Cli %s bound to %s', name, port)
  }

  async portDisconnect (name: string): Promise<any> {
    logger.log('info', 'closing port %s', name)
    if (this.sockList.get(name) !== undefined) {
      this.sockList.get(name).disconnect(this.ports.get(name))
      this.sockList.delete(name)
      this.ports.delete(name)
    }
  }

  async portDisconnectAll (): Promise<any> {
    for (const name in this.ports.keys()) {
      this.portDisconnect(name)
    }
  }

  async portList (): Promise<Object> {
    return Object.fromEntries(this.ports)
  }
  async readline (): Promise<void> {
    const me = this
    this.rl.question('Command: ', async function (answer) {
      console.log(await me.send(answer))
      if (me.readInput) {
        me.readline()
      }
    })
  }

  async run () : Promise<void> {
    console.log(await this.send('version'))
    await this.readline()
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  // eslint-disable-next-line no-unused-vars
  const argv = yargs(hideBin(process.argv)).command(
    '$0 [port]',
    'the default command',
    (yargs) => {
      return yargs.positional('port', {
        describe: 'port value',
        type: 'string',
        default: 'tcp://127.0.0.1:3000'
      })
    },
    (argv) => {
      const cli = new FlockCli()
      cli.portConnect('default', argv.port).then(() => cli.run())
    }).argv
}
