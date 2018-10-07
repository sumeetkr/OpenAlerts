/**
 * Created by joaodiogofalcao on 01/04/15.
 */

$.fn.dataTable.ext.order['moment-data'] = function  ( settings, col )
{
    return this.api().column( col, {order:'index'} ).nodes().map( function ( td, i ) {
        if($(td).data().order)
            return $(td).data().order;
        else
            return $(td).html();
    } );
}

// Table
BB.init(function(){
    BB.Table = {};
    BB.Table.View = Backbone.View.extend({
        initialize: function(args){
            this.collection.on('add', this.newRow, this);
            this.type = args.type;
        },
        render: function(args) {
            this.columns = args.columns;
            this.$el.html($.tpl['table']({headers: args.headers}));

            var dataTableColumns = [];
            for(var i in this.columns){
                dataTableColumns.push({ "orderDataType": "moment-data" })
            }

            this.dataTable = this.$el.find('table').DataTable({
                "bPaginate": false,
                "language": {
                    "lengthMenu": "",
                    "zeroRecords": "Nothing found",
                    "info": "",
                    "infoEmpty": "",
                    "infoFiltered": ""
                },
                "columns": dataTableColumns
            });

            return this;
        },
        newRow: function(model){
            var rowView = new BB.Row.View({model: model, bindings: this.columns});
            var newRow = rowView.render().el;


            if(model.messages){
                $(newRow).click(function(){
                    appConfig.currentTrialView.coffin();
                    AlertVector.clear();
                    newTrialEvent(model);
                });

            }else{
                $('span#phoneCounter').html(parseInt($('span#phoneCounter').html(), 10) + 1);

                // Drop Pin
                model.phoneView = new BB.Phone.View({model: model, infoWindow: appConfig.infoWindow});



                // Row Events
                $(newRow).hover(function(){
                        // Center map on chosen phone And Callback to render info window
                        appConfig.map.panTo({lng: model.phoneView.model.get('lng'), lat: model.phoneView.model.get('lat')}, 200, model.phoneView.render, model.phoneView);

                        model.phoneView.trigger('mouseover', model.phoneView);
                    },
                    function(){
                        model.phoneView.trigger('mouseout', model.phoneView);
                    })
                    .click(function(){
                        model.phoneView.trigger('click', model.phoneView);

                        // Center map on chosen phone And Callback to render info window
                        appConfig.map.panTo({lng: model.phoneView.model.get('lng'), lat: model.phoneView.model.get('lat')}, 200, model.phoneView.render, model.phoneView);
                    });
                /////////////////////////


            }




                // Table Events
                this.dataTable.row.add(newRow);
                this.$el.find('.sorting:eq(0)').click();
                ///////////////////////


        }
    });
    BB.Row = {};
    BB.Row.View = Backbone.View.extend({
        tagName: 'tr',
        initialize: function(args){
            this.nestedBindings = _.clone(args.bindings, true);
            this.bindings = {};

            for(var i in args.bindings){
                if(this.model.get(args.bindings[i])){
                    var key = 'td#' + args.bindings[i] + '-' + this.model.get('id');
                    this.bindings[key] = args.bindings[i];
                }
            }
        },
        render: function(){
            var htmlOutput = '';
            for(var i in this.nestedBindings){
                if(this.nestedBindings[i] == 'onset' || this.nestedBindings[i] == 'expires')
                    htmlOutput += '<td class="timeFromNow" id="'+this.nestedBindings[i]+'-'+this.model.get('id')+'" data-timestamp="';
                else
                    htmlOutput += '<td id="'+this.nestedBindings[i]+'-'+this.model.get('id')+'">';

                // Get the proper nested bindings
                if(typeof this.model.attributes[this.nestedBindings[i]] == "undefined"){

                    if( this.model.messages.at(0).get(this.nestedBindings[i]) ){
                        //Listen to change!
                        this.model.messages.at(0).on('change', this.rowUpdate, this );
                        htmlOutput += this.model.messages.at(0).get(this.nestedBindings[i]);

                    }else if( this.model.messages.at(0).info.at(0).get(this.nestedBindings[i]) ){
                        // Listen to change
                        this.model.messages.at(0).info.at(0).on('change', this.rowUpdate, this );
                        if(this.nestedBindings[i] == 'onset' || this.nestedBindings[i] == 'expires') {
                            htmlOutput += this.model.messages.at(0).info.at(0).get(this.nestedBindings[i]) + '" ';
                            htmlOutput += 'data-order="'+ (new Date(this.model.messages.at(0).info.at(0).get(this.nestedBindings[i]))).getTime() + '">';
                            htmlOutput += moment(this.model.messages.at(0).info.at(0).get(this.nestedBindings[i])).fromNow();
                        }else
                            htmlOutput += this.model.messages.at(0).info.at(0).get(this.nestedBindings[i]);

                    }else if( this.model.messages.at(0).parameter.get(this.nestedBindings[i]) ){
                        // Listen to change
                        this.model.messages.at(0).parameter.on('change', this.rowUpdate, this );
                        htmlOutput += this.model.messages.at(0).parameter.get(this.nestedBindings[i]);

                    }
                }
                htmlOutput += '</td>';

            }
            this.$el.html(htmlOutput);

            this.stickit();

            return this;
        },

        rowUpdate: function(model){
            for(var i in this.nestedBindings){
                var elem = $('td#'+this.nestedBindings[i]+'-'+this.model.get('id'));


                // Get the proper nested bindings
                if(!this.model.get(this.nestedBindings[i])){

                    if( this.model.messages.at(0).get(this.nestedBindings[i]) ){
                        elem.html(this.model.messages.at(0).get(this.nestedBindings[i]));

                    }else if( this.model.messages.at(0).info.at(0).get(this.nestedBindings[i]) ){
                        if(this.nestedBindings[i] == 'onset' || this.nestedBindings[i] == 'expires') {
                            elem.data('timestamp', this.model.messages.at(0).info.at(0).get(this.nestedBindings[i]));
                            elem.data('order', (new Date(this.model.messages.at(0).info.at(0).get(this.nestedBindings[i]))).getTime());
                            elem.html(moment(this.model.messages.at(0).info.at(0).get(this.nestedBindings[i])).fromNow());
                        }else
                            elem.html(this.model.messages.at(0).info.at(0).get(this.nestedBindings[i]));



                    }else if( this.model.messages.at(0).parameter.get(this.nestedBindings[i]) ){
                        elem.html(this.model.messages.at(0).parameter.get(this.nestedBindings[i]));
                    }
                }

            }

        }
    });
});
