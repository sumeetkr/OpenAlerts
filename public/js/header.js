/**
 * Created by joaodiogofalcao on 01/04/15.
 */
var appConfig = {
    baseURL: '/wea/api/',
    fetchingRate: 10000,
    phoneBook: [],
    alertBox: [],
    feedbackForms: [],
    phoneRefreshRate: 420 // 7min in seconds
};

$('.sidebar-toggler').click(function () {
    if ($('.sidebar-menu').is(":visible") === true) {
        $('#main-content').css({
            'margin-left': '25px'
        });
        $('#sidebar').css({
            'margin-left': '-475px'
        });
        $('.sidebar-menu').hide();
        $("#container").addClass("sidebar-closed");
        $('.sidebar-toggler').css({
            'background': '#e9ebec url("../img/open-drawer.png")'
        });
    } else {
        $('#main-content').css({
            'margin-left': '500px'
        });
        $('.sidebar-menu').show();
        $('#sidebar').css({
            'margin-left': '0'
        });
        $("#container").removeClass("sidebar-closed");
        $('.sidebar-toggler').css({
            'background': '#e9ebec url("../img/close-drawer.png")'
        });
    }
})

// Backbone Object
var BB = {
    init: function(args) {
        args();
    },
    skip: function(){
        return;
    }
};



