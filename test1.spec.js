const tester = require('./tester');

describe('test v2', () => {
  beforeAll(async (done) => {
      await tester.start();
      done();
  });
  // 
  // afterAll(async (done) => {
  //   await tester.stop();
  //   done();
  // });

  test('test 3', async () => {
    const res = await tester.exec('document.querySelectorAll("#test2").length')
    expect(res).toEqual(1);
  })
})
