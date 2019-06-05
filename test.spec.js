const tester = require('./tester.js');

describe('test', () => {
  beforeAll(async (done) => {
      await tester.start();
      done();
  });
  
  afterAll(async (done) => {
    await tester.stop();
    done();
  });
  
  test('test 1', () => {
    expect(1).toBe(1);
  })
})
