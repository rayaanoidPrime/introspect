import { message } from "antd";

export function setupWebsocketManager(
  url = `ws://${process.env.NEXT_PUBLIC_AGENTS_ENDPOINT}/editor`,
  onMessage = () => {}
) {
  let socket = null;
  let log = true;
  let timeout = null;
  let lastPingTime = Date.now();
  // -1 so it goes to 0 on 1st connect
  let reconnectCount = -1;
  // cache when creating for reconnects
  let _onMessage = onMessage;
  let eventListeners = [];

  function connect() {
    return reconnect();
  }

  function isConnected() {
    return socket && socket.readyState === WebSocket.OPEN;
  }

  function reconnect() {
    reconnectCount++;
    return new Promise((resolve, reject = () => {}) => {
      clearTimeout(timeout);

      if (socket && socket.close) {
        socket.close();
      }

      socket = new WebSocket(url);

      socket.onopen = function (e) {
        if (log) {
          // console.log(e);
          console.log(new Date().toLocaleString(), "reconnected to", url);
        }

        clearTimeout(timeout);
        resolve();
      };

      socket.onerror = function (e) {
        if (log) {
          console.log(new Date().toLocaleString(), url, e);
        }
        // reject("Can't connect to", url);
      };
      socket.onmessage = _onMessage;

      // add all other event listeners
      eventListeners.forEach((l) => {
        let event = l[0];
        let cb = l[1];
        socket.addEventListener(event, cb);
      });

      socket.onclose = function (e) {
        if (log) {
          console.log(new Date().toLocaleString(), url, e);
          // console.log("closed", url);
          // console.log("reconnecting to", url);
        }
        // connect in 1 second

        timeout = setTimeout(() => {
          reconnect();
        }, 1000);
      };
    });
  }

  function send(data, isPing = false) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      if (reconnectCount >= 1 && !isPing) {
        // means we've reconnected once
        message.warning(
          "Connection was previously lost and there might be connectivity issues while running this. Please refresh the page for best performance."
        );
      }
      socket.send(JSON.stringify(data));
    }
  }

  function logging(on = false) {
    log = on;
  }

  function addEventListener(event, cb) {
    if (socket) {
      socket.addEventListener(event, cb);
      // push returns new length of the array so last
      // element has index return_val - 1
      return eventListeners.push([event, cb]) - 1;
    }
    return -1;
  }

  function pinger() {
    const delta = Date.now() - lastPingTime;
    // keep pinging every 5 seconds if websocket is connected
    if (delta > 5000) {
      lastPingTime = Date.now();
      send({ ping: "ping" }, true);
    }
    window.requestAnimationFrame(pinger);
  }

  function removeEventListener(event, cb, listenerIdx) {
    if (socket) {
      socket.removeEventListener(event, cb);
      // remove from eventListeners array
      if (listenerIdx !== -1) eventListeners.splice(listenerIdx, 1);
    }
  }

  function getSocket() {
    return socket;
  }

  function clearSocketTimeout() {
    clearTimeout(timeout);
  }

  window.requestAnimationFrame(pinger);

  return connect()
    .then(() => {
      return {
        send,
        reconnect,
        addEventListener,
        removeEventListener,
        isConnected,
        logging,
        clearSocketTimeout,
        getSocket,
      };
    })
    .catch((e) => {});
}
