process.env.NODE_ENV = process.env.NODE_ENV || 'test';

var Server = require('../../server.js');
var Http = require('http');
var expect = require('chai').expect;
var hippie = require('hippie');
var request;

describe('phone api', function () {
	'use strict';

	var server, endpoint, schema;

	before(function (done) {
		new Server().then(function (app) {
			schema = app.get('schema');
			endpoint = 'http://localhost:' + app.get('port');
			request = function () {
				return hippie().json().base(endpoint);
			};
			server = Http.createServer(app).listen(app.get('port'), done);
		});
	});

	describe('wea/api/registration', function () {
		it('should register a android phone on the east', function (done) {
			request().post('/wea/api/registration/android')
				.send({
					token: '123',
					imei: 'xyz123',
					lng: '-79.9455396',
					lat: '40.4424815'
				})
				.expectStatusCode(500)
				.expectValue('message', 1)
				.end(function (err) {
					if (err) {
						done(err);
						return;
					}
					schema.Phone.find(1).then(function (phone) {
						expect(phone.location).to.equal('east');
						expect(phone.platform).to.equal('android');
						expect(phone.imei).to.equal('xyz123');
						expect(phone.token).to.equal('123');
						done();
					});
				});
		});
	});

	describe('wea/api/phone/{phoneId}/heartbeat', function () {
		var oraclePhone;

		before(function (done) {
			schema.Phone.create({
				token: '345',
				platform: 'android',
				lng: '-79.9455396',
				lat: '40.4424815',
				location: 'east'
			}).then(function (phone) {
				oraclePhone = phone;
				done();
			}).catch(done);
		});

		beforeEach(function (done) {
			schema.sequelize.query('DELETE FROM phoneInfos').then(function () {
				done();
			}).catch(done);
		});

		it('should send a heartbeat with additional info', function (done) {
			request().put('/wea/api/phone/' + oraclePhone.id + '/heartbeat')
				.send({
					'lat': '37.4104109',
					'lng': '-122.0597411',
					'batteryLevel': 0.75,
					'accuracy': '26.857',
					'packageVersion': 'v21',
					'additionalInfo': 'Activity: still Confidence :100'
				})
				.expectStatusCode(201)
				.end(function (err) {
					if (err) {
						done(err);
						return;
					}
					schema.Phone.findOne(oraclePhone.id).then(function (phone) {
						expect(phone.lat).to.equal('37.4104109');
						expect(phone.lng).to.equal('-122.0597411');
						expect(phone.location).to.equal('west');
						expect(phone.batteryLevel).to.equal('0.75');
						expect(phone.accuracy).to.equal('26.857');
						expect(phone.packageVersion).to.equal('v21');
					}).then(function () {
						return schema.PhoneInfo.findAll({where: {phoneId: oraclePhone.id}});
					}).then(function (infos) {
						expect(infos.length).to.equal(1);
						expect(infos[0].lat).to.equal('37.4104109');
						expect(infos[0].lng).to.equal('-122.0597411');
						expect(infos[0].batteryLevel).to.equal('0.75');
						expect(infos[0].accuracy).to.equal('26.857');
						expect(infos[0].packageVersion).to.equal('v21');
						expect(infos[0].additionalInfo).to.equal('"Activity: still Confidence :100"');
						done();
					}).catch(done);
				});
		});

		it('should send a heartbeat without additional info', function (done) {
			request().put('/wea/api/phone/' + oraclePhone.id + '/heartbeat')
				.send({
					'lat': '37.4104109',
					'lng': '-122.0597411',
					'batteryLevel': 0.68,
				})
				.expectStatusCode(201)
				.end(function (err) {
					if (err) {
						done(err);
						return;
					}
					schema.Phone.findOne(oraclePhone.id).then(function (phone) {
						expect(phone.lat).to.equal('37.4104109');
						expect(phone.lng).to.equal('-122.0597411');
						expect(phone.location).to.equal('west');
						expect(phone.batteryLevel).to.equal('0.68');
					}).then(function () {
						return schema.PhoneInfo.findAll({where: {phoneId: oraclePhone.id}});
					}).then(function (infos) {
						expect(infos.length).to.equal(1);
						expect(infos[0].lat).to.equal('37.4104109');
						expect(infos[0].lng).to.equal('-122.0597411');
						expect(infos[0].batteryLevel).to.equal('0.68');
						done();
					}).catch(done);
				});
		});
	});

	describe('wea/api/message/{messageId}/status/{phoneId}', function () {
		var oraclePhone, oracleMessage;

		before(function (done) {
			schema.Promise.all([
				schema.Phone.create({
					token: '567',
					platform: 'android',
					lng: '-79.9455396',
					lat: '40.4424815',
					location: 'east'
				}),
				schema.Message.create()
			]).spread(function (phone, message) {
				oraclePhone = phone;
				oracleMessage = message;
				done();
			}).catch(done);
		});

		it('should update the status', function (done) {
			request().post('/wea/api/message/' + oracleMessage.id + '/status/' + oraclePhone.id)
				.send({
					'status': 'received',
					'additionalInfo': 'scheduled the alert'
				})
				.expectStatusCode(201)
				.end(function (err) {
					if (err) {
						done(err);
						return;
					}
					schema.Phone.findOne(oraclePhone.id).then(function (phone) {
						expect(phone.status).to.equal('received');
					}).then(function () {
						return schema.MessageStatus.findAll({where: {phoneId: oraclePhone.id, messageId: oracleMessage.id}});
					}).then(function (status) {
						expect(status.length).to.equal(1);
						expect(status[0].status).to.equal('received');
						expect(status[0].additionalInfo).to.equal('scheduled the alert');
						done();
					}).catch(done);
				});
		});
	});

	after(function () {
		if (server && server.close) {
			server.close();
		}
	});
});
