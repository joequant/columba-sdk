import { FlockBase, FlockCli } from '..'
import assert from 'assert'

describe('FlockBase', function () {
  let app : FlockBase, cli: FlockCli
  before(async function () {
    app = new FlockBase({
      conport: 'tcp://127.0.0.1:3000',
      pubport: 'tcp://127.0.0.1:3001'
    })
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

    it('echo string', async () => {
      const r = await cli.send('echo "hello world"')
      assert.equal(r, 'hello world')
    })

    it('echo string', async () => {
      const r = await cli.send('echo \'hello world\'')
      assert.equal(r, 'hello world')
    })

    it('echo array', async () => {
      const r = await cli.send('echo [ 1, 2 ]')
      assert.equal(r[0], 1)
    })

    it('echo object', async () => {
      const r = await cli.send('echo {"foo": 99, "bar": 2 }')
      assert.equal(r.foo, 99)
      assert.equal(r.bar, 2)
    })

    it('echo object', async () => {
      const r = await cli.send('echo {foo: 99, bar: 2 }')
      assert.equal(r.foo, 99)
      assert.equal(r.bar, 2)
    })

    it('echo error', async () => {
      const r = await cli.send('echo {{')
      assert.ok(r.toString().includes('SyntaxError'))
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
