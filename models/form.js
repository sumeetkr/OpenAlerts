/**
 * A feedback form to collect trial related responses, from a participant.
 * Each alert has one form. A form is a collection of questions.
 */
module.exports = function (schema, db) {
	schema.Form = db.define('form', {
		name: db.Sequelize.STRING
	}, {paranoid: true});

	schema.MessageParameter.hasOne(schema.Form);

	schema.Question = db.define('question', {
		title: db.Sequelize.STRING,
		text: db.Sequelize.STRING,
		type: db.Sequelize.ENUM('TEXT', 'PARAGRAPH', 'MULTIPLE', 'SINGLE'),
		mandatory: db.Sequelize.BOOLEAN,
		options: db.Sequelize.STRING
	}, {paranoid: true});

	schema.Answer = db.define('answer', {
		answer: db.Sequelize.STRING(2048)
	});

	schema.Answer.belongsTo(schema.Message, {
		onUpdate: 'SET NULL',
		onDelete: 'SET NULL'
	});

	schema.Answer.belongsTo(schema.Question, {
		onUpdate: 'SET NULL',
		onDelete: 'SET NULL'
	});

	schema.Answer.belongsTo(schema.Phone, {
		onUpdate: 'SET NULL',
		onDelete: 'SET NULL'
	});

	schema.FormQuestions = db.define('form_questions', {
		order: db.Sequelize.INTEGER
	});

	schema.Form.belongsToMany(schema.Question, {as: 'Questions', through: schema.FormQuestions});
	schema.Question.belongsToMany(schema.Form, {as: 'Forms', through: schema.FormQuestions});

	schema.Form.getById = function (id) {
		return schema.Form.find(id).then(function (form) {
			if (form) return form;
			else throw {status: 404, message: 'No form with id ' + id + '.'};
		});
	};

	schema.Question.getById = function (id) {
		return schema.Question.find(id).then(function (question) {
			if (question) return question;
			else throw {status: 404, message: 'No question with id ' + id + '.'};
		});
	};

	return schema;
};
