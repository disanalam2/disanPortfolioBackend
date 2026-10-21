const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

process.env.ADMIN_USERNAME = 'admin';
process.env.JWT_SECRET = 'test-secret';
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('disan123', 10);
delete process.env.ADMIN_PASSWORD;

const authController = require('../controllers/authController');

const req = {
  body: {
    username: 'admin',
    password: 'disan123'
  }
};

const res = {
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  }
};

(async () => {
  await authController.login(req, res, () => {
    throw new Error('next() should not be called for valid login');
  });

  assert.equal(res.statusCode, 200, 'valid login should succeed');
  assert.equal(res.body.success, true, 'login response should be successful');
  assert.ok(res.body.token, 'token should be generated');
  console.log('auth security test passed');
})();
