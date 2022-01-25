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
  sock: zmq.Request;
  rl
  constructor (
    connectId: string
  ) {
    this.sock = new zmq.Request()
    this.sock.connect(connectId)
    logger.log('info', 'Cli bound to %s', connectId)
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
  }

  async send (command: string): Promise<any> {
    const [cmdfull, data] = mySplit(command, ' ', 2)
    const [cmd, subcmd] = mySplit(cmdfull, '.', 2)
    await this.sock.send(encode({
      cmd: cmd,
      subcmd: subcmd,
      data: data
    }))
    const [result] = await this.sock.receive()
    return decode(result)
  }

  async readline (): Promise<void> {
    const me = this
    this.rl.question('Command: ', async function (answer) {
      const result = await me.send(answer)
      console.log(result)
      me.readline()
    })
  }

  run () : void {
    this.readline()
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
      const cli = new FlockCli(argv.port)
      cli.run()
    }).argv
}
