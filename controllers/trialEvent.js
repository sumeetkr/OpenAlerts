var schedule = require('node-schedule');

function TrialEventController(db, sns, scheduler) {
	'use strict';
	var scheduledJobs = {};

	this.initJobs = function () {
		db.TrialEvent.getAll().then(function (trialEvents) {
			trialEvents.forEach(function (trialEvent) {
				scheduleEvent(db, sns, trialEvent, scheduledJobs);
			});
		});
	};

	this.getAllEvents = function (req, res, next) {
		res.promise(200, db.TrialEvent.getAll());
	};

	this.createEvent = function (req, res, next) {
		db.TrialEvent.createEvent(req.body).then(function (trialEventId) {
			db.TrialEvent.getById(trialEventId).then(function (trialEvent) {
				scheduleEvent(db, sns, trialEvent, scheduledJobs);
				return res.json(201, trialEvent);
			});
		}).catch(function (error) {
			next(error);
		});
	};

	this.updateEvent = function (req, res, next) {
		db.TrialEvent.find(req.params.trialEventId).then(function (trialEvent) {
			db.TrialEvent.updateEvent(trialEvent, req.body).then(function (newTrialEventId) {
				db.TrialEvent.getById(newTrialEventId).then(function (newTrialEvent) {
					reScheduleEvent(db, sns, newTrialEvent, scheduledJobs).then(function () {
						return res.json(200, newTrialEvent);
					});
				});
			});
		}).catch(function (error) {
			next(error);
		});
	};

	this.getScheduledJobs = function (req, res, next) {
		var ret = [], now = new Date();
		for (var id in scheduledJobs) {
			ret.push({id: id, date: scheduledJobs[id].scheduled, rem: getDelta(scheduledJobs[id].scheduled, now)});
		}
		ret.sort(function (a, b) {
			return a.date - b.date;
		});
		return res.json(200, ret);
	};
}

module.exports = TrialEventController;

function getDelta(b, a) {
	var msec = b - a;
	var hh = Math.floor(msec / 1000 / 60 / 60);
	msec -= hh * 1000 * 60 * 60;
	var mm = Math.floor(msec / 1000 / 60);
	msec -= mm * 1000 * 60;
	var ss = Math.floor(msec / 1000);
	msec -= ss * 1000;
	return (hh + ':' + mm + ':' + ss);
}

function reScheduleEvent(db, sns, trialEvent, scheduledJobs) {
	'use strict';
	return db.TrialEvent.getAllAudienceGroup(trialEvent).then(function (audienceGroup) {
		audienceGroup.forEach(function (group) {
			var phones = group.phones, info = group.info, msg = group.message, trialEvent = group.trialEvent;
			if (msg.id in scheduledJobs) {
				scheduledJobs[msg.id].job.cancel();
				delete scheduledJobs[msg.id];
			}

			var task = createPushNotification(sns, phones, info, msg, trialEvent, scheduledJobs);
			var job = addJob(task, info.onset, info.expires);

			if (job) {
				console.log('Setting a job for message #' + msg.id + ' @ ' + job.scheduled.toISOString());
				scheduledJobs[msg.id] = job;
			}
		});
	});
}

function scheduleEvent(db, sns, trialEvent, scheduledJobs) {
	'use strict';
	return db.TrialEvent.forEachAudienceGroup(trialEvent, function (phones, info, msg, trialEvent) {
		var task = createPushNotification(sns, phones, info, msg, trialEvent, scheduledJobs);
		var job = addJob(task, info.onset, info.expires);

		if (job) {
			console.log('Setting a job for message #' + msg.id + ' @ ' + job.scheduled.toISOString());
			scheduledJobs[msg.id] = job;
		}
	});
}

function createPushNotification(sns, phones, info, msg, trialEvent, scheduledJobs) {
	'use strict';
	return function () {
		delete scheduledJobs[msg.id];

		if (process.env.NODE_ENV == 'test' || process.env.NODE_ENV == 'localtest') {
			return;
		}

		if (!info || !msg || !trialEvent || !phones || phones.length === 0) {
			return;
		}

		var payload;
		if (msg.messageType === 'Update') {
			payload = 'Emergency Alert Update: ' + info.headline;
		} else {
			payload = 'Emergency Alert: ' + info.headline;
		}

		phones.forEach(function (phone) {
			var params = {
				Message: JSON.stringify({
					default: 'I am default',
					'APNS_SANDBOX': JSON.stringify(generatePushMessage(phone.platform, payload))
				}),
				MessageStructure: 'json',
				TargetArn: phone.targetArn
			};

			sns.publish(params, function (err, data) {
				if (err) {
					console.log(err, err.stack);
				}
			});
		});
	};
}

function generatePushMessage(type, payload) {
	'use strict';
	switch (type) {
		case 'ios':
			return {
				aps: {
					alert: {
						title: 'WEA+ Alert',
						body: payload,
						'action-loc-key': 'VIEW'
					},
					badge: 1,
					sound: 'chime.aiff'
				}
			};
		case 'android':
			return {};
	}
}

function addJob(task, onset, expire) {
	'use strict';
	var start = new Date(onset);
	var end = new Date(expire);
	var time = new Date();

	if (time > end || time > start) {
		return;
	}

	var date = new Date(start);

	var job = schedule.scheduleJob(date, task);
	return {scheduled: date, job: job};
}
