Math.randomInt = function (max) {
	'use strict';
	return Math.floor(Math.random() * max);
};

module.exports = function (schema, db) {
	'use strict';
	schema.Message = db.define('message', {
			messageType: {
				type: db.Sequelize.ENUM('Update', 'Alert'),
				defaultValue: 'Alert',
				allowNull: false
			},
			scope: {
				type: db.Sequelize.ENUM('Public', 'Restricted', 'Private'),
				defaultValue: 'Public',
				allowNull: false
			},
			status: {
				type: db.Sequelize.ENUM('Actual', 'Exercise', 'System', 'Test', 'Draft'),
				defaultValue: 'Actual',
				allowNull: false
			}
		}, {
			getterMethods: {
				incidents: function () {
					if (this.getDataValue('incidents')) {
						return this.getDataValue('incidents').map(function (incident) {
							return incident.getDataValue('incidents').incidentId;
						});
					} else {
						return [];
					}
				}
			},
			setterMethods: {
				incidents: function (incidents) {
					this.setDataValue('incidents', incidents);
				}
			}
		}
	);

	schema.Message.belongsToMany(schema.Message, {through: 'incidents', as: 'incidents'});

	schema.MessageParameter = db.define('parameter', {
		messageId: {
			type: db.Sequelize.INTEGER,
			primaryKey: true
		},
		feedbackForm: {
			type: db.Sequelize.INTEGER
		},
		isMapToBeShown: {
			type: db.Sequelize.BOOLEAN,
			defaultValue: false,
			allowNull: false
		},
		isAlertActive: {
			type: db.Sequelize.BOOLEAN,
			defaultValue: true,
			allowNull: false
		},
		isPhoneExpectedToVibrate: {
			type: db.Sequelize.BOOLEAN,
			defaultValue: false,
			allowNull: false
		},
		isTextToSpeechExpected: {
			type: db.Sequelize.BOOLEAN,
			defaultValue: false,
			allowNull: false
		},
		geoFiltering: {
			type: db.Sequelize.BOOLEAN,
			defaultValue: false,
			allowNull: false
		},
		historyBasedFiltering: {
			type: db.Sequelize.BOOLEAN,
			defaultValue: false,
			allowNull: false
		},
		motionPredictionBasedFiltering: {
			type: db.Sequelize.BOOLEAN,
			defaultValue: false,
			allowNull: false
		},
		campus: {
			type: db.Sequelize.ENUM('sv', 'pa')
		},
		scenarioId: {
			type: db.Sequelize.INTEGER
		},
		isContextAware: {
			type: db.Sequelize.BOOLEAN,
			defaultValue: false,
			allowNull: false
		}

	});

	schema.Message.hasOne(schema.MessageParameter, {
		as: 'parameter',
		through: 'MessageId',
		onUpdate: 'CASCADE',
		onDelete: 'CASCADE'
	});

	schema.MessageInfo = db.define('info', {
		certainty: {
			type: db.Sequelize.ENUM('Observed', 'Likely', 'Possible', 'Unlikely', 'Unknown')
		},
		contact: db.Sequelize.STRING,
		eventCategory: {
			type: db.Sequelize.ENUM('Geo', 'Met', 'Safety', 'Security', 'Rescue', 'Fire', 'Health', 'Env', 'Transport', 'Infra', 'CBRNE', 'Other')
		},
		eventType: {
			type: db.Sequelize.ENUM('Amber', 'Emergency', 'Presidential', 'Follow-up')
		},
		headline: {
			type: db.Sequelize.STRING
		},
		eventDescription: {
			type: db.Sequelize.STRING
		},
		expires: {
			type: db.Sequelize.DATE,
			allowNull: false
		},
		onset: {
			type: db.Sequelize.DATE,
			allowNull: false
		},
		instruction: db.Sequelize.STRING,
		responseType: {
			type: db.Sequelize.ENUM('Shelter', 'Evacuate', 'Prepare', 'Execute', 'Avoid', 'Monitor', 'Assess', 'AllClear', 'None')
		},
		urgency: {
			type: db.Sequelize.ENUM('Immediate', 'Expected', 'Future', 'Past', 'Unknown')
		},
		severity: {
			type: db.Sequelize.ENUM('Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown')
		}
	});

	schema.Message.hasMany(schema.MessageInfo, {
		as: 'info',
		onUpdate: 'CASCADE',
		onDelete: 'CASCADE'
	});

	schema.Area = db.define('area', {});

	schema.MessageInfo.hasMany(schema.Area, {
		onUpdate: 'CASCADE',
		onDelete: 'CASCADE'
	});

	schema.Polygon = db.define('polygon', {
		lat: db.Sequelize.STRING,
		lng: db.Sequelize.STRING
	});

	schema.Area.hasMany(schema.Polygon, {
		as: 'polygon',
		onUpdate: 'CASCADE',
		onDelete: 'CASCADE'
	});

	schema.MessageStatus = db.define('status', {
		additionalInfo: {
			type: db.Sequelize.STRING(2048)
		},
		status: {
			type: db.Sequelize.ENUM('received', 'discarded', 'shown', 'clicked', 'opened'),
			allowNull: false
		}
	});

	schema.Message.hasMany(schema.MessageStatus, {
		onUpdate: 'CASCADE',
		onDelete: 'CASCADE'
	});

	schema.Phone.hasMany(schema.MessageStatus, {
		onUpdate: 'CASCADE',
		onDelete: 'CASCADE'
	});

	schema.MessageInfo.belongsToMany(schema.Phone, {
		as: 'audience',
		through: 'groups'
	});

	function sequelizeQuery(where, order) {
		return {
			where: where ? where.message : {},
			attributes: ['id', 'messageType', 'scope', 'status'],
			order: order,
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

	schema.Message.getAll = function () {
		return schema.Message.findAll({
			attributes: ['id', 'messageType', 'scope', 'status'],
			include: [
				{
					model: schema.MessageInfo, as: 'info',
					attributes: ['certainty', 'contact', 'eventCategory', 'eventType', 'headline',
						'eventDescription', 'expires', 'onset', 'instruction',
						'responseType', 'urgency', 'severity'],
					include: [
						{
							model: schema.Area, attributes: ['id'],
							include: [
								{model: schema.Polygon, as: 'polygon', attributes: ['lat', 'lng']}]
						}
					]
				},
				{
					model: schema.MessageParameter, as: 'parameter',
					attributes: ['isMapToBeShown', 'isAlertActive', 'isPhoneExpectedToVibrate',
						'isTextToSpeechExpected', 'geoFiltering', 'historyBasedFiltering',
						'motionPredictionBasedFiltering', 'campus', 'feedbackForm', 'scenarioId',
						'isContextAware']
				},
				{
					model: schema.Message, as: 'incidents', attributes: ['id']
				}
			]
		});
	};

	/**
	 * Returns all messages for a given scenario id.
	 * @param scenarioId id of the scenario
	 * @param campus relevant campus location
	 * @returns {*} messages (promise)
	 */
	schema.Message.getAllMessageScenarioId = function (scenarioId, campus) {
		var where = {
			parameter: {
				scenarioId: scenarioId
			}
		};
		if (campus && campus !== 'both') {
			where.parameter.campus = campus;
		}
		return schema.Message.findAll(sequelizeQuery(where, 'message.id ASC'));
	};

	schema.Message.getAllIncidents = function () {
		return schema.Message.findAll({
			attributes: ['id'],
			include: [
				{
					model: schema.MessageInfo, as: 'info',
					attributes: ['headline']
				},
				{
					model: schema.Message, as: 'incidents', attributes: ['id']
				}]
		}).filter(function (message) {
			return message.incidents.length == 1 && message.incidents[0] === message.id;
		}).map(function (message) {
			return {id: message.id, name: message.info[0].headline}
		});
	};

	schema.Message.getById = function (id) {
		return schema.Message.find(sequelizeQuery({message: {id: id}})).then(function (message) {
			if (message) {
				return message;
			} else {
				throw {status: 404, message: 'No message with id ' + id + '.'};
			}
		});
	};

	schema.Message.getAllByPhone = function (phoneId, timestamp) {
		var query = {
			parameter: {
				isAlertActive: true
			},
			info: {
				onset: {
					lte: new Date()
				}
			},
			audience: {
				id: phoneId
			}
		};

		if (timestamp) {
			query.info.onset.gt = new Date(timestamp);
		}

		return schema.Message.findAll(sequelizeQuery(query));
	};

	function createArea(info, areaData, transaction) {
		return info.createArea(areaData, {transaction: transaction}).then(function (area) {
			var tasks = [];

			areaData.polygon.forEach(function (polygonData) {
				tasks.push(area.createPolygon(polygonData, {transaction: transaction}));
			});

			return db.Promise.all(tasks);
		});
	}

	function createInfo(message, infoData, transaction) {
		return message.createInfo(infoData, {transaction: transaction}).then(function (info) {
			var tasks = [];

			if (infoData.areas) {
				infoData.areas.forEach(function (area) {
					tasks.push(createArea(info, area, transaction));
				});
			}

			tasks.push(info.setAudience(infoData.audience, {transaction: transaction}));

			return db.Promise.all(tasks);
		});
	}

	function createMessage(data, trialEvent) {
		return function (transaction) {
			var messagePromise;
			if (trialEvent) {
				messagePromise = trialEvent.createMessage(data, {transaction: transaction});
			} else {
				messagePromise = schema.Message.create(data, {transaction: transaction});
			}

			return messagePromise.then(function (message) {
				var tasks = [];

				if (!data.incidents || data.incidents.length === 0) {
					data.incidents = [message.id];
				}

				tasks.push(db.Promise.all(data.incidents.map(function (incidentId) {
					return schema.Message.findOne(incidentId, {transaction: transaction})
				})).then(function (incidents) {
					return message.setIncidents(incidents, {transaction: transaction});
				}));

				if (data.incidentId) {
					tasks.push(schema.Message.getById(data.incidentId).then(function (incidents) {
						return message.setIncidents([incidents], {transaction: transaction});
					}));
				}

				data.info.forEach(function (info) {
					tasks.push(createInfo(message, info, transaction));
				});

				tasks.push(message.createParameter(data.parameter, {transaction: transaction}));

				return db.Promise.all(tasks).then(function () {
					return message.id;
				});
			});
		};
	}

	schema.Message.createMessage = function (messageData, transaction, trialEvent) {
		if (transaction) {
			return createMessage(messageData, trialEvent)(transaction);
		} else {
			return db.transaction(createMessage(messageData, trialEvent));
		}
	};

	schema.Message.updateMessage = function (message, messageData, transaction) {
		if (transaction) {
			return updateMessage(message, messageData)(transaction);
		} else {
			return db.transaction(updateMessage(message, messageData));
		}
	};


	function updateInfo(info, infoData, transaction) {
		return info.update(infoData, {transaction: transaction}).then(function (info) {
			var tasks = [];

			tasks.push(db.Promise.all(db.Promise.map(info.getAreas(), function(area){
				area.destroy();
			})).then(function(){
				var tasks = [] ;
				if (infoData.areas) {
					infoData.areas.forEach(function (area) {
						tasks.push(createArea(info, area, transaction));
					});
				}
				return db.Promise.all(tasks);
			}));

			tasks.push(info.setAudience(infoData.audience, {transaction: transaction}));
			return db.Promise.all(tasks);
		});
	}

	function updateMessage(message, data, transaction) {
		return function (transaction) {
			return message.update(data, {fields: ['messageType', 'scope', 'status'] , transaction: transaction}).then(function (message) {
				var tasks = [];

				if (!data.incidents || data.incidents.length === 0) {
					data.incidents = [message.id];
				}

				if (data.incidentId)
					data.incidents.push(data.incidentId);

				tasks.push(db.Promise.all(data.incidents.map(function (incidentId) {
					return schema.Message.findOne(incidentId, {transaction: transaction})
				})).then(function (incidents) {
					return message.setIncidents(incidents, {transaction: transaction});
				}));

				tasks.push(
					message.getInfo().then(function(infos){
						return db.Promise.all(infos.map(function(info, index){
							return updateInfo(info, data.info[index], transaction) ;
						}));
					})
				);

				tasks.push(message.getParameter().then(function(param){
					return param.update(data.parameter, {transaction: transaction});
				}));

				return db.Promise.all(tasks).then(function () {
					return message.id;
				});
			});
		};
	}

	return schema;
};
