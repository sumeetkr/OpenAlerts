var Conf = require('node-conf');

module.exports = function (grunt) {
	'use strict';
	grunt.loadNpmTasks('grunt-mocha-test');
	grunt.loadNpmTasks('grunt-contrib-jshint');

	var config = Conf.load('test');

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		jshint: {
			files: ['*.js', './controllers/*.js'],
			options: {
				maxlen: 120,
				quotmark: 'single',
				curly: true
			}
		},
		mochaTest: {
			test: {
				options: {
					reporter: 'spec',
					ui: 'bdd'
				},
				src: ['tests/**/*.js']
			}
		}
	});

	grunt.registerTask('default', ['jshint', 'mochaTest']);
};