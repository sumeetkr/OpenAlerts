var moment = require('moment');

/**
 * A phone that is registered in the app. Belongs to one participant,
 * but a participant can have multiple phones.
 */
module.exports = function (schema, db) {
	'use strict';
	schema.Phone = db.define('phone', {
		lng: db.Sequelize.STRING,
		lat: db.Sequelize.STRING,
		location: {
			type: db.Sequelize.ENUM('west', 'east'),
			allowNull: false
		},
		imei: db.Sequelize.STRING,
		accuracy: db.Sequelize.STRING,
		batteryLevel: db.Sequelize.STRING,
		platform: {
			type: db.Sequelize.ENUM('ios', 'android'),
			allowNull: false
		},
		packageVersion: db.Sequelize.STRING,
		token: {
			type: db.Sequelize.STRING,
			unique: true
		},
		targetArn: db.Sequelize.STRING,
		status: db.Sequelize.ENUM('received', 'discarded', 'shown', 'clicked')
	});

	schema.PhoneInfo = db.define('phoneInfo', {
		lng: db.Sequelize.STRING,
		lat: db.Sequelize.STRING,
		accuracy: db.Sequelize.STRING,
		batteryLevel: db.Sequelize.STRING,
		packageVersion: db.Sequelize.STRING,
		additionalInfo: db.Sequelize.STRING(2048),
		rawJson: db.Sequelize.STRING(4096)
	});

	schema.Phone.hasMany(schema.PhoneInfo, {
		as: 'info',
		onUpdate: 'CASCADE',
		onDelete: 'CASCADE'
	});

	schema.Phone.getById = function (id) {
		return schema.Phone.find(id).then(function (phone) {
			if (phone) return phone;
			else throw {status: 404, message: 'No phone with id ' + id + '.'};
		});
	};

	schema.Phone.getAll = function () {
		return schema.Phone.findAll({
			attributes: [
				'id', 'lng', 'lat', 'accuracy', 'batteryLevel', 'platform', 'packageVersion',
				'updatedAt', 'imei', 'status'
			]
		}).map(function (phone) {
			return schema.MessageStatus.findOne({
				where: {phoneId: phone.id},
				order: 'updatedAt DESC'
			}).then(function (status) {
				if (status && moment(status.updatedAt).add(15, 'minutes').isAfter()) {
					phone.setDataValue('status', status.status);
				} else if (moment(phone.updatedAt).add(15, 'minutes').isBefore()) {
					phone.setDataValue('status', 'dead');
				} else {
					phone.setDataValue('status', 'alive');
				}
				return phone;
			});
		});
	};

	return schema;
};
