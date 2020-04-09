jQuery(function($) {
  console.log()
  $('.file .field').each(function(){
    console.log('file');
    $(this).change(function(e){
      console.log('change');
      var fileName = e.target.files[0].name,
          label = $(this).next('.label');
      label.html(fileName);
      label.addClass('original-text');
    });
  });
  $('.collapse').each(function() {
    console.log('collapse');
    $(this).click(function() {
      $(this).closest('.navbar').find('.nav').toggleClass('show', 500);
    });
  });
  $('#add-directions').click(function() {
    console.log('directions');
    var ind = $('#directions .field').length;
    $('#directions').append('<input class="field" id="direction-' + ind + '" type="text" name="direction-' + ind + '" placeholder="Add directions..."></div>');
  });
  $('#add-ingredient').click(function() {
    console.log('directions');
    var ind = $('#ingredients .field').length;
    $('#ingredients').append('<input class="field" id="direction-' + ind + '" type="text" name="ingredient-' + ind + '" placeholder="Add an ingredient..."></div>');
  });
})(jQuery);

// jQuery(function($) {
 
// })(jQuery);

// jQuery(function($) {

  
// })(jQuery);