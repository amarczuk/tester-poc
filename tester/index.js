const WebSocket = require('ws');
const uuidv1 = require('uuid/v1');
const EventEmitter = require('events');
// const commands = require('./commands');

class TestEmitter extends EventEmitter {}
const testEmitter = new TestEmitter();

const ws = new WebSocket('ws://localhost:8585/server');
const eventName = data => `msg_${data.code}_${data.time}`;

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

const exec = async (toExec, params = null) => {
  const values = params ? params.map(p => JSON.stringify(p)) : [];
  const code = typeof toExec === 'function'
    ? '(' + toExec.toString() + `)(${values.join(', ')})`
    : toExec;
  const time = new Date().valueOf();
  const name = eventName({ code, time });
  send(ws, {
    type: 'code',
    id: process.env['TEST_ID'],
    code,
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
        reject(new Error(`Error: ${data.result} in ${data.code} browser: ${data.browser}`));
      }
    });
  });

  return result;
}

const exists = async (selector) => {
  let result;
  do {
    result = await exec(function(selector) {
      return document.querySelectorAll(selector).length > 0;
    }, [selector]);
  } while (!result);

  return true;
}

module.exports.exec = exec;
module.exports.exists = exists;
// module.export.cmd = commands(exec);
