Math.randomInt = function (max) {
	return Math.floor(Math.random() * max);
};

module.exports = function (schema, db) {
	schema.TrialEvent = db.define('trial_event', {
		note: db.Sequelize.STRING
	});

	schema.TrialEvent.hasMany(schema.Message, {
		onUpdate: 'CASCADE',
		onDelete: 'CASCADE'
	});

	function sequelizeQuery(where) {
		return {
			where: where,
			attributes: ['id', 'note'],
			limit: 5,
			order: [['id', 'DESC']],
			include: [{
				model: schema.Message,
				include: [
					{
						model: schema.MessageInfo, as: 'info', attributes: [
						'id', 'certainty', 'eventCategory', 'eventType', 'headline',
						'eventDescription', 'expires', 'onset', 'responseType', 'urgency',
						'severity', 'instruction', 'contact'],
						include: [
							{model: schema.Phone, as: 'audience', attributes: ['id']},
							{
								model: schema.Area, attributes: ['id'], include: [
								{
									model: schema.Polygon, as: 'polygon', attributes: ['lat', 'lng']
								}]
							}
						]
					},
					{
						model: schema.Message, as: 'incidents', attributes: ['id']
					},
					{
						model: schema.MessageParameter, as: 'parameter',
						attributes: ['isMapToBeShown', 'isAlertActive', 'isPhoneExpectedToVibrate',
							'isTextToSpeechExpected', 'geoFiltering', 'historyBasedFiltering',
							'motionPredictionBasedFiltering', 'campus', 'feedbackForm', 'scenarioId',
							'isContextAware']
					}
				]
			}]
		};
	}

	/*
	 * This is the sequelize query that returns a list of all trial events with
	 * associations, from the parameters to the polygon.
	 */
	schema.TrialEvent.getAll = function () {
		return schema.TrialEvent.findAll(sequelizeQuery());
	};

	schema.TrialEvent.getById = function (trialEventId) {
		return schema.TrialEvent.findOne(sequelizeQuery({id: trialEventId}));
	};

	schema.TrialEvent.createEvent = function (eventData) {
		return db.transaction(function (transaction) {
			return schema.TrialEvent.create(eventData, {transaction: transaction}).then(function (trialEvent) {
				return makeAudience(trialEvent, eventData);
			}).then(function (trialEvent) {
				var tasks = [];

				eventData.messages.forEach(function (messageData) {
					tasks.push(schema.Message.createMessage(messageData, transaction, trialEvent));
				});

				return db.Promise.all(tasks).then(function () {
					return trialEvent.id;
				});
			});
		});
	};

	schema.TrialEvent.forEachAudienceGroup = function (trialEvent, func) {
		if (!trialEvent) {
			return;
		}
		trialEvent.getMessages({
			include: [{
				model: schema.MessageParameter, as: 'parameter',
				where: {'isAlertActive': true}
			}, {
				model: schema.MessageInfo, as: 'info',
				include: [{
					model: schema.Phone, as: 'audience'
				}]
			}, {
				model: schema.Message, as: 'incidents'
			}]
		}).then(function (messages) {
			messages.forEach(function (msg) {
				if (!msg || !msg.parameter.isAlertActive || !msg.info) {
					return;
				}
				msg.info.forEach(function (info) {
					func(info.audience, info, msg, trialEvent);
				});
			});
		});
	};

	schema.TrialEvent.getAllAudienceGroup = function (trialEvent) {
		if (!trialEvent) {
			return [];
		}
		return trialEvent.getMessages({
			include: [{
				model: schema.MessageParameter, as: 'parameter',
				where: {'isAlertActive': true}
			}, {
				model: schema.MessageInfo, as: 'info',
				include: [{
					model: schema.Phone, as: 'audience'
				}]
			}, {
				model: schema.Message, as: 'incidents'
			}]
		}).then(function (messages) {
			var ret = [] ;
			messages.forEach(function (msg) {
				if (!msg || !msg.parameter.isAlertActive || !msg.info) {
					return;
				}
				msg.info.forEach(function (info) {
					ret.push({phones: info.audience, info: info, message: msg, trialEvent: trialEvent})
				});
			});
			return ret ;
		});
	};

	schema.TrialEvent.updateEvent = function (trialEvent, eventData) {
		return db.transaction(function (transaction) {
			return trialEvent.updateAttributes(eventData, {transaction: transaction}).then(function (trialEvent) {
				return makeAudience(trialEvent, eventData);
			}).then(function (trialEvent) {
				var tasks = [];

				eventData.messages.forEach(function(msgData) {
					tasks.push(
						schema.Message.getById(msgData.id).then(function(message) {
							return schema.Message.updateMessage(message, msgData, transaction);
						})
					);
				});

				return db.Promise.all(tasks).then(function () {
					return trialEvent.id;
				});
			});
		});
	};


	function makeAudience(trialEvent, eventData){
		eventData.messages.forEach(function (message) {
			message.info.forEach(function (info) {
				info.audience = [];
			});
		});

		var scenarioId = eventData.messages[0].parameter.scenarioId;
		var campus = eventData.messages[0].parameter.campus;
		return schema.Message.getAllMessageScenarioId(scenarioId, campus).then(function (all) {
			if (all && all.length > 0) {
				return reusePartitions(trialEvent, eventData, all);
			} else {
				return generatePartitions(trialEvent, eventData);
			}
		})
	}

	function generatePartitions(trialEvent, eventData) {
		var condition = {};
		var campus = eventData.messages[0].parameter.campus;

		if (campus && campus !== 'both') {
			condition = {location: (campus === 'sv' ? 'west' : 'east')};
		}

		return schema.Phone.findAll({where: condition}).then(function (phones) {
			var phonesPerMessage = Math.ceil(phones.length / eventData.messages.length);

			function shuffle(o) {
				for (var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x) {
				}
				return o;
			}

			shuffle(phones);

			phones.forEach(function (phone, index) {
				var id = Math.floor(index / phonesPerMessage);
				eventData.messages[id].info.forEach(function (info) {
					info.audience.push(phone.id);
				});
			});

			return trialEvent;
		});
	}

	function reusePartitions(trialEvent, eventData, scenarioMessages) {
		eventData.messages.forEach(function (msg, indexMessage) {

			var originalMessage = scenarioMessages[indexMessage];

			msg.info.forEach(function (info, indexInfo) {
				var originalInfo = originalMessage.info[indexInfo];
				originalInfo.audience.forEach(function (phone) {
					info.audience.push(phone.id);
				})
			});
		});

		return trialEvent;
	}


	return schema;
};
