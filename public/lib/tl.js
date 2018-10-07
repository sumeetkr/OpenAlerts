(function($){
	$(document).ready(function(){
		$.tpl = {};
		
		$('script.template').each(function(index){
			//console.log($(this).html());
			//console.log('------');
			
			//Load Templates from DOM
			$.tpl[$(this).attr('id')] = _.template($(this).html());
			
			// Remove Templates from DOM
			$(this).remove();
		});
	});
})(jQuery);