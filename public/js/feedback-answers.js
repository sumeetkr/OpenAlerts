$().ready(function () {
	var $alertIdFilter = $('#alertId-filter');
	var $participantFilter = $('#participant-filter');
	var $questionFilter = $('#question-filter');
	var $rows = $('tbody tr');

	$alertIdFilter.keyup(filter);
	$participantFilter.keyup(filter);
	$questionFilter.keyup(filter);

	$('.input-group-btn').click(function() {
		$(this).siblings('input').val('');
		filter();
	});

	function filter() {
		var alertFilter = $alertIdFilter.val();
		var participantFilter = $participantFilter.val();
		var questionFilter = $questionFilter.val();
		$rows.each(function () {
			var alertId = $(this).find('.alertId').html();
			var participant = $(this).find('.participant').html();
			var question = $(this).find('.question').html();
			if (alertId.indexOf(alertFilter) < 0 || participant.indexOf(participantFilter) < 0 || question.indexOf(questionFilter) < 0) {
				$(this).hide();
			} else {
				$(this).show();
			}
		});
	}
});