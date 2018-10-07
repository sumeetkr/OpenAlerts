BB.init(function () {
	BB.Phone = {};
	BB.Phone.Model = Backbone.Model.extend({
		url: function () {
			if (_.isUndefined(this.id))
				return appConfig.baseURL + 'phone';
			else
				return appConfig.baseURL + 'phone/' + encodeURIComponent(this.id);
		}
	});
	BB.Phone.Collection = Backbone.Collection.extend({
		model: BB.Phone.Model,
		url: function () {
			return appConfig.baseURL + 'phone';
		}
	});
	BB.Phone.View = Backbone.View.extend({
		initialize: function (args) {
			var self = this;
			self.infoWindowClose = true;
			setTimeout(function () {
				self.dropPin(args);
			}, 200);
		},
		render: function (args) {
			var self = args || this;
			self.infoWindow.getElement().popover('destroy');
			if (self.infoWindowClose) return;
			self.infoWindow.setPosition(ol.proj.transform([parseFloat(self.model.get('lng')), parseFloat(self.model.get('lat'))], 'EPSG:4326', 'EPSG:3857'));
			self.infoWindow.getElement().popover({
				'placement': 'top',
				'html': true,
				'content': $.tpl['popupWindow']({data: self.model.toJSON(), object: 'Phone'})
			})
				.popover('show');
			var popover = $('.popover');
			popover.css('top', (parseFloat(popover.css('top')) - 40) + 'px');
			return self;
		},
		dropPin: function (args) {
			var self = this;

			// First time
			this.$el.html($.tpl['popupWindow']({data: self.model.toJSON(), object: 'Phone'}));

			this.infoWindow = args.infoWindow;

			this.marker = new ol.Feature({
				geometry: new ol.geom.Point(ol.proj.transform([parseFloat(self.model.get('lng')), parseFloat(self.model.get('lat'))], 'EPSG:4326', 'EPSG:3857'))
			});

			this.marker.anchorParent = self;

			switch (self.model.get('status')) {
				case 'dead':
					self.marker.setStyle(iconPurplePin);
					break;
				case 'opened':
				case 'shown':
					self.marker.setStyle(iconYellowPin);
					break;
				case 'clicked':
					self.marker.setStyle(iconGreenPin);
					break;
				case 'discarded':
					self.marker.setStyle(iconGreyPin);
					break;
				case 'alive':
				default:
					self.marker.setStyle(iconRedPin);
			}

			PhonesVector.addFeature(this.marker);

			self.on('mouseover', function () {
				appConfig.previousMousemove = this;
				// Destroy info window before panning
				this.infoWindow.getElement().popover('destroy');
				this.infoWindowClose = false;
				self.render();
			}, self);
			self.on('mouseout', function () {
				if (!appConfig._stayOpen) {
					// Hide InfoWindow
					appConfig._stayOpen = false;
					// Close Window or Avoid opening if not yet opened but on the process of doing it
					this.infoWindowClose = true;
					this.infoWindow.getElement().popover('destroy');
				}
			}, self);
			self.on('click', function () {
				// Destroy info window before panning
				this.infoWindow.getElement().popover('destroy');

				// Toggle Keep Open
				//appConfig._stayOpen = true;
				this.infoWindowClose = false;
				self.render();
			}, self);
			// Model Events
			self.model.on('change', function () {
				switch (self.model.get('status')) {
					case 'dead':
						self.marker.setStyle(iconPurplePin);
						break;
					case 'opened':
					case 'shown':
						self.marker.setStyle(iconYellowPin);
						break;
					case 'clicked':
						self.marker.setStyle(iconGreenPin);
						break;
					case 'discarded':
						self.marker.setStyle(iconGreyPin);
						break;
					case 'alive':
					default:
						self.marker.setStyle(iconRedPin);
				}

				self.marker.setGeometry(new ol.geom.Point(ol.proj.transform([parseFloat(self.model.get('lng')), parseFloat(self.model.get('lat'))], 'EPSG:4326', 'EPSG:3857')));

				if (!self.infoWindowClose) {
					self.render();
				}

			});
		}
	});
});