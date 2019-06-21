(function() {
  if (!console || !console.log) {
    console = console || {};
    console.log = function() {};
  }
  
  const ws = new WebSocket('ws://' + window.location.host + '/client');
  let id = sessionStorage.testId;
  const objectCache = {};
  let cacheCount = 0;

  ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log(data);

    if (data.type === 'id') {
      id = data.id;
      sessionStorage.testId = id;
      return;
    }

    ws.send(JSON.stringify({
      type: 'started',
      id: id,
      payload: data.payload,
      time: data.time,
      tid: data.tid
    }));

    let result = null;

    try {
      if (data.type === 'code') {
        result = Function('"use strict";return ' + data.payload + '')();
        ws.send(JSON.stringify({
          type: 'done',
          id: id,
          payload: data.payload,
          time: data.time,
          tid: data.tid,
          result: result }));
      } else if (data.type === 'find') {
        nodes = document.querySelectorAll(data.payload);
        result = [];
        for (let node in nodes) {
          const res = nodes[node];
          cacheCount++;
          const oid = new Date().valueOf() + '_' + cacheCount;
          const nodeMethods = [];
          for (let name in res) {
            if (typeof res[name] === 'function') {
              nodeMethods.push(name);
            }
          }
          objectCache[oid] = {
            id: oid,
            node: res,
            methods: nodeMethods
          };
          result.push({ id: oid, methods: nodeMethods });
        };
      } else if (data.type === 'get') {
        const conf = data.payload;
        const node = objectCache[conf.id].node;
        result = node[conf.attr];
      } else if (data.type === 'call') {
        const conf = data.payload;
        const node = objectCache[conf.id].node;
        result = node[conf.call].apply(node, conf.args);
      } else if (data.type === 'goto') {
        setTimeout(function() {
          document.location.pathname = data.payload;
        }, 0);
      }

      ws.send(JSON.stringify({
        type: 'done',
        id: id,
        payload: data.payload,
        time: data.time,
        tid: data.tid,
        result: result
      }));
    } catch (e) {
      ws.send(JSON.stringify({
        type: 'error',
        id: id,
        payload: data.payload,
        time: data.time,
        tid: data.tid,
        result: e.message,
        browser: window.navigator.userAgent
      }));
      console.error(e);
    };
  };

  ws.onopen = function() {
    ws.send(JSON.stringify({type: 'init', id: id}));
  };

})();
