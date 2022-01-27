import { FlockBase } from '../flock-base'
import { FlockCli } from '../flock-cli'
import assert from 'assert'

describe('FlockBase', function () {
  let app : FlockBase, cli: FlockCli
  before(async function () {
    app = new FlockBase('tcp://127.0.0.1:3000')
    cli = new FlockCli()
    assert.ok(app !== undefined)
    assert.ok(cli !== undefined)
    app.run()
    await cli.portConnect('default', 'tcp://127.0.0.1:3000')
  })
  after(function () {

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

    it('.port-list', async () => {
      const r = await cli.send('.port-list')
      assert.equal(r.default, 'tcp://127.0.0.1:3000')
    })
    it('.exit', async () => {
      await cli.send('.exit')
    })
  })
})
