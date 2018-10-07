var utils = require('../utils');

function PhoneController(db, sns) {
	function getLocation(lng) {
		return lng > -98 ? 'east' : 'west';
	}

	/**
	 * Returns all phones.
	 */
	this.getAll = function getAll(req, res, next) {
		res.promise(200, db.Phone.getAll());
	};

	/**
	 * Updates the location and other data of the phone. Returns the current config
	 * with a list of upcoming messages for the phone.
	 */
	this.heartbeat = function heartbeat(req, res, next) {
		if (utils.mandatoryPayloadKeys(req, res, ['lng', 'lat'])) {
			return;
		}

		db.Phone.getById(req.params.phoneId).then(function (phone) {
			phone.setDataValue('lng', req.body.lng);
			phone.setDataValue('lat', req.body.lat);
			phone.setDataValue('location', getLocation(req.body.lng));

			if (req.body.batteryLevel) {
				phone.setDataValue('batteryLevel', req.body.batteryLevel);
			}

			if (req.body.accuracy) {
				phone.setDataValue('accuracy', req.body.accuracy);
			}

			if (req.body.packageVersion) {
				phone.setDataValue('packageVersion', req.body.packageVersion);
			}

			var heartbeat = {
				phoneId: phone.id,
				lng: req.body.lng,
				lat: req.body.lat,
				batteryLevel: req.body.batteryLevel,
				accuracy: req.body.accuracy,
				packageVersion: req.body.packageVersion,
				additionalInfo: JSON.stringify(req.body.additionalInfo),
				rawJson: JSON.stringify(req.body)
			};

			var promise = phone.save().then(db.PhoneInfo.create(heartbeat));

			if (req.query.timestamp) {
				res.promise(201, promise.then(function () {
					return db.Message.getAllByPhone(req.params.phoneId, req.query.timestamp);
				}).map(function (message) {
					message.info[0].setDataValue('audience', undefined);
					return message;
				}));
			} else {
				promise.then(function () {
					res.status(201).end();
				});
			}
		}).catch(function (error) {
			next(error);
		});
	};

	/**
	 * Registers a new phone on the server. Requires the parameter platform ('ios' or 'android')
	 * and a unique token in the payload. On success it returns the id of the phone.
	 */
	this.register = function register(req, res, next) {
		if (utils.mandatoryPayloadKeys(req, res, ['token', 'lat', 'lng'])) {
			return;
		}

		var platformARN;

		if (req.params.platform == 'ios') {
			platformARN = process.env.AWS_IOS_PLATFORM_ARN;
		} else if (req.params.platform == 'android') {
			platformARN = process.env.AWS_ANDROID_PLATFORM_ARN;
		} else {
			utils.sendError(res, 400, 'Bad request.', 'Invalid platform: ' + req.params.platform);
			return;
		}

		var where = {platform: req.params.platform};
		var values = {
			platform: req.params.platform,
			token: req.body.token,
			lat: req.body.lat,
			lng: req.body.lng,
			location: getLocation(req.body.lng)
		};

		if (req.body.imei) {
			where.imei = req.body.imei;
			values.imei = req.body.imei;
		} else {
			where.token = req.body.token;
		}

		db.Phone.findOrCreate({
			where: where,
			defaults: values
		}).spread(function (phone, created) {
			var response = {message: phone.id, description: 'Id of the phone.'};
			if (created || !phone.targetArn || phone.token != req.body.token) {
				if (!platformARN) {
					response.error = 'Phone registered on the server but not with AWS. ARN variables not set.';
					res.json(500, response);
				} else {
					var params = {
						PlatformApplicationArn: platformARN,
						Token: req.body.token
					};

					sns.createPlatformEndpointAsync(params).then(function (awsResponse) {
						phone.setDataValue('targetArn', awsResponse.EndpointArn);
						phone.setDataValue('token', req.body.token);
						return phone.save();
					}).then(function () {
						res.json(201, response);
					}).catch(function (error) {
						response.error = error;
						res.json(500, error);
					});
				}
			} else {
				res.json(200, response);
			}
		}).catch(function (error) {
			next(error);
		});
	};
}

module.exports = PhoneController;
