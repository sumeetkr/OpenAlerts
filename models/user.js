/**
 * Frontend users with a username and a plaintext password.
 */
module.exports = function (schema, db) {
	schema.User = db.define('user', {
		username: db.Sequelize.STRING,
		password: db.Sequelize.STRING
	});

	return schema;
};
