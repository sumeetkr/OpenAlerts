/**
 * Created by joaodiogofalcao on 01/04/15.
 */
goog.require('ol.Map');
goog.require('ol.View');
goog.require('ol.interaction');
goog.require('ol.interaction.Draw');
goog.require('ol.layer.Tile');
goog.require('ol.layer.Vector');
goog.require('ol.source.MapQuest');
goog.require('ol.source.Vector');
goog.require('ol.style.Circle');
goog.require('ol.style.Fill');
goog.require('ol.style.Stroke');
goog.require('ol.style.Style');
goog.require('ol.proj');
goog.require('ol.coordinate');

ol.Map.prototype.panTo = function(pos, speed, callback, cb_args){

    if(!pos || !pos.lng || !pos.lat) {console.error('Missing Latitude and Longitude in PanTo function');return;}

    pos = ol.proj.transform([parseFloat(pos.lng), parseFloat(pos.lat)], 'EPSG:4326', 'EPSG:3857');

    var pan = ol.animation.pan({
        duration: speed,
        source: appConfig.map.getView().getCenter()
    });
    this.beforeRender(function(map, frameState) {
        var stillAnimating = pan(map, frameState);
        if (!stillAnimating) {
            callback && callback(cb_args);
        }
        return stillAnimating;
    });
    this.getView().setCenter(pos);
};

var OSMTiles = new ol.layer.Tile({
    source: new ol.source.OSM()
});
var AlertVector = new ol.source.Vector({});
var AlertLayer = new ol.layer.Vector({
    source: AlertVector
});

var iconRedPin = new ol.style.Style({
    image: new ol.style.Icon(({
        anchor: [0.5, 80],
        anchorXUnits: 'fraction',
        anchorYUnits: 'pixels',
        opacity: 1,
        src: 'mapfiles/api-3/images/spotlight-poi-red.png',
        scale: 0.5
    }))
});
var iconGreenPin = new ol.style.Style({
    image: new ol.style.Icon(({
        anchor: [0.5, 80],
        anchorXUnits: 'fraction',
        anchorYUnits: 'pixels',
        opacity: 1,
        src: 'mapfiles/api-3/images/spotlight-poi-green.png',
        scale: 0.5
    }))
});
var iconYellowPin = new ol.style.Style({
    image: new ol.style.Icon(({
        anchor: [0.5, 80],
        anchorXUnits: 'fraction',
        anchorYUnits: 'pixels',
        opacity: 1,
        src: 'mapfiles/api-3/images/spotlight-poi-yellow.png',
        scale: 0.5
    }))
});
var iconPurplePin = new ol.style.Style({
    image: new ol.style.Icon(({
        anchor: [0.5, 80],
        anchorXUnits: 'fraction',
        anchorYUnits: 'pixels',
        opacity: 1,
        src: 'mapfiles/api-3/images/spotlight-poi-purple.png',
        scale: 0.5
    }))
});
var iconGreyPin = new ol.style.Style({
    image: new ol.style.Icon(({
        anchor: [0.5, 80],
        anchorXUnits: 'fraction',
        anchorYUnits: 'pixels',
        opacity: 1,
        src: 'mapfiles/api-3/images/spotlight-poi-grey.png',
        scale: 0.5
    }))
});
var invisibleAlert = new ol.style.Style({
    fill: new ol.style.Fill({
        color: 'rgba(255, 255, 255, 0.8)' //Fill Color
    }),
    stroke: new ol.style.Stroke({
        color: '#ffcc33', // Stroke Coloer
        width: 5
    }),
    image: new ol.style.Circle({
        radius: 7,
        fill: new ol.style.Fill({
            color: '#ffcc33'
        })
    })

});
var visibleAlert = new ol.style.Style({
    fill: new ol.style.Fill({
        color: 'rgba(255, 255, 255, 0.8)' //Fill Color
    }),
    stroke: new ol.style.Stroke({
        color: '#ffcc33', // Stroke Coloer
        width: 6
    }),
    image: new ol.style.Circle({
        radius: 7,
        fill: new ol.style.Fill({
            color: '#ffcc33'
        })
    })
});
var warnAlert = new ol.style.Style({
    fill: new ol.style.Fill({
        color: 'rgba(255, 255, 255, 0.8)' //Fill Color
    }),
    stroke: new ol.style.Stroke({
        color: '#ff0033', // Stroke Coloer
        width: 6
    }),
    image: new ol.style.Circle({
        radius: 7,
        fill: new ol.style.Fill({
            color: '#ff0033'
        })
    })
});
var PhonesVector = new ol.source.Vector({});
var PhoneLayer = new ol.layer.Vector({
    source: PhonesVector
});
appConfig.map = new ol.Map({
    layers: [OSMTiles, AlertLayer, PhoneLayer],
    target: 'map-canvas',
    view: new ol.View({
        center: ol.proj.transform([-122.0583418, 37.4103552], 'EPSG:4326', 'EPSG:3857'), // CMU Silicon Valley
        zoom: 17
    })
});

$(appConfig.map.getViewport()).on('mousemove', function(e){
    var pixel = appConfig.map.getEventPixel(e.originalEvent);
    var hit = appConfig.map.forEachFeatureAtPixel(pixel, function(feature){
        if(feature.anchorParent && feature.anchorParent.trigger)
            feature.anchorParent.trigger('mouseover');
        return true;
    });
    if(appConfig.previousMousemove && !hit){
        if(appConfig.previousMousemove.trigger)
            appConfig.previousMousemove.trigger('mouseout');
        delete appConfig.previousMousemove;
    }


});
appConfig.map.on('click', function(e){
    if(appConfig.draw){
        var Coords = ol.proj.transform(appConfig.map.getEventCoordinate(e.originalEvent), 'EPSG:3857', 'EPSG:4326');
        appConfig.draw.addPaths(Coords);
    }
    else{
        var pixel = appConfig.map.getEventPixel(e.originalEvent);
        appConfig.map.forEachFeatureAtPixel(pixel, function(feature){
            if(feature.anchorParent && feature.anchorParent.trigger)
                feature.anchorParent.trigger('click');
            return true;
        });
    }
});

appConfig.infoWindow = new ol.Overlay({
    element: $('<div></div>'),
    positioning: 'bottom-center',
    stopEvent: false
});
appConfig.map.addOverlay(appConfig.infoWindow);