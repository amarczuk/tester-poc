const WebSocket = require('ws');
const uuidv1 = require('uuid/v1');
const EventEmitter = require('events');
// const commands = require('./commands');

class TestEmitter extends EventEmitter {}
const testEmitter = new TestEmitter();

const ws = new WebSocket('ws://localhost:8585/server');
const eventName = data => `msg_${data.payload}_${data.time}`;

const wait = async time => new Promise(resolve => setTimeout(resolve, time));
const send = (ws, msg) => ws.send(JSON.stringify(msg));

let connected = false;
let connectionCount = 0;
let tid = uuidv1();

module.exports.stop = async () => {
  if (!connected) return;
  connectionCount--;
  if (connectionCount) return;
  return new Promise(resolve => {
    ws.on('close', () => {
      testEmitter.removeAllListeners();
      ws.removeAllListeners();
      connected = false;
      resolve();
    });

    ws.close();
  });
};

module.exports.started = async () => {
  if (connected) return true;
  await new Promise((resolve) => {
    setTimeout(async () => {
      if (connected) return resolve();
      await module.exports.started();
      return resolve();
    }, 100);
  });
  return true;
}

module.exports.start = async () => {
  connectionCount++;
  if (connected) return true;
  return new Promise((resolve) => {
    ws.on('open', function open() {
      send(ws, { type: 'init', id: process.env['TEST_ID'], tid });
    });

    ws.on('message', function incoming(data) {
      const msg = JSON.parse(data);
      if (msg.type === 'ready') {
        connected = true;
        resolve(true);
        return;
      }
      testEmitter.emit(eventName(msg), msg);
    });
  });
};

const execCommand = async (type, payload) => {
  const time = new Date().valueOf();
  const name = eventName({ payload, time });
  send(ws, {
    type,
    id: process.env['TEST_ID'],
    payload,
    time,
    tid
  });

  const result = await new Promise((resolve, reject) => {
    testEmitter.on(name, (data) => {
      if (data.type === 'done') {
        testEmitter.removeAllListeners(name);
        resolve(data.result);
      }

      if (data.type === 'error') {
        testEmitter.removeAllListeners(name);
        reject(new Error(`Error: ${data.result} in ${data.payload} browser: ${data.browser}`));
      }
    });
  });

  return result;
};

const exec = async (toExec, ...params) => {
  const values = params ? params.map(p => JSON.stringify(p)) : [];
  const code = typeof toExec === 'function'
    ? '(' + toExec.toString() + `)(${values.join(', ')})`
    : toExec;
  return execCommand('code', code);
};

const exists = async (selector) => {
  let result;
  do {
    result = await exec(function(selector) {
      return document.querySelectorAll(selector).length > 0;
    }, selector);
    if (!result) await wait(200);
  } while (!result);

  return true;
}

const doesnotexist = async (selector) => {
  let result;
  do {
    result = await exec(function(selector) {
      return !document.querySelectorAll(selector).length;
    }, selector);
    if (!result) await wait(200);
  } while (!result);

  return true;
}

const methodProxy = (id, method) => {
  return async (...args) => {
    const result = await execCommand('call', {
      id: id,
      call: method,
      args
    });
    return result;
  };
}

const elementProxy = {
  get(obj, prop) {
    if (obj['_node'].methods.includes(prop)) {
      return methodProxy(obj['_node'].id, prop);
    }
    return execCommand('get', {
      id: obj['_node'].id,
      attr: prop
    });
  }
};

const find = async (selector) => {
  let result;
  do {
    result = await execCommand('find', selector);
    if (!result || !result.length) await wait(200);
  } while (!result && !result.length);

  return result.map(node => new Proxy({ _node: node }, elementProxy));
}

const loadPage = async path => execCommand('goto', path);

module.exports.exec = exec;
module.exports.exists = exists;
module.exports.doesnotexist = doesnotexist;
module.exports.wait = wait;
module.exports.find = find;
module.exports.loadPage = loadPage;
