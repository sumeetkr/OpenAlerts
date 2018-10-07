
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

var Server = require('../../server.js');
var Http = require('http');
var expect = require('chai').expect;
var hippie = require('hippie');
var request;

describe('admin feedback api', function () {
	'use strict';

	var server, endpoint, db;

	before(function (done) {
		new Server().then(function (app) {
			db = app.get('db');
			endpoint = 'http://localhost:' + app.get('port');
			request = function() {
				return hippie().json().base(endpoint);
			};

			server = Http.createServer(app).listen(app.get('port'), done);
		});
	});

	describe('wea/api/forms', function () {
		it('should return an empty array', function (done) {
			request().get('/wea/api/forms').expectStatus(200).end(done);
		});
	});

	after(function () {
		if (server && server.close) {
			server.close();
		}
	});
});
