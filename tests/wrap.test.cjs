const test = require('node:test')
const assert = require('node:assert/strict')
const wrap = require('../server/wrap.cjs')

test('async middleware receives next and can continue the request', async () => {
  const req = {}, res = {}
  let continued = false
  await wrap(async (request, response, next) => {
    assert.equal(request, req)
    assert.equal(response, res)
    next()
  })(req, res, () => { continued = true })
  assert.equal(continued, true)
})

test('async middleware forwards thrown errors', async () => {
  const failure = new Error('failure')
  let forwarded
  await wrap(async () => { throw failure })({}, {}, (error) => { forwarded = error })
  assert.equal(forwarded, failure)
})
