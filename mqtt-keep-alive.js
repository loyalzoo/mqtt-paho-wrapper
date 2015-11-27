var Loyalzoo;

if (Loyalzoo === undefined) {
  Loyalzoo = {};
}

Loyalzoo.MQTTKeepAlive = function (brokerAddress, brokerPort, clientId, customConnectionParams) {

  var scope = this;

  Loyalzoo.MQTTKeepAlive.prototype._init = function () {
    if (customConnectionParams === undefined) {customConnectionParams={}};
    if (clientId === undefined) {clientId = scope.generateClientId(); }
    scope._customConnectionParams = customConnectionParams;
    scope._clientId = clientId;
    scope._pingTopic = '/ping/' + scope._clientId;
    scope._brokerAddress = brokerAddress;
    scope._brokerPort = brokerPort;
    scope._pinger = null;
    scope._reconnectTimer = null;
    scope._disconnectAttempts = 0;
    scope._clientDestroys = 0;
    
    // 3 seconds (how long between reconnect attempts when disconnected)
    scope._reconnectInterval = 3000;
    // 10 seconds (how long between pings)
    scope._pingInterval = 10000;
    // 60 seconds (how long we should go without successful pings)
    scope._pingMax = 60000;
    // How many times we should try to reconnect before trying something else
    scope._maxDisconnectAttempts = 3;
    // How many times we will destry and replace the client before trying something else
    scope._maxClientDestroys = 3;

    scope._initMQTTClient();
  };

  Loyalzoo.MQTTKeepAlive.prototype._initMQTTClient = function () {
    console.log('log: _initMQTTClient');
    scope._client = new Paho.MQTT.Client(scope._brokerAddress, scope._brokerPort, scope._clientId);
    scope._client.onMessageArrived = scope._onMessage;
    scope._client.onConnectionLost = scope._onConnectionLost;
  };


  Loyalzoo.MQTTKeepAlive.prototype._destroyClient = function() {
    console.log('log: _destroyClient');
    scope._client.disconnect();
    delete scope._client;
    scope._clientDestroys += 1;
  };

  Loyalzoo.MQTTKeepAlive.prototype.generateClientId = function () {
    console.log('log: generateClientId');
    var generatedId = '';
    var i;
    // Concatinate 4 base 16 numbers
    for (i = 3; i >= 0; i--) {
      // Generate a random number multiply it by 10^16 then convert it to base 16
      generatedId += (Math.random() * 10E16).toString(16);
    }

    return generatedId;
  };

  Loyalzoo.MQTTKeepAlive.prototype.connect = function () {
    console.log('log: connect');
    params = scope._customConnectionParams;
    params['onSuccess'] = scope._onConnect;
    scope._client.connect(params);
  };

  Loyalzoo.MQTTKeepAlive.prototype._onConnect = function () {
    console.log('log: _onConnect');
    scope._client.subscribe(scope._pingTopic);
    scope._startPinger();
    scope._stopReconnectTimer();
    if (scope.onConnect !== undefined) {
      scope.onConnect();
    }
  };

  Loyalzoo.MQTTKeepAlive.prototype._onConnectionLost = function () {
    console.log('log: _onConnectionLost');
    if (scope._pinger !== null) {
      scope._stopPinger();
    }
    scope._startReconnectTimer();
  };

  Loyalzoo.MQTTKeepAlive.prototype._fixConnection = function () {
    console.log('log: _fixConnection');
    if (scope._disconnectAttempts < scope._maxDisconnectAttempts) {
      scope._client.disconnect();
      scope._disconnectAttempts += 1;
    } else if (scope._clientDestroys < scope._maxClientDestroys) {
      scope._destroyClient();
      scope._initMQTTClient();
    } else {
      if (scope.onFailedToEstablishConnection !== undefined) {
        scope.onFailedToEstablishConnection();
      }
    }
  };

  Loyalzoo.MQTTKeepAlive.prototype._startReconnectTimer = function () {
    console.log('log: _startReconnectTimer');
    scope._reconnectTimer = setInterval(
      function () {
        scope.connect();
      },
      scope._reconnectInterval
    );
  };

  Loyalzoo.MQTTKeepAlive.prototype._stopReconnectTimer = function () {
    console.log('log: _stopReconnectTimer');
    clearInterval(scope._reconnectTimer);
    scope._reconnectTimer = null;
  };

  Loyalzoo.MQTTKeepAlive.prototype._startPinger = function () {
    console.log('log: _startPinger');
    scope._pinger = setInterval(
      function () {
        var currentTime = new Date();
        if (currentTime - scope._lastPing < scope._pingMax) {
          var msg = new Paho.MQTT.Message('');
          msg.destinationName = scope._pingTopic;
          scope._client.send(msg);
        } else {
          scope._fixConnection();
        }
      },
      scope._pingInterval
    );
    scope._lastPing = new Date();
  };

  Loyalzoo.MQTTKeepAlive.prototype._stopPinger = function () {
    console.log('log: _stopPinger');
    clearInterval(scope._pinger);
    scope._pinger = null;
  };

  Loyalzoo.MQTTKeepAlive.prototype._onMessage = function (msg) {
    console.log('log: _onMessage');
    if (msg.destinationName === scope._pingTopic) {
      // We have connection working again so reset whatever attempts we have made
      scope._disconnectAttempts = 0;
      scope._clientDestroys = 0;
      scope._lastPing = new Date();
    } else if (scope.onMessage !== undefined) {
      scope.onMessage(msg);
    }
  };

  scope._init();
};
