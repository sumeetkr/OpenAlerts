var utils = require('../utils');

function MessageController(db) {
	this.getAllMessages = function (req, res, next) {
		return res.promise(200, db.Message.getAll());
	};

	this.getIncidentMessages = function (req, res, next) {
		return res.promise(200, db.Message.getAllIncidents());
	};

	this.getMessage = function (req, res, next) {
		return res.promise(200, db.Message.getById(req.params.messageId));
	};

	this.getPhoneMessages = function (req, res, next) {
		res.promise(200, db.Message.getAllByPhone(req.params.phoneId, req.query.timestamp).map(function (message) {
			message.info[0].setDataValue('audience', undefined);
			return message;
		}));
	};

	this.createMessage = function (req, res, next) {
		res.promise(201, db.Message.createMessage(req.body));
	};

	this.updateMessage = function (req, res, next) {
		res.promise(200, db.Message.updateMessage(req.body));
	};

	this.updateMessageStatus = function (req, res, next) {
		if (utils.mandatoryPayloadKeys(req, res, ['status'])) {
			return;
		}

		var status = {
			status: req.body.status,
			additionalInfo: req.body.additionalInfo,
			messageId: req.params.messageId,
			phoneId: req.params.phoneId
		};

		db.Promise.all([
			db.Phone.update({status: req.body.status}, {where: {id: req.params.phoneId}}),
			db.MessageStatus.create(status)
		]).then(function (results) {
			res.status(201).end();
		});
	};
}

module.exports = MessageController;
