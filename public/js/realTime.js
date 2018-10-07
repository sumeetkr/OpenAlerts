var Phones = new BB.Phone.Collection();
var Trial = new BB.Trial.Collection();

$(document).ready(function () {
	// First Fetch()
	Trial.fetch()
		.error(function (err) {
			console.log(err);
		});
	Phones.fetch()
		.error(function (err) {
			console.log(err);
		});

	// Reload
	setInterval(function () {
		Phones.fetch()
			.error(function (err) {
				console.log(err);
			});

		Trial.fetch()
			.error(function (err) {
				console.log(err);
			});

	}, appConfig.fetchingRate);

	// Update Next alert Widget
	var tAlert, nextAlert;

	setInterval(function () {
		var now = new Date();
		var nextAlertElem;
		Trial.each(function (elem, index, list) {
			var scheduledFor = elem.messages.at(0).info.at(0).get('onset');

			now = new Date();
			tAlert = new Date(scheduledFor);
			nextAlert = nextAlert || tAlert;
			if (tAlert >= now) {
				nextAlert = (nextAlert < tAlert && nextAlert > now) ? nextAlert : tAlert;
				nextAlertElem = (nextAlert < tAlert && nextAlert > now) ? nextAlertElem : elem;

			}
		});
		if (!nextAlert || nextAlert < now) {
			$('#alertTimer p').html('No more alerts scheduled. ');
		} else {
			$('#alertTimer p').html('Next alert ' + moment(nextAlert).fromNow());
		}

		var timeToWarn = (nextAlert - now);
		//console.log(timeToWarn);

		// Check to see if warning has been issued already
		if (nextAlertElem && !nextAlertElem.scheduled && timeToWarn > 0) {
			nextAlertElem.scheduledTimer = setTimeout(function () {
				nextAlertElem.warn();
			}, timeToWarn);
			nextAlertElem.scheduled = true;

		} 	// Check if it is still being issued
		else if (nextAlertElem && !nextAlertElem.scheduled && ( (new Date(nextAlertElem.messages.at(0).info.at(0).get('expires'))) - now) > 0) {
			nextAlertElem.warn();
			nextAlertElem.scheduled = true;

		}

		// Update Times
		$('.timeFromNow').each(function () {
			var timestamp = $(this).data().timestamp;
			$(this).html(moment(timestamp).fromNow());
		});

	}, 1000);
});