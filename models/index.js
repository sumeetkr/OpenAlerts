var schemas = [
	require('./user'),
	require('./phone'),
	require('./message'),
	require('./form'),
	require('./trialEvent')
];

function validateConfig(config) {
	'use strict';
	if (!config) {
		throw 'Invalid database configuration';
	}
	if (!config.db) {
		throw 'Invalid database configuration, missing db.';
	}
	if (!config.db.name) {
		throw 'Invalid database configuration, missing db name.';
	}
	if (!config.db.host) {
		throw 'Invalid database configuration, missing db host.';
	}
	if (!config.db.username) {
		throw 'Invalid database configuration, missing db username.';
	}
	if (!config.db.password) {
		throw 'Invalid database configuration, missing db password.';
	}
}

module.exports = function () {
	'use strict';

	this.connect = function (config, Sequelize) {
		var db, force;
		var options = {
			dialect: 'mysql',
			logging: false,
			pool: {
				max: 10,
				min: 0,
				idle: 10000
			}
		};

		if (process.env.CLEARDB_DATABASE_URL) {
			/* Use environment variable if available (e.g. heroku) */
			db = new Sequelize(process.env.CLEARDB_DATABASE_URL, options);
			force = process.env.FORCE || false;
		} else if (process.env.NODE_ENV === 'test') {
			/* Use sqlite if we are running tests */
			options.dialect = 'sqlite';
			db = new Sequelize('wea', 'wea', null, options);
			force = false;
		} else {
			validateConfig(config);
			if (config.db.logging) {
				options.logging = console.log;
			}
			options.host = config.db.host;
			db = new Sequelize(config.db.name, config.db.username, config.db.password, options);
			force = process.env.FORCE || (config.db && config.db.force) ? true : false;
		}

		var schema = {};

		schemas.forEach(function (schemaFn) {
			schemaFn(schema, db);
		});

		return db.sync({force: force}).then(function () {
			schema.sequelize = db;
			schema.Promise = db.Promise;
			return schema;
		});
	};
};
