const WebSocket = require('ws');
const uuidv1 = require('uuid/v1');
const EventEmitter = require('events');

class TestEmitter extends EventEmitter {}
const testEmitter = new TestEmitter();

const ws = new WebSocket('ws://localhost:8585/server');
const eventName = data => `msg_${data.code}_${data.time}`;

const send = (ws, msg) => ws.send(JSON.stringify(msg));

let connected = false;

module.exports.stop = async () => {
  if (!connected) return;
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

module.exports.start = async () => {
  if (connected) return true;
  return new Promise((resolve) => {
    ws.on('open', function open() {
      send(ws, { type: 'init', id: process.env['TEST_ID'] });
    });
     
    ws.on('message', function incoming(data) {
      console.log(data);
      const msg = JSON.parse(data);
      if (msg.type === 'ready') {
        connected = true;
        resolve(true);
        return;
      }
      console.log(eventName(msg));
      testEmitter.emit(eventName(msg), msg);
    });
  });
};

module.exports.exec = async (code) => {
  const time = new Date().valueOf();
  const name = eventName({ code, time });
  send(ws, { 
    type: 'code', 
    id: process.env['TEST_ID'],
    code,
    time
  });
  
  const result = await new Promise((resolve) => {
    console.log(name);
    testEmitter.on(name, (data) => {
      if (data.type === 'done') {
        testEmitter.removeAllListeners(name);
        resolve(data.result);
      }
    });
  });
  
  console.log(result);
  return result;
}