$().ready(function () {
	$('.select-question').draggable({
		containment: '.select-questions',
		snap: true
	});
	$('.available-questions').droppable({
		accept: ".select-question",
		drop: function (event, ui) {
			var $element = $(ui.draggable);
			$element.draggable("option", "connectToSortable", "");
			$element.detach().css({top: 0, left: 0}).appendTo(this);
		}
	});
	$('.selected-questions').droppable({
		accept: ".select-question",
		drop: function (event, ui) {
			var $element = $(ui.draggable);
			$element.draggable("option", "connectToSortable", ".selected-questions");
			$element.detach().css({top: 0, left: 0}).appendTo(this);
		}
	}).sortable({
		connectWith: '.available-questions, .selected-questions'
	});

	$('form').submit(function (e) {
		e.preventDefault();
		var name = $(e.currentTarget).find('#question-name').val();
		var selectedQuestions = [];
		$(e.currentTarget).find('.selected-questions .question-id').each(function () {
			selectedQuestions.push(this.innerHTML);
		});


		$.ajax({
			type: $(this).attr('method'),
			contentType: "application/json; charset=utf-8",
			url: $(this).attr('action'),
			data: JSON.stringify({name: name, questions: selectedQuestions}),
			dataType: "json",
			success: function (msg) {
				window.location.href = "/admin/feedback/form";
			},
			error: function (err){
				console.log(err)
			}
		});

	});
});
