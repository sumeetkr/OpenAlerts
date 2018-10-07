module.exports = function (app, controller, Passport) {
	'use strict';
	var baseUrl = '/wea/api/';

	/* Alert API */
	app.get(baseUrl + 'alert', deprecated);
	app.post(baseUrl + 'alert', deprecated);
	app.put(baseUrl + 'alert/:id', deprecated);
	app.post(baseUrl + 'seen/:messageId/:phoneId', deprecated);

	/* Message API */
	app.get(baseUrl + 'message', controller.message.getAllMessages);
	app.get(baseUrl + 'message/:messageId', controller.message.getMessage);
	app.get(baseUrl + 'message/all/:phoneId', controller.message.getPhoneMessages);
	app.post(baseUrl + 'message', controller.message.createMessage);
	app.put(baseUrl + 'message/:messageId', tbd);
	app.post(baseUrl + 'message/:messageId/status/:phoneId', controller.message.updateMessageStatus);
	app.get(baseUrl + 'incidents', controller.message.getIncidentMessages);


	/* Trial event API */
	app.get(baseUrl + 'trialevent/jobs', controller.trialEvent.getScheduledJobs);
	app.get(baseUrl + 'trialevent', controller.trialEvent.getAllEvents);
	app.get(baseUrl + 'trialevent/:trialEventId', tbd);
	app.post(baseUrl + 'trialevent', controller.trialEvent.createEvent);
	app.put(baseUrl + 'trialevent/:trialEventId', controller.trialEvent.updateEvent);

	/* Phone API */
	app.get(baseUrl + 'phone', controller.phone.getAll);
	app.put(baseUrl + 'phone/:phoneId/heartbeat', controller.phone.heartbeat);
	app.post(baseUrl + 'registration/:platform', controller.phone.register);

	app.get('/feedback/:messageId/:phoneId', controller.feedback.feedbackForm);
	app.post('/feedback/:messageId/:phoneId', controller.feedback.postFeedback);

	app.get(baseUrl + 'forms', controller.feedback.getForms);

	app.get('/admin/feedback', function (req, res) {
		res.redirect('/admin/feedback/question');
	});

	app.get('/admin/feedback/form/create', controller.feedback.renderCreateForm);
	app.get('/admin/feedback/form/update', controller.feedback.renderUpdateForm);
	app.get('/admin/feedback/question/create', controller.feedback.renderCreateQuestion);
	app.get('/admin/feedback/question/update', controller.feedback.renderUpdateQuestion);
	app.get('/admin/feedback/answer', controller.feedback.showAnswers);

	app.get('/admin/feedback/question', controller.feedback.showQuestions);
	app.post('/admin/feedback/question', controller.feedback.createQuestion);
	app.put('/admin/feedback/question', controller.feedback.updateQuestion);
	app.delete('/admin/feedback/question', controller.feedback.deleteQuestion);

	app.get('/admin/feedback/form', controller.feedback.showForms);
	app.post('/admin/feedback/form', controller.feedback.createForm);
	app.put('/admin/feedback/form', controller.feedback.updateForm);
	app.get('/admin/feedback/form/delete', controller.feedback.deleteForm);

	app.get('/map', isLoggedIn, controller.map);

	app.get('/', function (req, res) {
		res.render('login');
	});
	app.post('/login', Passport.authenticate('local-login', {successRedirect: '/map', failureRedirect: '/'}));
};

function isLoggedIn(req, res, next) {
	'use strict';
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('/');
}

function deprecated(req, res, next) {
	'use strict';
	res.json(410, {message: 'This API has been deprecated. Please use the updated api \'/message\'.'});
}

function tbd(req, res, next) {
	'use strict';
	res.json(501, 'Not enough code monkeys employed. Please deploy more...');
}
