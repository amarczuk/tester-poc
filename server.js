const path = require('path');
const { spawn } = require('child_process');
const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);
const uuidv1 = require('uuid/v1');

app.use(express.static(path.join(__dirname, '/public')));

app.get('/', function(req, res, next){
  console.log('get route', req.testing);
  res.end();
});

const route = {};

const initServer = (id) => {
  const ls = spawn('npm', ['run', 'test'], { env: { ...process.env, TEST_ID: id }, shell: true });

  ls.stdout.on('data', (data) => {
   process.stdout.write(data);
  });

  ls.stderr.on('data', (data) => {
    process.stdout.write(data);
  });

  ls.on('close', (code) => {
    console.log(`tests finished with code ${code}`);
    if (route[id].server && route[id].server.terminate) {
      route[id].server.terminate();
    }
  });
};

const wait = async time => new Promise(resolve => setTimeout(resolve, time));
const send = (ws, msg) => ws.send(JSON.stringify(msg));

const safeSend = async (id, tid, msg) => {
  const ws = route[id] ? route[id].client : null;
  const sws = route[id] ? route[id].server[tid] : null;
  if (!ws || !sws) {
    return setTimeout(() => safeSend(id, tid, msg), 200);
  }
  try {
    await wait(50);
    send(ws, msg);
  } catch(e) {
    setTimeout(() => safeSend(id, tid, msg), 200);
  }
};

app.ws('/client', function(ws, req) {
  let conId;
  ws.on('message', function(msg) {
    console.log(`--> ${msg}`);
    const message = JSON.parse(msg);
    if (message.type === 'init') {
      conId = message.id || uuidv1();
      route[conId] = { ...route[conId], client: ws };
      send(ws, { type: 'id', id: conId });
      if (!route[conId].server) {
        initServer(conId);
      }
    } else if (route[conId] && route[conId].server) {
      send(route[conId].server[message.tid], message);
    }
  });

  ws.on('close', () => {
    route[conId].client = null;
  });
});

app.ws('/server', function(ws) {
  let conId;
  let testId;
  ws.on('message', function(msg) {
    console.log(`<-- ${msg}`);
    const message = JSON.parse(msg);
    if (message.type === 'init') {
      conId = message.id;
      testId = message.tid;
      if (!route[conId]) return;
      route[conId] = {
        ...route[conId],
        server: {
          ...route[conId].server,
          [testId]: ws
        }
      };
      send(ws, { type: 'ready' });
    } else if (route[conId]) {
      safeSend(conId, testId, message);
    }
  });

  ws.on('close', () => {
    const { [testId]: removed, ...rest } = route[conId].server;
    if (Object.values(rest).length) {
      route[conId].server = { ...rest };
    } else {
      route[conId].server = null;
    };
  });
});

app.listen(8585);
