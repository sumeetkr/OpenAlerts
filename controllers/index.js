var jade = require('jade');
var online = false;

var MessageController = require('./message');
var TrialEventController = require('./trialEvent');
var PhoneController = require('./phone');
var FeedbackController = require('./feedback');

// Render view Templates for Backbone
var templates = jade.renderFile('./views/infoWindow.jade', {});
templates += jade.renderFile('./views/table.jade', {});
templates += jade.renderFile('./views/newAlert.jade', {});
templates += jade.renderFile('./views/popupWindow.jade', {});


module.exports = function (db, sns) {
	'use strict';
	return {
		orchestrator: require('./orchestrator'),
		phone: new PhoneController(db, sns),
		message: new MessageController(db),
		trialEvent: new TrialEventController(db, sns),
		feedback: new FeedbackController(db),
		map: function (req, res, next) {
			res.render('index', {templates: templates});
		}
	};
};
