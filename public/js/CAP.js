/**
 * Created by joaodiogofalcao on 01/04/15.
 */


var newTrialEvent = function(model){
    model = model || new BB.Trial.Model();
    appConfig.currentTrialView = new BB.Trial.ModelView({model: model});
    $('.sidebar-menu').append(appConfig.currentTrialView.render().el);

    // Enable DateTimePickers
    $('#alertEndingAt').datetimepicker();
    // Default 30 min on Ending At
    $('#alertScheduledFor').datetimepicker()
/*        .change(function(ev){
            if($(ev.currentTarget).val() != ""){
                var defaultdatetime = (new Date($(ev.currentTarget).val()));

                defaultdatetime.setMinutes(defaultdatetime.getMinutes() + 30);
                $(ev.currentTarget).parents('.control-group').next().find('#alertEndingAt')
                    .val(defaultdatetime.getFullYear() + '-' + (defaultdatetime.getMonth()+1) + '-' + defaultdatetime.getDate() + ' ' + defaultdatetime.getHours() + ':' + defaultdatetime.getMinutes()+ ':' + defaultdatetime.getSeconds())
                    .change();
            }

        });*/
    // Force Only to choose days
    $('li.picker-switch').remove();
    /////////////////////////


}


BB.init(function(){

    BB.Form = {};
    BB.Form.Model = Backbone.Model.extend({});
    BB.Form.Collection = Backbone.Collection.extend({
        model: BB.Form.Model,
        url: '/wea/api/forms'
    });



    appConfig.feedbackForms = new BB.Form.Collection();


    BB.Incident = {};
    BB.Incident.Model = Backbone.Model.extend({});
    BB.Incident.Collection = Backbone.Collection.extend({
        model: BB.Incident.Model,
        url: '/wea/api/incidents'
    });


    appConfig.incidents = new BB.Incident.Collection();


    BB.Area = {};
    BB.Area.Model = Backbone.Model.extend({
        initialize: function(){
            this.polygonView = new BB.Area.PolygonView({model: this});
        },
        validate: function(){
            return;
        },
        defaults:{
            polygon: []
        },
        clone: function(){
            var newModel = new BB.Area.Model();
            newModel.attributes.polygon = _.clone(this.attributes.polygon,true);
            return newModel;
        }
    });
    BB.Area.Collection = Backbone.Collection.extend({
        model: BB.Area.Model,
        clone: function(){
            var clonedModels = [];
            this.each(function(model){
                clonedModels.push(model.clone());
            });
            return new BB.Area.Collection(clonedModels);
        }
    });
    BB.Area.ModelView = Backbone.View.extend({
        initialize: function(){
            this.model.on('error', this.error);
        },
        events:{
            'click #drawPolygon': 'newPolygon',
            'click #removePolygon': 'removePolygon'
        },
        render: function(){
            this.model.areaView = this;

            this.polygonView = this.model.polygonView = new BB.Area.PolygonView({model: this.model}).render();

            this.stickit();

            return this;
        },
        newPolygon: function () {
            if(!appConfig.draw){
                this.model.set('polygon', []);
                AlertVector.clear();
                appConfig.drawing = new ol.interaction.Draw({
                    source: AlertVector,
                    type: 'Polygon'/** @type {ol.geom.GeometryType} (value)*/
                });
                appConfig.map.addInteraction(appConfig.drawing);
                appConfig.draw = this;
            }else{
                appConfig.map.removeInteraction(appConfig.drawing);
                appConfig.draw = false;
            }
            if(appConfig.drawing.off)
                appConfig.drawing.off('drawend');
            appConfig.drawing.on('drawend', function(){
                this.$el.find('#drawPolygon').click();
                this.polygonView.render();

            }, this);
        },
        removePolygon: function(){
            this.model.set('polygon', []);

            delete this.polygonView.polygon
            AlertVector.clear();
        },
        addPaths: function (args) {
            this.model.attributes.polygon.push({lng: args[0], lat: args[1]});
        }
    });
    BB.Area.PolygonView = Backbone.View.extend({
        render: function() {

            // Polygon Stuff
            var paths = _.clone(this.model.attributes.polygon, true);
            var center = {lat: 0.0, lng: 0.0};

            if(paths.length && !this.polygon){
                // Check if its a Circle
                if(paths.length == 2){
                    for(var i in paths){
                        delete paths[i].id;

                        if(paths[i].lat == 'radius') {
                            this.radius = parseFloat(paths[i].lng)*1000;  // TODO: find out CapCreator Radius Units

                        }
                        else{
                            center.lat = parseFloat(paths[i].lat);
                            center.lng = parseFloat(paths[i].lng);
                        }
                    }

                    this.polygon = new ol.Feature({
                        geometry: new ol.geom.Circle(ol.proj.transform([parseFloat(center.lng), parseFloat(center.lat)], 'EPSG:4326', 'EPSG:3857'))
                    });
                    AlertVector.addFeature(this.polygon);

                    center.lat += Math.abs(this.radius / 1000); // TODO: Find convertion between CapCreator Units to Google Maps Units (meters on the surface)
                    this.center = center;

                    // Then it is a Polygon
                }else{
                    for(var i in paths){
                        delete paths[i].id;

                        // Get Highest Latitude peek of polygon for window presentation
                        if(Math.abs(center.lat) < Math.abs(paths[i].lat)) {
                            center.lng = paths[i].lng;
                            center.lat = paths[i].lat;
                        }

                        paths[i] = ol.proj.transform([parseFloat(paths[i].lng), parseFloat(paths[i].lat)], 'EPSG:4326', 'EPSG:3857');


                    }

                    this.center = center;

                    this.polygon = new ol.Feature({
                        geometry: new ol.geom.Polygon([paths])
                    });

                    this.polygon.setStyle(invisibleAlert);

                }
            }
            /////////////////

            // Clear Features
            AlertVector.clear();

            if(this.polygon) {
                AlertVector.addFeature(this.polygon);
                appConfig.map.panTo(this.center, 200, self.render, self);
            }

            return this;
        }
    });

    BB.Parameter = {};
    BB.Parameter.Model = Backbone.Model.extend({
        defaults:{
            isPhoneExpectedToVibrate: true,
            isAlertActive: true,
            feedbackForm: 1,
            campus: 'sv',
            isContextAware: false
        },
        validate: function(attrs){
            if (attrs.isHistoryBasedFiltering || attrs.isMotionPredictionBasedFiltering) {
                return 'isGeoFiltering should be enabled!'
            }
            return;
        }
    });
    BB.Parameter.View = Backbone.View.extend({
        initialize: function(){
            this.on('error', this.error);
        },
        bindings:{
            'input#alertMapOption': 'isMapToBeShown',
            'input#alertVibrateOption': 'isPhoneExpectedToVibrate',
            'input#alertAudioOption': 'isTextToSpeechExpected',
            'input#alertActive': 'isAlertActive',
            'input#alertGeoFilterOption': 'geoFiltering',
            'input#alertContextAwareOption': 'isContextAware',
            'input#alertScenarioId': 'scenarioId',
            'input#alertHistoryBasedFiltering': 'historyBasedFiltering',
            'input#alertMotionPredictionBasedFiltering' : 'motionPredictionBasedFiltering',
            'select#alertFeedbackForm': {
                observe: 'feedbackForm',
                selectOptions: {
                    collection: function() {
                        var result = [];
                        for(var i=0; i < appConfig.feedbackForms.models.length; i++){
                            result.push({value: appConfig.feedbackForms.models[i].get('id'), label: appConfig.feedbackForms.models[i].get('name')});
                        }
                        return result;
                    },
                    defaultOption: {
                        label: 'Default Form',
                        value: 1
                    }
                }
            },
            'select#eventType': {
                observe: 'testedType',
                selectOptions: {
                    collection: function() {
                        return [{value: 'Amber', label: 'Amber'}, {value:'Presidential', label:'Presidential'}, {value:'Follow-up', label:'Follow-up'}];
                    },
                    defaultOption: {
                        label: 'Emergency',
                        value: 'Emergency'
                    }
                }
            },
            'select#campus': {
                observe: 'campus',
                selectOptions: {
                    collection: function() {
                        return [{value:'pa', label:'Pittsburgh'}];
                    },
                    defaultOption: {value:'sv', label:'Silicon Valley'}
                }
            }
        },
        render: function(){
            this.stickit();
            return this;
        }
    });

    BB.Info = {};
    BB.Info.Model = Backbone.Model.extend({
        defaults:{
            responseType: 'Shelter',
            urgency: 'Immediate',
            severity: 'Extreme',
            eventType: 'Emergency',
            eventCategory: 'Env'
        },
        subCollection: {
            areas: BB.Area.Collection
        },
        initialize: function(){
            this.areas = this.areas || new BB.Area.Collection([new BB.Area.Model()]);
        },
        parse: function(response, options) {
            if ( options.saved ) return this.attributes;
            for(var key in this.subCollection)
            {
                var embeddedClass = this.subCollection[key];
                var embeddedData = response[key];
                if(this[key]) this[key].add(embeddedData);
                else this[key] = new embeddedClass(embeddedData, {parse:true});
                delete response[key];
            }
            return response;
        },
        toJSON: function(options){
            var expandedJSON = _.clone(this.attributes);
            expandedJSON.areas = [];
            this.areas.each(function(item, index){
                expandedJSON.areas.push(item.toJSON());
            });

            return expandedJSON;
        },
        validate: function(attrs) {
            if (!attrs.onset || new Date(attrs.onset) == 'Invalid Date') {
                return 'Invalid "Scheduled For" Date/Time!'
            }
            if (!attrs.expires || new Date(attrs.expires) == 'Invalid Date') {
                return 'Invalid "Ending At" Date/Time!'
            }
            if (!attrs.headline || attrs.headline == "" || attrs.headline == " ") {
                return 'Headline is Mandatory!'
            }

            var validation = null;
            this.areas.each(function(item, index){
                validation = item.validate(item.attributes);
            });

            return validation;
        },
        clone: function(){
            var temp = Backbone.Model.prototype.clone.call(this);
            temp.areas = this.areas.clone();
            return temp;
        }
    });
    BB.Info.Collection = Backbone.Collection.extend({
        model: BB.Info.Model,
        clone: function(){
            var clonedModels = [];
            this.each(function(model){
                clonedModels.push(model.clone());
            });
            return new BB.Info.Collection(clonedModels);
        }
    });
    BB.Info.ModelView = Backbone.View.extend({
        initialize: function(){
            this.model.on('error', this.error);
        },
        bindings: {
            'select#alertCategory': {
                observe: 'eventCategory',
                selectOptions: {
                    collection: function() {
                        return [{value:'Met', label:'Met'}, {value:'Safety', label:'Safety'}, {value:'Transport', label:'Transport'},  {value:'Security', label:'Security'}, {value:'Rescue', label:'Rescue'}, {value:'Fire', label:'Fire'}, {value:'Health', label:'Health'}];
                    },
                    defaultOption: {value:'Env', label:'Environment'}
                }
            },
            '#alertText': 'eventDescription',
            '#alertScheduledFor': {
                observe: 'onset',
                onGet: 'forceDateToLocal',
                onSet: 'forceUTCFormat'
            },
            '#alertEndingAt': {
                observe: 'expires',
                onGet: 'forceDateToLocalEnding',
                onSet: 'forceUTCFormat'
            },
            'select#responseType': {
                observe: 'responseType',
                selectOptions: {
                    collection: function() {
                        return [{value:'Evacuate', label:'Evacuate'}, {value:'Prepare', label:'Prepare'}, {value:'Execute', label:'Execute'}, {value:'Avoid', label:'Avoid'},  {value:'Assess', label:'Assess'}, {value:'AllClear', label:'All Clear'}, {value:'None', label:'None'}];
                    },
                    defaultOption: {
                        label: 'Shelter',
                        value: 'Shelter'
                    }
                }
            },
            'select#urgencyType': {
                observe: 'urgency',
                selectOptions: {
                    collection: function() {
                        return [{value:'Expected', label:'Expected'}, {value:'Future', label:'Future'}, {value:'Past', label:'Past'}];
                    },
                    defaultOption: {
                        label: 'Immediate',
                        value: 'Immediate'
                    }
                }
            },
            'select#severityType': {
                observe: 'severity',
                selectOptions: {
                    collection: function() {
                        return [{value:'Severe', label:'Severe'}, {value:'Moderate', label:'Moderate'}, {value:'Minor', label:'Minor'}];
                    },
                    defaultOption: {
                        label: 'Extreme',
                        value: 'Extreme'
                    }
                }
            },
            '#alertInstruction': 'instruction',
            '#alertContact': 'contact',
            '#alertHeadline': 'headline',
            'select#eventType': {
                observe: 'eventType',
                selectOptions: {
                    collection: function() {
                        return [{value:'Amber', label:'Amber'}, {value:'Presidential', label:'Presidential'}, {value:'Follow-up', label:'Follow-up'}];
                    },
                    defaultOption: {
                        label: 'Emergency',
                        value: 'Emergency'
                    }
                }
            }

        },
        render: function(){

            this.model.areas.each(function(item, index){
                new BB.Area.ModelView({el: this.$el, model: item}).render();
            }, this);
            this.stickit();

            return this;
        },
        forceDateToLocal: function (args) {
            if(!args) return args;
            var datetime = (new Date(args));

            return datetime.getFullYear() + '-' + (datetime.getMonth()+1) + '-' + datetime.getDate() + ' ' + datetime.getHours() + ':' + datetime.getMinutes()+ ':' + datetime.getSeconds();
        },
        forceDateToLocalEnding: function (args) {
            if(!args) return args;
            var datetime = (new Date(args));


            return datetime.getFullYear() + '-' + (datetime.getMonth()+1) + '-' + datetime.getDate() + ' ' + datetime.getHours() + ':' + datetime.getMinutes()+ ':' + datetime.getSeconds();
        },
        forceUTCFormat: function (args) {
            if(!args) return args;
            var datetime = (new Date(args)).toJSON();

            return datetime;
        }
    });

    BB.Message = {};
    BB.Message.Model = Backbone.Model.extend({
        defaults:{
            incidentId: 0,
            messageType: 'Alert',
            scope: 'Public',
            status: 'Exercise'
        },
        subCollection: {
            info: BB.Info.Collection,
            parameter: BB.Parameter.Model
        },
        initialize: function(){
            this.info = this.info || new BB.Info.Collection([new BB.Info.Model()]);
            this.parameter = this.parameter || new BB.Parameter.Model();
        },
        parse: function(response, options) {
            if ( options.saved ) return this.attributes;
            for(var key in this.subCollection)
            {
                var embeddedClass = this.subCollection[key];
                var embeddedData = response[key];
                    if (this[key]) {
                        if(key != "parameter")
                            this[key].add(embeddedData);
                    }else this[key] = new embeddedClass(embeddedData, {parse: true});

                delete response[key];
            }
            return response;
        },
        toJSON: function(options){
            var expandedJSON = _.clone(this.attributes);
            expandedJSON.info = [];
            this.info.each(function(item, index){
                expandedJSON.info.push(item.toJSON());
            });
            expandedJSON.parameter= this.parameter.toJSON();

            return expandedJSON;
        },
        validate: function(attrs){
            var validation = null;
            this.info.each(function(item, index){
                validation = item.validate(item.attributes);
            });
            if(!validation)
                validation = this.parameter.validate(this.parameter.attributes);
            return validation;
        },
        clone: function(){

            var temp = Backbone.Model.prototype.clone.call(this);
            temp.info = this.info.clone();
            temp.parameter = this.parameter.clone();
            return temp;
        }
    });
    BB.Message.Collection = Backbone.Collection.extend({
        model: BB.Message.Model
    });
    BB.Message.ModelView = Backbone.View.extend({
        initialize: function(){
            var self = this;
            this.model.on('error', self.error);
            appConfig.draw = false;
        },
        bindings:{
            'select#incidentID': {
                observe: 'incidentId',
                selectOptions: {
                    collection: function() {
                        var result = [];
                        for(var i=0; i < appConfig.incidents.models.length; i++){
                            result.push({value: appConfig.incidents.models[i].get('id'), label: appConfig.incidents.models[i].get('id')});
                        }
                        return result;
                    },
                    defaultOption: {
                        label: 'No Incident ID',
                        value: 0
                    }
                }
            },
            '#messageID': {
                'observe': 'id',
                'onGet': 'removeHighlightedRow'
            },
            'select#messageType': {
                observe: 'messageType',
                selectOptions: {
                    collection: function() {
                        return [{value:'Alert', label:'Alert'}, {value:'Update', label:'Update'}];
                    },
                    defaultOption: {
                        label: 'Alert',
                        value: 'Alert'
                    }
                }
            },
            'select#alertScope': {
                observe: 'scope',
                selectOptions: {
                    collection: function() {
                        return [{value:'Restricted', label:'Restricted'}, {value:'Private', label:'Private'}];
                    },
                    defaultOption: {
                        label: 'Public',
                        value: 'Public'
                    }
                }
            },
            'select#alertStatus': {
                observe: 'status',
                selectOptions: {
                    collection: function() {
                        return [{value:'Actual', label:'Actual'}, {value:'System', label:'Question Probe'}];
                    },
                    defaultOption: {
                        label: 'Exercise',
                        value: 'Exercise'
                    }
                }
            }
        },
        render: function(){
            this.$el.html($.tpl['newAlert']({}));

            this.model.info.each(function(item, index){
                new BB.Info.ModelView({el: this.$el, model: item}).render();
            }, this);

            new BB.Parameter.View({el: this.$el, model: this.model.parameter}).render();

            this.stickit();

            return this;

        },
        removeHighlightedRow: function(args){
            // TODOODODODODOODODODODOOD
            if(typeof args == "undefined") {
                $('#alert_table tr').removeClass('highlight')
            }
            return args;
        }

    });

    BB.Trial = {};
    BB.Trial.Model = Backbone.Model.extend({
        subCollection: {
            messages: BB.Message.Collection
        },
        url: function() {
            if(_.isUndefined(this.id))
                return appConfig.baseURL + 'trialevent';
            else
                return appConfig.baseURL + 'trialevent/' + encodeURIComponent(this.id);
        },
        initialize: function(){
            this.messages = this.messages || new BB.Message.Collection([new BB.Message.Model()]);
            this.on('invalid', function(model, error){
                alert(error);
            });
        },
        parse: function(response, options) {
            if ( options.saved ) return this.attributes;
            for(var key in this.subCollection)
            {
                var embeddedClass = this.subCollection[key];
                var embeddedData = response[key];
                if(this[key]) this[key].add(embeddedData);
                else this[key] = new embeddedClass(embeddedData, {parse:true});
                delete response[key];
            }
            return response;
        },
        toJSON: function(options){
            var expandedJSON = _.clone(this.attributes);
            expandedJSON.messages = [];
            this.messages.each(function(message, index){
                expandedJSON.messages.push(message.toJSON());
            });
            return expandedJSON;
        },
        validate: function(attrs){
            var validation = null;
            this.messages.each(function(message, index){
                validation = message.validate(message.attributes);
                if(validation) validation = "Group " + index + ": " + validation;
            });
            return validation;
        },
        warn: function(){
            var now = new Date();
            var endingAt = new Date(this.messages.at(0).info.at(0).get('expires'));

            // Ending in ...
            $('#alertTimer p').html('Alert ending ' + moment(endingAt).fromNow());

            // Show ALert Icon
            $('.banner.active-alert')
                .addClass('warning')
                .children('p').html(this.messages.at(0).info.at(0).get('eventType')+' Alert - ID: '+this.get('id')+'<br>'+this.messages.at(0).info.at(0).get('headline'));

            // Turn Warning polygon visible and red
            if(this.messages.at(0).info.at(0).areas.length  && this.messages.at(0).info.at(0).areas.at(0).polygonView.render() && this.messages.at(0).info.at(0).areas.at(0).polygonView.polygon){
                this.messages.at(0).info.at(0).areas.at(0).polygonView.polygon.setStyle(warnAlert);
            }


            if(endingAt - now < 2147483647){ // Maximum setTimeout 32 bit delay var
                setTimeout(function(){
                    // Hide Alert Icon
                    $('.banner.active-alert')
                        .removeClass('warning')
                        .children('p').html('Tracking ...');

                    // Turn Warning polygon invisible and yellow
                    // Hide Feature
                    AlertVector.clear();
                    self.polygon.setStyle(visibleAlert);

                }, ( endingAt - now) > 0 ? endingAt - now : 1);
            }
    }
    });
    BB.Trial.ModelView = Backbone.View.extend({
        tagName: 'div',
        className: 'row-fluid',
        initialize: function(){
            var self = this;
            this.model.on('error', self.error, this);
            this.model.on('sync', self.saved, this);
        },
        events: {
            'click .tabs.message a': 'tabBehaviour',
            'click #cancelAlert': 'cancel',
            'click #sendAlert': 'saveTrial'
        },
        render: function(){
            // Create Tabs Header
            this.tabs_header = $('<div class="tabs message"></div>');
            this.tabs_content = $('<div class="tab-content"></div>');
            //////////////////////

            // Iterate through messages and append content to tabs content bin
            this.model.messages.each(function(message, index){
                var contentContainer = $('<div class="nav message' + index + '-nav"></div>');
                this.tabs_header.append('<a href="#", data-nav="message'+index+'"> Group '+index+'</a>');
                this.tabs_content.append(contentContainer);
                new BB.Message.ModelView({el: contentContainer, model: message}).render();
            }, this);
            ////////////////////////////////////////////////////////////////////





            // Make first Tab Active
            this.tabs_header.children().last().addClass('active');
            this.tabs_content.children().last().addClass('active');
            /////////////////////////

            // Adds plus button to add tabs
            this.tabs_header.append('<a href="#" data-nav="add"> + </a>');
            ///////////////////////////////

            // Resizes Tabs According to number
            this.resizeTabs();
            ///////////////////////////////////

            // Clean View and Append new Stuff
            this.$el.html('');
            this.$el.append(this.tabs_header)
                .append(this.tabs_content);
            //////////////////////////////////


            return this;
        },
        tabBehaviour: function(ev){
            var target = ev.currentTarget;
            var dataNav = $(target).data().nav;
            if(dataNav != "add") {
                // Switch Tab
                var dummy = $(target).html().split(' ');
                var index = parseInt(dummy[2],10);
                $(target).addClass('active').siblings('a').removeClass('active');
                $('.' + dataNav + '-nav').addClass('active').siblings('.nav').removeClass('active');
                // Show polygon if present
                this.model.messages.at(index).info.at(0).areas.at(0).areaView.render();
            }else{
                var index = this.model.messages.length;

                // Remove +
                this.tabs_header.children().last().remove();
                // Add Tab
                var contentContainer = $('<div class="nav message' + index + '-nav"></div>');
                this.tabs_header.append('<a href="#", data-nav="message'+index+'"> Group '+index+'</a>');
                this.tabs_content.append(contentContainer);
                var newMessage = this.model.messages.at(0).clone();
                this.model.messages.add(newMessage);
                new BB.Message.ModelView({el: contentContainer, model: newMessage}).render();

                // Add +
                this.tabs_header.append('<a href="#" data-nav="add"> + </a>');

                this.resizeTabs();

                // Enable DateTimePickers
                contentContainer.find('#alertEndingAt').datetimepicker();
                // Default 30 min on Ending At
                contentContainer.find('#alertScheduledFor').datetimepicker()
                    .change(function(ev){
                        if($(ev.currentTarget).val() != ""){
                            var defaultdatetime = (new Date($(ev.currentTarget).val()));

                            defaultdatetime.setMinutes(defaultdatetime.getMinutes() + 30);
                            $(ev.currentTarget).parents('.control-group').next().find('#alertEndingAt')
                                .val(defaultdatetime.getFullYear() + '-' + (defaultdatetime.getMonth()+1) + '-' + defaultdatetime.getDate() + ' ' + defaultdatetime.getHours() + ':' + defaultdatetime.getMinutes()+ ':' + defaultdatetime.getSeconds())
                                .change();
                        }

                    });
                // Force Only to choose days
                $('li.picker-switch').remove();
                /////////////////////////

            }
        },
        resizeTabs: function(){
            var tabSize = (472/(this.tabs_header.children().length))-1;
            this.tabs_header.children().each(function(){
                $(this).css('width', tabSize);
            });

        },
        cancel: function(){
            this.coffin();
            AlertVector.clear();
            newTrialEvent();
        },
        saveTrial: function(){
            $('input#alertScheduledFor').trigger('change');
            $('input#alertEndingAt').trigger('change');
            this.model.save(null, { saved: true });
        },
        saved: function(){
            alert('Success: Model Saved!');
            $('input#alertScheduledFor').trigger('change');
            $('input#alertEndingAt').trigger('change');
            this.cancel();
        },
        error: function(err){
            alert('Error on Trial Event. (Check logs)');
            console.log('Error on Trial Event');
            console.log(err);
        },
        coffin: function(){
            this.unbind(); // Unbind all local event bindings


            this.remove(); // Remove view from DOM

            delete this.$el; // Delete the jQuery wrapped object variable
            delete this.el; // Delete the variable reference to this node

        }

    });
    BB.Trial.Collection = Backbone.Collection.extend({
        model: BB.Trial.Model,
        url: function(){
            return appConfig.baseURL + 'trialevent';
        }
    });


});


$(document).ready(function(){
    appConfig.feedbackForms.fetch()
        .success(function(){
            appConfig.incidents.fetch()
                .success(function(){
                    newTrialEvent();
                })
                .error(function(err){console.log(err);});
        })
        .error(function(err){console.log(err);});



});
