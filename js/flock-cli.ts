#!/usr/bin/env node
// SPDX-License-Identifier: MIT

import zmq = require('zeromq')
import readline = require('readline');
import yargs = require('yargs/yargs')
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
  sockList: any
  ports: Map<string, string>
  rl
  constructor () {
    this.sockList = {}
    this.ports = new Map<string, string>()
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
  }

  async send (command: string): Promise<any> {
    const [cmdfull, data] = mySplit(command, ' ', 2)
    if (cmdfull === '.port-connect') {
      let [name, port] = mySplit(data, ' ', 2)
      if (port.match(/^[0-9]+/)) {
        port = 'tcp://127.0.0.1:' + port
      }
      return await this.portConnect(name, port)
    } else if (cmdfull === '.port-disconnect') {
      return await this.portDisconnect(data)
    } else if (cmdfull === '.port-list') {
      return await this.portList()
    }

    const [cmd2, subcmd] = mySplit(cmdfull, '.', 2)
    let [cmd, port] = mySplit(cmd2, '/', 2)
    if (port === '') {
      port = 'default'
    }
    await this.sockList[port].send(encode({
      cmd: cmd,
      subcmd: subcmd,
      data: data
    }))
    const [result] = await this.sockList[port].receive()
    return decode(result)
  }

  async portConnect (name: string, port: string): Promise<any> {
    if (port.match(/^[0-9]+$/)) {
      port = 'tcp://127.0.0.1/' + port
    }
    if (this.sockList[name] === undefined) {
      this.sockList[name] = new zmq.Request()
    } else {
      this.sockList[name].disconnect()
    }
    this.ports.set(name, port)
    this.sockList[name].connect(port)
    logger.log('info', 'Cli %s bound to %s', name, port)
  }

  async portDisconnect (name: string): Promise<any> {
    logger.log('info', 'closing port %s', name)
    if (this.sockList[name] !== undefined) {
      this.sockList[name].disconnect(this.ports.get(name))
      delete this.sockList[name]
      this.ports.delete(name)
    }
  }

  async portList (): Promise<any> {
    return this.ports
  }

  async readline (): Promise<void> {
    const me = this
    this.rl.question('Command: ', async function (answer) {
      const result = await me.send(answer)
      console.log(result)
      me.readline()
    })
  }

  async run () : Promise<void> {
    const result = await this.send('version')
    console.log('connect to ' + result)
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
