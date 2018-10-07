var utils = require('../utils');

var Sequelize = require('sequelize');

function FeedbackController(db) {
	'use strict';

	this.feedbackForm = function (req, res, next) {
		var messageId = parseInt(req.param('messageId'));
		var phoneId = req.param('phoneId');

		db.Promise.all([
			db.MessageStatus.findOrCreate({
				where: {
					messageId: messageId,
					phoneId: phoneId,
					status: 'opened'
				}
			}),
			db.Message.getById(messageId).then(function (message) {
				return db.Form.getById(message.parameter.feedbackForm);
			}).then(function (feedbackForm) {
				return feedbackForm.getQuestions({joinTableAttributes: ['order'], order: '`order`'});
			})
		]).spread(function (status, questions) {
			res.render('feedbackForm', {messageId: messageId, phoneId: phoneId, questions: questions});
		}).catch(next);
	};

	this.postFeedback = function (req, res, next) {
		var messageId = parseInt(req.param('messageId'));
		var phoneId = req.param('phoneId');

		for (var key in req.body) {
			if (req.body.hasOwnProperty(key)) {
				db.Answer.create({
					messageId: messageId,
					phoneId: phoneId,
					questionId: parseInt(key.substring(9)),
					answer: JSON.stringify(req.body[key])
				});
			}
		}
		res.render('feedbackSuccess');
	};

	this.showQuestions = function (req, res, next) {
		db.Question.findAll()
			.then(function (all) {
				res.render('feedbackQuestions', {title: 'WEA+ Feedback Questions', questions: all});
			});
	};

	this.showForms = function (req, res, next) {
		db.Form.findAll({include: [{model: db.Question, as: 'Questions'}]}).then(function (forms) {
			res.render('feedbackForms', {title: 'WEA+ Feedback Forms', forms: forms});
		}).catch(next);
	};

	this.showAnswers = function (req, res, next) {
		db.Answer.findAll({include: [{model: db.Message}, {model: db.Phone}, {model: db.Question}]})
			.then(function (all) {
				res.render('feedbackAnswers', {title: 'WEA+ Feedback Answers', answers: all});
			}, function (err) {
				next(err);
			});
	};

	this.createQuestion = function (req, res, next) {
		if (utils.mandatoryPayloadKeys(req, res, ['title', 'text', 'type', 'mandatory', 'options'])) {
			return;
		}

		res.promise(200, db.Question.create(req.body));
	};

	this.updateQuestion = function (req, res, next) {
		if (utils.mandatoryPayloadKeys(req, res, ['title', 'text', 'type', 'mandatory', 'options'])) {
			return;
		}

		res.promise(200, db.Question.getById(req.body.id).then(function (question) {
			return question.updateAttributes(req.body);
		}));
	};

	this.deleteQuestion = function (req, res, next) {
		if (utils.mandatoryPayloadKeys(req, res, ['id'])) {
			return;
		}

		res.promise(200, db.Question.getById(req.body.id).then(function (question) {
			return question.destroy();
		}));
	};

	this.createForm = function (req, res, next) {
		db.Form.create({
			name: req.body.name
		}).then(function (form) {
			function save(index) {
				if (index >= req.body.questions.length) {
					return;
				}
				db.Question.find(req.body.questions[index]).then(function (question) {
					form.addQuestion(question, {order: index}).then(function () {
						save(index + 1);
					});
				});
			}

			save(0);
			res.end(JSON.stringify({status: 200}));
		});
	};


	this.updateForm = function (req, res, next) {
		var formId = req.param('id');
		db.Form.find(formId).then(function (form) {
			form.updateAttributes({
				name: req.body.name
			}).then(function () {
				db.FormQuestions.destroy({where: {formId: formId}}).then(function () {
					function save(index) {
						if (index >= req.body.questions.length) {
							return;
						}
						db.Question.find(req.body.questions[index]).then(function (question) {
							form.addQuestion(question, {order: index}).then(function () {
								save(index + 1);
							});
						});
					}

					save(0);
					res.end(JSON.stringify({status: 200}));
				});
			});
		});
	};

	this.deleteForm = function (req, res, next) {
		var formId = req.param('id');
		db.Form.destroy({where: {id: formId}}).then(function () {
			db.FormQuestions.destroy({where: {formId: formId}}).then(
				function () {
					res.redirect('/admin/feedback/form');
				}
			);
		});
	};

	this.getForms = function (req, res, next) {
		res.promise(200, db.Form.findAll());
	};

	this.renderCreateQuestion = function (req, res, next) {
		res.render('feedbackCreateQuestion', {title: 'WEA+ Create new Feedback Question'});
	};

	this.renderUpdateQuestion = function (req, res, next) {
		var questionId = req.param('id');
		db.Question.find(questionId).then(function (question) {
			res.render('feedbackUpdateQuestion', {title: 'WEA+ Edit Feedback Question', question: question});
		});
	};

	this.renderCreateForm = function (req, res, next) {
		db.Question.findAll().then(function (questions) {
			res.render('feedbackCreateForm', {
				title: 'WEA+ Create new Feedback Form',
				isEdit: false,
				form: {name: ''},
				questions: questions,
				selected: []
			});
		}).catch(next);
	};

	this.renderUpdateForm = function (req, res, next) {
		var formId = req.param('id');
		new Sequelize.Utils.QueryChainer()
			.add(db.Form.find(formId))
			.add(db.Question.findAll())
			.add(db.FormQuestions.findAll({order: '`order`', where: {formId: formId}}))
			.run()
			.then(function (err, form, questions, FormQuestions) {
				var selected = [];
				for (var i = 0; i < FormQuestions.length; i++) {
					var index = find(questions, FormQuestions[i].questionId);
					var q = questions.splice(index, 1);
					selected.push(q[0]);
				}

				res.render('feedbackCreateForm', {
					title: 'WEA+ Update Feedback Form',
					isEdit: true,
					form: form,
					questions: questions,
					selected: selected
				});
			});
	};
}

function find(questions, qID) {
	'use strict';
	for (var i = 0; i < questions.length; i++) {
		if (questions[i].id === qID) {
			return i;
		}
	}
}

module.exports = FeedbackController;
