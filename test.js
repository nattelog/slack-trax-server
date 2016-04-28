var GoogleSpreadsheet = require('google-spreadsheet');
var async = require('async');
var config = require('./config');
var creds = require('./credentials.json');
var api = require('nodeunit-httpclient').create({
  port: 3000
});


var doc = new GoogleSpreadsheet(config.spreadsheet.token);
var sheet;
var user = 'Default';


function createSlackRequest(text) {
  return {
    token: config.slack.token,
    user_name: user,
    command: config.slack.command,
    text: text
  };
}


exports.setupDoc = function(test) {
  async.series([
    function authenticate(step) {
      doc.useServiceAccountAuth(creds, step);      
    },

    function getSheet(step) {
      doc.getInfo(function(err, info) {
	sheet = info.worksheets[0];
	sheet.setTitle(user, step);
      });
    },

    function clearSheet(step) {
      sheet.clear(step);
    },

    function resizeSheet(step) {
      sheet.resize({
	rowCount: 10,
	colCount: 5
      }, step);
    },

    function setHeaders(step) {
      sheet.setHeaderRow([
	'Date',
	'Start',
	'End',
	'Total',
	'Description'
      ], step);
    },

    function finish(step) {
      test.done();
    }
  ]);
};


exports.testBadRequest = function(test) {
  api.post(test, '/track', {
    data: {
      token: 'bad_token'
    }
  }, {
    status: 500
  }, function(res) {
    test.equal(res.data.message, 'Bad access token', 'Error message should be this');
    test.done();
  });
};


exports.testBadCommand = function(test) {
  api.post(test, '/track', {
    data: {
      token: config.slack.token,
      command: 'bad_command'
    }
  }, {
    status: 500
  }, function(res) {
    test.equal(res.data.message, 'Bad command', 'Error message should be this');
    test.done();
  });
};


exports.testTester = function(test) {
  api.post(test, '/track', {
    data: createSlackRequest('test')
  }, {
    status: 200
  }, function(res) {
    test.equal(res.data.text, 'Well, thank you for that.', 'Response message should be this');
    test.done();
  });
};


exports.testSSLCheck = function(test) {
  api.get(test, '/track?ssl_check=1', {
    status: 200
  }, function(res) {
    test.equal(res.data.message, 'Got it!', 'Response message should be this');
    test.done();
  });
};


exports.testManualTrack = function(test) {
  api.post(test, '/track', {
    data: createSlackRequest('6 to 8 with Working with stuff')
  }, {
    status: 200
  }, function(res) {
    sheet.getRows(function(err, rows) {
      test.ifError(err);
      test.equal(rows.length, 1, 'There should be one added row');
      test.done();
    });
  });
};
