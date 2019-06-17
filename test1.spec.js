const tester = require('./tester');

describe('test v2', () => {
  beforeAll(async (done) => {
      await tester.start();
      done();
  });

  afterAll(async (done) => {
    await tester.stop();
    done();
  });

  test('reload', async () => {
    const reloadbutton = await tester.find('#reload');
    reloadbutton[0].click();
    await tester.wait(500); // grrrr
    const res = await tester.exists("#test1");
    expect(res).toEqual(true);
  });

  test('test 3', async () => {
    const res = await tester.exec(() => document.querySelectorAll("#test2").length)
    expect(res).toEqual(0);
  });

  test('test 4', async () => {
    await tester.exec(() => document.querySelector('#clickme').click());
    const res = await tester.exists("#test2");
    expect(res).toEqual(true);
  });
});
