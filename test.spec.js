const tester = require('./tester');

describe('test v1', () => {
  //jest.setTimeout(30000);

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
  });

  test('test 2', async () => {
    const res = await tester.exec('document.querySelectorAll("#test1").length')
    expect(res).toEqual(1);
  })

  test('test 2a', async () => {
    const test1 = await tester.find('#test1');
    const res = await test1[0].innerHTML;
    expect(res).toEqual('abc');
  })

  test('test 2b', async () => {
    const test1 = await tester.find('#test1');
    const res = await test1[0].getAttribute('id');
    expect(res).toEqual('test1');
  })
})
