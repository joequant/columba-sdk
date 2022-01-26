const assert = require('assert')
const FlockBase = require('../flock-base')
const FlockCli = require('../flock-cli')

describe('Manager', function () {
  let app, cli
  before(async function () {
    app = new FlockBase.FlockBase('tcp://127.0.0.1:3000')
    cli = new FlockCli.FlockCli()
    app.run()
    await cli.portConnect('default', 'tcp://127.0.0.1:3000')
  })
  after(function () {
    app.shutdown()
  })

  describe('test1', function () {
    it('processTxn', async () => {
      assert.ok(!await app.processTxn({ cmd: 'foo', data: 'bar' }))
    })

    it('echo', async () => {
      const r = await cli.send('echo hello world')
      assert.equal(r, 'hello world')
    })

    it('version', async () => {
      const r = await cli.send('version')
      assert.equal(r, 'FlockBase')
    })

    /*    it('.port-list', async () => {
      const r = await cli.send('.port-list')
      assert.equal(r.default, 'tcp://127.0.0.1:3000')
    }) */
  })
})
