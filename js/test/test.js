const assert = require('assert')
const FlockServer = require('../flock-server').default

describe('Manager', function () {
  let app
  before(async function () {
    app = new FlockServer('tcp://127.0.0.1:3000')
    app.run()
  })
  after(function () {
    app.shutdown()
  })

  describe('test1', function () {
    it('processTxn', async function () {
      assert.ok(!await app.processTxn({ cmd: 'foo', data: 'bar' }))
    })
  })
})
