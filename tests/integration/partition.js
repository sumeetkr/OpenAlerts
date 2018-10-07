process.env.NODE_ENV = process.env.NODE_ENV || 'test';

var fs = require('fs');
var Server = require('../../server.js');
var Http = require('http');
var expect = require('chai').expect;
var hippie = require('hippie');
var request;

describe('partitioning algorithm', function () {
	'use strict';

	var server, endpoint, db, schema, body, phones;

	before(function (done) {
		new Server().then(function (app) {
			schema = app.get('schema');
			body = JSON.parse(fs.readFileSync('./tests/integration/trialevent.json', 'utf8'));
			endpoint = 'http://localhost:' + app.get('port');
			request = function () {
				return hippie().json().base(endpoint);
			};

			phones = [
				{token: '123', platform: 'ios', location: 'west'},
				{token: '234', platform: 'ios', location: 'west'},
				{token: '345', platform: 'ios', location: 'east'},
				{token: '456', platform: 'ios', location: 'west'},
				{token: '678', platform: 'ios', location: 'west'}
			];

			server = Http.createServer(app).listen(app.get('port'), function () {
				schema.Phone.bulkCreate(phones).then(function (result) {
					body.messages[0].parameter.campus = 'sv';
					body.messages[1].parameter.campus = 'sv';
					return schema.TrialEvent.createEvent(body);
				}).then(function (result) {
					done();
				}).catch(done);
			});
		});
	});

	describe('generate partition', function () {
		it('should cover all phones in the campus', function (done) {
			schema.Message.findAll(sequelizeQuery()).then(function (messages) {
				var groupA = messages[0].info[0].audience;
				var groupB = messages[1].info[0].audience;
				expect(groupA.length + groupB.length).to.equal(4);
				done();
			});
		});
	});

	describe('reuse partition', function () {
		before(function (done) {
			body.messages[0].parameter.campus = 'sv';
			body.messages[1].parameter.campus = 'sv';
			schema.TrialEvent.createEvent(body).then(function (res) {
				done();
			});
		});

		it('should use the same as distribution scenarioId', function (done) {
			schema.Message.findAll(sequelizeQuery()).then(function (messages) {
				var groupA = [getAudience(messages[0]), getAudience(messages[2])];
				var groupB = [getAudience(messages[1]), getAudience(messages[3])];
				expect(groupA[0]).to.deep.equal(groupA[1]);
				expect(groupB[0]).to.deep.equal(groupB[1]);
				done();
			}).catch(done);
		});
	});

	after(function () {
		if (server && server.close) {
			server.close();
		}
	});

	function getAudience(message) {
		return message.info[0].audience.map(function (phone) {
			return phone.id
		}).sort();
	}

	function sequelizeQuery(where) {
		return {
			where: where ? where.message : {},
			attributes: ['id', 'messageType', 'scope', 'status'],
			include: [
				{
					model: schema.MessageInfo, as: 'info',
					attributes: ['certainty', 'contact', 'eventCategory', 'eventType', 'headline',
						'eventDescription', 'expires', 'onset', 'instruction',
						'responseType', 'urgency', 'severity'],
					where: where ? where.info : {},
					include: [
						{
							model: schema.Phone,
							as: 'audience',
							attributes: ['id'],
							where: where ? where.audience : {}
						},
						{
							model: schema.Area, attributes: ['id'],
							include: [
								{model: schema.Polygon, as: 'polygon', attributes: ['lat', 'lng']}]
						}
					]
				},
				{
					model: schema.MessageParameter, as: 'parameter',
					where: where ? where.parameter : {},
					attributes: ['isMapToBeShown', 'isAlertActive', 'isPhoneExpectedToVibrate',
						'isTextToSpeechExpected', 'geoFiltering', 'historyBasedFiltering',
						'motionPredictionBasedFiltering', 'campus', 'feedbackForm', 'scenarioId',
						'isContextAware']
				},
				{
					model: schema.Message, as: 'incidents', attributes: ['id']
				}
			]
		};
	}
});
