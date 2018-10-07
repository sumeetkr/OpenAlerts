var Http = require('http');
var WEAServer = require('./server.js');

new WEAServer().then(function(app) {
	'use strict';
	Http.createServer(app).listen(app.get('port'), function () {
		console.log('wea+ server listening on port ' + app.get('port'));
	});
});
