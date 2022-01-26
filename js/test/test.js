const assert = require('assert')
const FlockBase = require('../flock-base').default
const FlockCli = require('../flock-cli')

describe('Manager', function () {
  let app
  before(async function () {
    app = new FlockBase('tcp://127.0.0.1:3000')
    cli = new FlockCli.FlockCli('tcp://127.0.0.1:3000')
    app.run()
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
  })
})
