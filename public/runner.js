(function() {
  if (!console || !console.log) {
    console = console || {};
    console.log = function() {};
  }
  
  const sendConsole = function(type, args) {
    try {
      ws.send(JSON.stringify({
        type: 'console.' + type,
        id: id,
        payload: Array.prototype.slice.call(args)
      }));
    } catch(e) {
      // ignore
    }
  }
  
  const oldConsole = console;
  // console.log = function() {
  //   oldConsole.log.apply(this, arguments);
  //   sendConsole('log', arguments);
  // };
  // console.error = function() {
  //   oldConsole.error.apply(this, arguments);
  //   sendConsole('error', arguments);
  // };
  // console.info = function() {
  //   oldConsole.info.apply(this, arguments);
  //   sendConsole('info', arguments);
  // };
  // console.debug = function() {
  //   oldConsole.debug.apply(this, arguments);
  //   sendConsole('debug', arguments);
  // };
  // console.warn = function() {
  //   oldConsole.warn.apply(this, arguments);
  //   sendConsole('warn', arguments);
  // };
  
  const ws = new WebSocket('ws://' + window.location.host + '/client');
  let id = sessionStorage.testId;
  const objectCache = {};
  let cacheCount = 0;

  ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    oldConsole.log(data);

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
      oldConsole.error(e);
    };
  };

  ws.onopen = function() {
    ws.send(JSON.stringify({type: 'init', id: id}));
  };

})();
