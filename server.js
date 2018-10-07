/* Frameworks */
var Path = require('path');
var Express = require('express');
var Passport = require('passport');
var Sequelize = require('sequelize');
var Jade = require('jade');
var Conf = require('node-conf');
var async = require('async');
var schedule = require('node-schedule');
var AWS = require('aws-sdk');

/* wea+ server */
var Controller = require('./controllers');
var routes = require('./routes');
var Database = require('./models');

var node_env = process.env.NODE_ENV || 'development';

module.exports = function () {
	'use strict';
	var config = Conf.load(node_env);
	var app = new Express();
	var database = new Database().connect(config, Sequelize);

	return database.then(function (schema) {
		AWS.config.update({
			region: 'us-east-1',
			accessKeyId: process.env.AWS_ACCESS_KEY_ID,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
		});

		var sns = Sequelize.Promise.promisifyAll(new AWS.SNS());

		var controller = new Controller(schema, sns);
		require('./passport')(Passport, schema);

		app.configure(function () {
			app.set('port', process.env.PORT || config.port || 5000);
			app.set('views', Path.join(__dirname, 'views'));
			app.set('view engine', 'jade');
			app.set('jade', Jade);
			app.set('db', database);
			app.set('schema', schema);
			app.use(Express.json());

			if ('development' === node_env) {
				app.use(Express.logger('dev'));
			}

			app.use(Express.urlencoded());
			app.use(Express.methodOverride());
			app.use(Express.bodyParser());
			app.use(Express.static(Path.join(__dirname, 'public')));

			app.use(Express.cookieParser());
			app.use(Express.session({
				secret: 'weawebapplication',
				cookie: {maxAge: 3600000 * 24 * 10}
			}));
			app.use(Passport.initialize());
			app.use(Passport.session());

			app.use(function (req, res, next) {
				res.promise = promiseResolver(req, res, next);
				next();
			});

			app.use(app.router);
		});

		app.configure(function () {
			app.use(errorHandler);
		});

		routes(app, controller, Passport);

		controller.trialEvent.initJobs();
		return app;
	});
};

function errorHandler(err, req, res, next) {
	'use strict';
	if (err.status) {
		res.send(err.status, {message: err.message});
		console.error(err.message);
	} else {
		res.send(500, {message: err.toString()});
		console.error(err);
		console.error(err.stack);
	}
}

/**
 * Helper function that resolves promises to json responses on resolution.
 */
function promiseResolver(req, res, next) {
	'use strict';
	return function (status, promise) {
		promise.then(function (result) {
			res.json(status, result);
		}).catch(function (error) {
			next(error);
		});
	};
}
