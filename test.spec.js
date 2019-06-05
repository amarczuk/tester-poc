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
  
  test('test 1', async () => {
    const res = await tester.exec('document.querySelector("#test1").innerHTML')
    expect(res).toBe('abc');
  })
})
