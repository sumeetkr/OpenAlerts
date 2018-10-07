var LocalStrategy = require('passport-local').Strategy;

module.exports = function(passport, dbTables) {
	passport.use('local-login', new LocalStrategy(
		function(username, password, done) {
			dbTables.User.find({where: { username: username }}).then( function (user) {
				if (user == null)
					return done(null, false, { message: 'Incorrect username.' });
				if (user.password != password) {
					return done(null, false, { message: 'Incorrect password.' });
				}
				return done(null, user);
			});
		}
	));

	passport.serializeUser(function(user, done) {
		done(null, user.username);
	});

	passport.deserializeUser(function(username, done) {
		dbTables.User.find({where: { username: username }}).then( function (user) {
			return done(null, user);
		});
	});
};
