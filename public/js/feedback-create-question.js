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



	$('#submit').click(function(event) {
		event.preventDefault() ;
		var data = $('#form').serializeObject() ;
		data.options = JSON.stringify(data.options)
		data.mandatory = $('#question-mandatory').prop('checked') ;

		$.ajax({
			type: 'POST',
			url: '/admin/feedback/question',
			data: data,
			dataType: 'json',
		}).done(function() {
			document.location.href = '../';
	  })
	  .fail(function() {
	    alert( "error" );
	  })
	});
});
