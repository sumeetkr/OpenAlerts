$().ready(function () {
	$('#question-type').change(function () {
		if ($(this).val() === 'SINGLE' || $(this).val() == 'MULTIPLE') {
			$('#options-input').show();
		} else {
			$('#options-input').hide();
		}
	});

	$('.new-option').click(function () {
		var $new = $('.option').first().clone();
		$new.find('input').val('');
		$new.append($('<a class="glyphicon glyphicon-remove" href="#"/>').click(function (e) {
			e.preventDefault();
			$(this).closest('.option').remove();
		}));

		$new.insertBefore('.new-option');
		$new.find('input').focus();
	});



	$("#question-title").val(question.title)
	$("#question-help-text").val(question.text)
	$('#question-mandatory').prop('checked', question.mandatory)
	$('#question-type option[value=' + question.type + ']').prop('selected', true)
	$('#question-type').change()
	//--------------------------
	if (question.type === 'SINGLE' || question.type == 'MULTIPLE') {
		var options=JSON.parse(question.options)
		for(var i = 0 ; i < options.length ; i++){
			var $new = $('.option').first().clone()
			$new.find('input').val(options[i])
			$new.append($('<a class="glyphicon glyphicon-remove" href="#"/>').click(function (e) {
				e.preventDefault();
				$(this).closest('.option').remove()
			}));

			$new.insertBefore('.new-option')
			$new.find('input').focus()
		}
		$('.option').first().remove()
	}

	$('#submit').click(function(event) {
		event.preventDefault() ;
		var data = $('#form').serializeObject() ;
		data.options = JSON.stringify(data.options)
		data.mandatory = $('#question-mandatory').prop('checked') ;

		$.ajax({
			type: 'PUT',
			url: '/admin/feedback/question',
			data: JSON.stringify(data),
			contentType: "application/json; charset=utf-8",
			dataType: "json"
		}).done(function() {
			document.location.href = '../';
		})
		.fail(function() {
			alert( "error" );
		})
	});
});
