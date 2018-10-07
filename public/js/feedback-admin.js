$().ready(function() {
	$('.delete-question').click(function() {
		var $element = $(this).closest('.question');
		var questionId = parseInt($element.attr('id').substring(9));
		$element.remove();
		$.ajax({
			type: 'DELETE',
			url: '/admin/feedback/question/',
			data: {id: questionId},
			dataType: 'json',
		});
	});

	$('.edit-question').click(function() {
		var $element = $(this).closest('.question');
		var questionId = parseInt($element.attr('id').substring(9));
		window.location.href = '/admin/feedback/question/update?id=' + questionId ;
	});
});
