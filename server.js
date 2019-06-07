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
  //  process.stdout.write(data);
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

const send = (ws, msg) => ws.send(JSON.stringify(msg));

app.ws('/client', function(ws, req) {
  ws.on('message', function(msg) {
    console.log(msg);
    const message = JSON.parse(msg);
    if (message.type === 'init') {
      if (!message.id) message.id = uuidv1();
      route[message.id] = { ...route[message.id], client: ws };
      send(ws, { type: 'id', id: message.id });
      if (!route[message.id].server) {
        initServer(message.id);
      }
    } else if (route[message.id] && route[message.id].server) {
      send(route[message.id].server, message);
    }
  });
});

app.ws('/server', function(ws, req) {
  let conId;
  ws.on('message', function(msg) {
    const message = JSON.parse(msg);
    if (message.type === 'init') {
      conId = message.id;
      route[message.id] = { ...route[message.id], server: ws };
      send(ws, { type: 'ready' });
    } else if (route[message.id] && route[message.id].client) {
      send(route[message.id].client, message);
    }
  });

  ws.on('close', () => {
    route[conId].server = null;
  })
});

app.listen(8585);
