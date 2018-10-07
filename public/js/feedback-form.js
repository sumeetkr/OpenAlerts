$().ready(function () {
	'use strict';
	var currentQuestion = 0;

	function next() {
		if (validate() && currentQuestion !== questions.length) {
			showQuestion(++currentQuestion);
		}
	}

	function validate() {
		var isMandatory = $('.current').hasClass('mandatory');
		if (isMandatory) {
			var $input = $('#question-' + currentQuestion + ' :input');
			if ($input.attr('type') == 'radio') {
				$input = $('#question-' + currentQuestion + ' :input:checked');
			}

			if ($input.val() && $input.val().trim().length > 0) {
				$('#alert').hide();
				return true;
			} else {
				$('#alert').slideDown();
				return false;
			}
		} else {
			$('#alert').hide();
			return true;
		}
	}

	function prev() {
		if (currentQuestion > 0) {
			showQuestion(--currentQuestion);
		}
	}

	$('#prev').click(prev);
	$('#next').click(next);
	var isTimeOutSet = false;
	$('.multiple-choice input').click(function () {
			if (isTimeOutSet)
				return;
			isTimeOutSet = true;
			setTimeout(function () {
					next();
					isTimeOutSet = false;
				},
				200);
		}
	);

	var $form = $('#form');

	// Suppress enter keystroke on form as submit event
	$form.on('keyup keypress', function (e) {
		var code = e.keyCode || e.which;
		if (code === 13) {
			e.preventDefault();
			return false;
		}
	});

	$form.submit(function (e) {
		if (validate()) {
			if (Android) {
				Android.showToast('Feedback from submitted!');
			}
		} else {
			e.preventDefault();
		}
	});

	function showQuestion(question) {
		var $currentQuestion = $('.current');
		var $nextQuestion = $('#question-' + question);

		$currentQuestion.removeClass('current');
		$nextQuestion.addClass('current');

		if (question > 1) {
			$('#prev').show();
		} else {
			$('#prev').hide();
		}

		if (question !== questions.length) {
			$('#next').show();
			$('#submit').hide();
		} else {
			$('#next').hide();
			$('#submit').show();
		}

		var progress = Math.round(question / questions.length * 100) + '%';
		var $progressBar = $('.progress-bar');
		$progressBar.css('width', progress);
		$progressBar.html(question + ' / ' + questions.length);
	}
});
