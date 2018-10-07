process.env.NODE_ENV = process.env.NODE_ENV || 'test';

var fs = require('fs');
var Server = require('../../server.js');
var Http = require('http');
var expect = require('chai').expect;
var hippie = require('hippie');
var request;

describe('trial event api', function () {
	'use strict';

	var server, endpoint, schema;

	before(function (done) {
		new Server().then(function (app) {
			schema = app.get('schema');
			endpoint = 'http://localhost:' + app.get('port');
			request = function () {
				return hippie().json().base(endpoint);
			};

			var phones = [
				{token: '023', platform: 'ios', location: 'west'},
				{token: '034', platform: 'ios', location: 'west'},
				{token: '045', platform: 'ios', location: 'east'},
				{token: '123', platform: 'ios', location: 'west'},
				{token: '234', platform: 'ios', location: 'west'},
				{token: '345', platform: 'ios', location: 'east'},
				{token: '456', platform: 'ios', location: 'west'},
				{token: '678', platform: 'ios', location: 'west'}
			];

			server = Http.createServer(app).listen(app.get('port'), function () {
				schema.Phone.bulkCreate(phones).then(function (result) {
					done();
				}).catch(done);
			});
		});
	});

	describe('wea/api/trialevent', function () {
		it('should return an empty array', function (done) {
			request().get('/wea/api/trialevent')
				.expectStatusCode(200)
				.expectBody([])
				.end(done);
		});
		it('create a new message', function (done) {
			var body = JSON.parse(fs.readFileSync('./tests/integration/trialevent.json', 'utf8'));

			request().post('/wea/api/trialevent')
				.send(body)
				.expectStatusCode(201)
				.expectValue('id', 1)
				.expectValue('messages[0].id', 1)
				.expectValue('messages[1].id', 2)
				.expectValue('messages[0].incidents.length', 1)
				.expectValue('messages[1].incidents.length', 1)
				.expectValue('messages[0].incidents[0]', 1)
				.expectValue('messages[1].incidents[0]', 2)
				.expectValue('messages[1].info[0].areas.length', 1)
				.expectValue('messages[1].info[0].areas[0].polygon.length', 2)
				.end(done);
		});
	});

	describe.skip('edit an existing message', function () {
		var groupA, groupB;
		before(function (done) {
			schema.Message.findAll(sequelizeQuery()).then(function (messages) {
				groupA = messages[0].info[0].audience.map(function (p) {
					return p.id;
				});
				groupB = messages[1].info[0].audience.map(function (p) {
					return p.id;
				});
				done();
			}).catch(done);
		});

		it('should update its fields', function (done) {
			var body = JSON.parse(fs.readFileSync('./tests/integration/trialevent.json', 'utf8'));
			body.id = 1;
			body.messages[0].id = 1;
			body.messages[1].id = 2;

			body.messages[0].info[0].urgency = 'Immediate';
			body.messages[1].info[0].areas[0].polygon.push({
				"lat": 30.382105298316304,
				"lng": -120.03679121110828
			});

			request().put('/wea/api/trialevent/1')
				.send(body)
				.expectStatusCode(200)
				.expectValue('id', 1)
				.expectValue('messages[0].id', 1)
				.expectValue('messages[1].id', 2)
				.expectValue('messages[0].incidents.length', 1)
				.expectValue('messages[1].incidents.length', 1)
				.expectValue('messages[0].incidents[0]', 1)
				.expectValue('messages[1].incidents[0]', 2)
				.expectValue('messages[0].info[0].urgency', 'Immediate')
				.expectValue('messages[1].info[0].areas.length', 1)
				.expectValue('messages[1].info[0].areas[0].polygon.length', 3)
				.end(function (error) {
					if (error) {
						done(error);
					}
					schema.TrialEvent.getAll().then(function (trialEvents) {
						expect(trialEvents.length).to.be.equal(1);
						expect(trialEvents[0].messages.length).to.be.equal(2);
						done();
					}).catch(done);
				})
		});

		it('should update scheduling', function (done) {
			var body = JSON.parse(fs.readFileSync('./tests/integration/trialevent.json', 'utf8'));
			body.id = 1;
			body.messages[0].id = 1;
			body.messages[1].id = 2;
			var start = new Date();
			start.setFullYear(start.getFullYear() + 1);
			var end = new Date();
			end.setFullYear(start.getFullYear() + 2);
			body.messages[0].info[0].onset = start.toISOString();
			body.messages[0].info[0].expires = end.toISOString();

			var expectJobs = function (expectedLength, callback) {
				request().get('/wea/api/trialevent/jobs')
					.expectStatusCode(200)
					.expect(function (res, body, next) {
						expect(body).to.have.length(expectedLength);
						next();
					})
					.end(callback);
			};

			expectJobs(0, function () {
				request().put('/wea/api/trialevent/1')
					.send(body)
					.expectStatusCode(200)
					.end(function () {
						expectJobs(1, done)
					});
			});
		});

		it('should use same partition', function (done) {
			schema.Message.findAll(sequelizeQuery()).then(function (messages) {
				expect(groupA).to.deep.equal(getAudience(messages[0]));
				expect(groupB).to.deep.equal(getAudience(messages[1]));
				done();
			}).catch(done);
		});
	});

	describe('create a message with incident', function () {
		var incidentId;
		before(function (done) {
			schema.Message.create().then(function (result) {
				incidentId = result.id;
				done();
			}).catch(done);
		});

		it('create a new message', function (done) {
			var body = JSON.parse(fs.readFileSync('./tests/integration/trialevent.json', 'utf8'));
			body.messages[0].incidents = [incidentId];
			body.messages[1].incidents = [incidentId];
			request().post('/wea/api/trialevent')
				.send(body)
				.expectStatusCode(201)
				.expectValue('messages[0].incidents.length', 1)
				.expectValue('messages[1].incidents.length', 1)
				.expectValue('messages[0].incidents[0]', incidentId)
				.expectValue('messages[1].incidents[0]', incidentId)
				.end(done);
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
							attributes: ['id']
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
