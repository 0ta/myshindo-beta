sap.ui.define([], function() {
	"use strict";
	var mapConfigOSM = {
				"MapProvider": [{
					"name": "OSM",
					"type": "",
					"description": "",
					"tileX": "256",
					"tileY": "256",
					"maxLOD": "20",
					"copyright": "Tiles Courtesy of OpenStreetMap",
					"Source": [{
						"id": "s1",
						"url": "https://a.tile.openstreetmap.org/{LOD}/{X}/{Y}.png"
					}]
				}],
				"MapLayerStacks": [{
					"name": "DEFAULT",
					"MapLayer": {
						"name": "layer1",
						"refMapProvider": "OSM",
						"opacity": "1.0",
						"colBkgnd": "RGB(255,255,255)"
					}
				}]
			};
	
	
	return {
		mapConfigOSM: mapConfigOSM
		
	};
});