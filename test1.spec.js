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

  test('load the first page', async () => {
    await tester.loadPage('/test.html');
    const h1 = await tester.find('h1');
    const res = await h1[0].innerHTML;
    expect(res).toEqual(' test');
  });

  test('reload page', async () => {
    const reloadbutton = await tester.find('#reload');
    await reloadbutton[0].click();
    const res = await tester.exists("#test1");
    expect(res).toEqual(true);
  });

  test('excute command', async () => {
    const res = await tester.exec(function() { return document.querySelectorAll("#test2").length; });
    expect(res).toEqual(0);
  });

  test('wait for element to appear', async () => {
    await tester.exec(function() { return document.querySelector('#clickme').click(); });
    const res = await tester.exists("#test2");
    expect(res).toEqual(true);
  });

  test('load another page', async () => {
    await tester.loadPage('/test2.html');
    const res = await tester.exists("#test1");
    expect(res).toEqual(true);
  });

  test('click element on the new page', async () => {
    await tester.exec(function() { return document.querySelector('#clickme').click(); });
    const res = await tester.exists("#test2");
    expect(res).toEqual(true);
  });

  test('find element on the new page', async () => {
    const h1 = await tester.find('h1');
    const res = await h1[0].innerHTML;
    expect(res).toEqual('test 1');
  });
});
