BB.init(function(){
    BB.InfoWindow = {};
    BB.InfoWindow.View = Backbone.View.extend({
        events: {
            'click .tabs a': 'tabBehaviour',
            'click #minimize': 'toggleMinimize'
        },
        initialize: function(){},
        render: function(){
            this.$el.html($.tpl['infoWindow']({}));

            new BB.Table.View({el: this.$el.find('#alert_table'), collection: Trial})
                .render({headers: ['ID', 'Schedule', 'Headline'], columns: ['id', 'onset', 'headline']});
            new BB.Table.View({el: this.$el.find('#phone_table'), collection: Phones})
                .render({headers: ['ID', 'Lat', 'Lng'], columns: ['id', 'lat', 'lng']});

        },
        resizeTabs: function(){
            var parentSize = parseInt(this.$el.find('.tabs').css('width'), 10);
            var tabSize = (parentSize/2)-1;
            this.$el.find('.tabs a').each(function(){
                $(this).css('width', tabSize);
            });

        },
        toggleMinimize: function(ev){
            $(ev.currentTarget).parents('#panel').toggleClass('open');
            this.resizeTabs();

        },
        tabBehaviour: function(ev){
            var target = ev.currentTarget;
            var dataNav = $(target).data().nav;
            // Switch Tab
            $(target).addClass('active').siblings('a').removeClass('active');
            $('.' + dataNav + '-nav').addClass('active').siblings('.nav').removeClass('active');
            $('.sorting:eq(0)').click();

        }

    });
});

$(document).ready(function(){
    new BB.InfoWindow.View({el: '#panel'}).render();
});

