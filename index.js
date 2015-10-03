var WebSocket = require('ws');
var request = require('request');
var isEmoji = require('is-emoji-keyword');

// api token requires admin privileges
var apiToken = process.env.SLACK_API_TOKEN;

var apiUrl = 'https://slack.com/api/';
var pingInterval = 15000;
var customEmoji = {};
var channels = {};

var onTrigger = /emoji on/i;
var offTrigger = /emoji off/i;

var logs = true; // toggle certain logs


// add these as needed
var slackEmoji = {
  ':simple_smile:': 'smiple_smile',
  ':moon:': 'moon',
  ':rube:': 'rube'
};


function connect () {
  // store custom emoji
  getEmoji(function (error, emoji) {
    if (error) {
      console.log(error);
    }

    customEmoji = emoji;

    request({
      method: 'GET',
      uri: apiUrl + 'rtm.start',
      qs: {
        token: apiToken
      },
      json: true
    }, sockets);
  });
}


function emojiTest (message) {
  if (!message) {
    return true;
  }

  var words = message.match(/(:\w+:)/);

  if (!words) {
    return false;
  }

  for (var i = 0, l = words.length; i < l; i++) {
    logs && console.log(words[i], isEmoji(words[i]), customEmoji[words[i]], slackEmoji[words[i]]);
    if (isEmoji(words[i]) ||
      customEmoji[words[i]] ||
      slackEmoji[words[i]]) {
      continue;
    } else {
      return false;
    }
  }

  return true;
}


function deleteMessage (channel, ts, callback) {
  if (!channel) {
    return callback('no channel');
  } else if (!ts) {
    return callback('no message');
  }

  request({
    method: 'POST',
    url: apiUrl + '/chat.delete',
    form: {
      token: apiToken,
      ts: ts,
      channel: channel
    },
    json: true
  }, function (error, response, body) {
    if (error) {
      return callback(error);
    } else if (!body.ok) {
      return callback(body.error);
    }

    callback();
  });
}

function getEmoji (callback) {
  request({
    method: 'POST',
    url: apiUrl + '/emoji.list',
    form: {
      token: apiToken
    },
    json: true
  }, function (error, response, body) {
    if (error) {
      return callback(error);
    } else if (!body.ok) {
      return callback(body.error);
    }

    callback(null, body.emoji);
  });
}

function sockets (e, r, b) {
  if (e) {
    throw e;
  }

  var url = b.url;
  var ws = new WebSocket(url);
  var id = 0;
  var ping;
  var pong;

  // connection established
  ws.on('open', function () {
    console.log('Connected.');
  });


  // message receiver
  ws.on('message', function (data, flags) {
    logs && console.log(data);
    data = JSON.parse(data);

    if (data.type === 'message') {

      if (channels[data.channel]) {
        if (offTrigger.test(data.text)) {
          channels[data.channel] = false;
        } else if (data.text && !emojiTest(data.text)) {
          deleteMessage(data.channel, data.ts, function (error) {
            if (error) {
              console.error(error);
            }
          });
        }

      } else if (!channels[data.channel] && onTrigger.test(data.text)) {
        channels[data.channel] = true;
      }
    }
  });


  ws.on('close', function () {
    console.log('Disconnected.');
  });

  // pong receiver
  ws.on('pong', function (data, flags) {
    logs && console.log(data);
    pong = JSON.parse(data).time;
  });

  // ping sender
  setInterval(function () {
    ping = Date.now();

    if (pong && ping - pong > 2 * pingInterval) {
      throw 'Pong out of date';
    }

    ws.send(JSON.stringify({
      id: id++,
      type: 'ping',
      time: ping
    }));
  }, pingInterval);
}

connect();
