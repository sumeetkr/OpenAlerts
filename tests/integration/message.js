process.env.NODE_ENV = process.env.NODE_ENV || 'test';

var fs = require('fs');
var Server = require('../../server.js');
var Http = require('http');
var expect = require('chai').expect;
var hippie = require('hippie');
var request;

describe('message api', function () {
	'use strict';

	var server, endpoint, schema;

	before(function (done) {
		new Server().then(function (app) {
			schema = app.get('schema');
			endpoint = 'http://localhost:' + app.get('port');
			request = function () {
				return hippie().json().base(endpoint);
			};

			server = Http.createServer(app).listen(app.get('port'), function () {
				var body = JSON.parse(fs.readFileSync('./tests/integration/trialevent.json', 'utf8'));
				schema.Phone.bulkCreate([
					{token: '123', platform: 'ios', location: 'west'},
					{token: '234', platform: 'ios', location: 'west'},
					{token: '345', platform: 'ios', location: 'east'}
				]).then(function (result) {
					body.messages[0].parameter.campus = 'sv';
					body.messages[1].parameter.campus = 'sv';
					return schema.TrialEvent.createEvent(body);
				}).then(function (result) {
					body.messages[0].parameter.campus = 'pa';
					body.messages[1].parameter.campus = 'pa';
					return schema.TrialEvent.createEvent(body);
				}).then(function (result) {
					body.messages[0].parameter.campus = 'sv';
					body.messages[1].parameter.campus = 'sv';
					body.messages[0].parameter.scenarioId = 1;
					body.messages[1].parameter.scenarioId = 1;
					return schema.TrialEvent.createEvent(body);
				}).then(function (result) {
					done();
				}).catch(done);
			});
		});
	});

	describe('wea/api/message', function () {
		it('should return an array with six elements', function (done) {
			request().get('/wea/api/message')
				.expectStatusCode(200)
				.expect(function (res, body, next) {
					expect(body.length).to.equal(6);
					next();
				})
				.end(done);
		});
	});

	describe('wea/api/message/all/{phoneId}', function () {
		it('should return an array with two elements', function (done) {
			request().get('/wea/api/message/all/1')
				.expectStatusCode(200)
				.expect(function (res, body, next) {
					expect(body.length).to.equal(2);
					next();
				})
				.end(done);
		});

		it('should return an array with two elements with the same partition', function (done) {
			request().get('/wea/api/message/all/2')
				.expectStatusCode(200)
				.expect(function (res, body, next) {
					expect(body.length).to.equal(2);
					expect(body[0].info[0].eventDescription).to.equal(body[1].info[0].eventDescription);
					next();
				})
				.end(done);
		});

		it('should return an array with one element', function (done) {
			request().get('/wea/api/message/all/3')
				.expectStatusCode(200)
				.expect(function (res, body, next) {
					expect(body.length).to.equal(1);
					next();
				})
				.end(done);
		});
	});

	after(function () {
		if (server.close) {
			server.close();
		}
	});
});
