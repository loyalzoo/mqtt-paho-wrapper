var Loyalzoo;

if (Loyalzoo === undefined) {
  Loyalzoo = {};
}

Loyalzoo.MQTTKeepAlive = function (brokerAddress, brokerPort, clientId) {

  var scope = this;

  Loyalzoo.MQTTKeepAlive.prototype._init = function () {
    if (clientId === undefined) {clientId = scope.generateClientId(); }
    scope._brokerAddress = brokerAddress;
    scope._brokerPort = brokerPort;
    scope._clientId = clientId;

    scope._initMQTTClient();
  };

  Loyalzoo.MQTTKeepAlive.prototype._initMQTTClient = function () {
    scope._client = new Paho.MQTT.Client(scope._brokerAddress, scope._brokerPort, scope._clientId);
  };

  Loyalzoo.MQTTKeepAlive.prototype.generateClientId = function () {
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
    scope._client.connect({onSuccess: scope._onConnect});
  };

  Loyalzoo.MQTTKeepAlive.prototype._onConnect = function () {
    if (scope.onConnect !== undefined) {
      scope.onConnect();
    };
  };

  scope._init();
};
