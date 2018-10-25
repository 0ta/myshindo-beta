/*global L*/
/*eslint-disable no-console, no-alert, no-undef, no-unused-vars, curly*/
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageToast",
	"sap/ui/model/json/JSONModel",
	"myshindo/util/mapConfig"
], function(Controller, MessageToast, JSONModel, mapConfig) {
	"use strict";
	return Controller.extend("myshindo.controller.Main", {
		oMap: null,
		oPreviousLayers: [],
		iCurrentSize: 0,
		iCurrentMesh: 0,
		oInfo: null,
		oCurrentBound: null,
		ojqXHR: null,
		oLoadingImg: null,
		oZoomsizetxt: null,
		oMeshtxt: null,
		oMeshsizetxt: null,	
		oTotalnumtxt: null,
		fMeshStyle: function style(feature) {
			function getMeshColor(d) {
				return d > 6.4 ? '#B40068' :
					d > 5.9  ? '#A50021' :
					d > 5.4  ? '#FF2800' :
					d > 4.9  ? '#FF9900' :
					d > 4.4  ? '#FFE600' :
					d > 3.4  ? '#FAE696' :
					d > 2.4  ? '#0041FF' :
					d > 1.4  ? '#00AAFF' :
					'#F2F2FF';					
			}
			return {
				weight: 0,
				fillOpacity: 0.7,
				fillColor: getMeshColor(feature.properties["Aggregation Value"])
			};
		},
		fGetCulcMeasure: function(calcMeasure) {
			var sCalcMeasure;
			switch (calcMeasure) {
				case "11":
					sCalcMeasure = 'MAX("jma_shindo")';
					break;
				case "12":
					sCalcMeasure = 'AVG("jma_shindo")';
					break;
				case "13":
					sCalcMeasure = 'MEDIAN("jma_shindo")';
					break;
			}
			return sCalcMeasure;
		},
		fAddCreateJsonLayer: function(aController, geoJson) {
			var jsonlayer = L.geoJSON(geoJson, {
				style: aController.fMeshStyle,
				onEachFeature: onEachFeature
			}).addTo(aController.oMap);
			aController.oPreviousLayers.push(jsonlayer);
			function onEachFeature(feature, layer) {
			    //Attach event
			    layer.on({
			        mouseover: highlightFeature,
			        mouseout: resetHighlight,
			        click: function(e) {
			        	var centerY = (feature.geometry.coordinates[0][1][0] + feature.geometry.coordinates[0][0][0]) / 2;
			        	var centerX = (feature.geometry.coordinates[0][2][1] + feature.geometry.coordinates[0][0][1]) / 2;
			        	
			        	var currentZoom = aController.oMap.getZoom();
			        	var nextZoom;
			        	if (currentZoom <= 7) {
			        		nextZoom = 8;
			        	} else if (currentZoom >= 14) {
			        		nextZoom = 18;
			        	} else {
				        	nextZoom = currentZoom % 2 === 0 ? currentZoom + 2 : currentZoom + 1;			        		
			        	}
			        	
			        	aController.oMap.flyTo([centerX, centerY], nextZoom);
			        }
			    });
			}					
			function highlightFeature(e) {
				var layer = e.target;
				layer.setStyle({
					weight: 2,
					color: '#666',
					dashArray: '',
					fillOpacity: 0.7
				});
				aController.oInfo.update(layer.feature.properties);
			}
			function resetHighlight(e) {
				var layer = e.target;
				jsonlayer.resetStyle(layer);
				aController.oInfo.update();
			}			
		},
		fAddCreateJsonLayerForMarker: function(aController, geoJson) {
			function getMeshColor(d) {
				return d > 6.4 ? '#B40068' :
					d > 5.9  ? '#A50021' :
					d > 5.4  ? '#FF2800' :
					d > 4.9  ? '#FF9900' :
					d > 4.4  ? '#FFE600' :
					d > 3.4  ? '#FAE696' :
					d > 2.4  ? '#0041FF' :
					d > 1.4  ? '#00AAFF' :
					'#F2F2FF';					
			}			
			var jsonlayer = L.geoJSON(geoJson, {
				//style: aController.fMeshStyle,
				pointToLayer: function (feature, latlng) {
								var geojsonMarkerOptions = {
								    radius: 8,
								    fillColor: getMeshColor(feature.properties["jma_shindo"]),
								    color: getMeshColor(feature.properties["jma_shindo"]),
								    weight: 1,
								    opacity: 1,
								    fillOpacity: 0.8
								};
        						return L.circleMarker(latlng, geojsonMarkerOptions);
    						  },
				onEachFeature: onEachFeature
			}).addTo(aController.oMap);
			aController.oPreviousLayers.push(jsonlayer);
			function onEachFeature(feature, layer) {
				var props = feature.properties;
				var starttime = props["start_time"].substring(0 , props["start_time"].indexOf("."));
				var endtime = props["end_time"].substring(0 , props["end_time"].indexOf("."));
				var popupHtml = 
					'<table>' + 
						'<tr><td><font>Sensor ID:</font></td><td>' + props["sensors_id"] + '</td></tr>' +				
						'<tr><td><font>Start Time:</font></td><td>' + starttime + '</td></tr>' +
						'<tr><td><font>End Time:</font></td><td>' + endtime + '</td></tr>' +
						'<tr><td><font>Shindo:</font></td><td>' + Math.floor((Math.round(props["jma_shindo"] * 100) / 100) * 10) / 10 + '</td></tr>' +
						'<tr><td><font>Max Gal:</font></td><td>' + props["max_gal"] + '</td></tr>' + 
					'</table>';
				layer.bindPopup(popupHtml);
			}					
		},
		
		onInit: function() {
			
			var oLoadingImg = this.oLoadingImg = this.getView().byId("loadingimg");
			oLoadingImg.setVisible(false);
			this.oZoomsizetxt = this.getView().byId("zoomsizetxt");
			this.oMeshtxt = this.getView().byId("meshtxt");
			this.oMeshsizetxt = this.getView().byId("meshsizetxt");	
			this.oTotalnumtxt = this.getView().byId("totalnumtxt");
			
			this.getView().byId("calcMeasureLbl").setVisible(false);
			this.getView().byId("calcMeasure").setVisible(false);			
		},

		onAfterRendering: function(oEvent) {
			var that = this;
			
			// Create map
	        this.oMap = L.map('map', {
	        	preferCanvas: true
	        }).setView([38.044358, 138.380263], 5);
	        var mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
	        //国土地理院
	        //var mapLink = '<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>';	        
	        L.tileLayer(
	            'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	            //国土地理院タイルURL
	            //'http://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', {	            	
	            attribution: '&copy; ' + mapLink + ' Contributors',
	           // maxZoom: 18,
	            }).addTo(this.oMap);
	        
	        // Create legend    
			function getColor(d) {
				return d > 6.4 ? '#B40068' :
					d > 5.9  ? '#A50021' :
					d > 5.4  ? '#FF2800' :
					d > 4.9  ? '#FF9900' :
					d > 4.4  ? '#FFE600' :
					d > 3.4  ? '#FAE696' :
					d > 2.4  ? '#0041FF' :
					d > 1.4  ? '#00AAFF' :
					'#F2F2FF';	
			}
			var legend = L.control({position: 'bottomright'});
			legend.onAdd = function (map) {
				var div = L.DomUtil.create('div', 'info legend'),
					grades = [0.4, 1.4, 2.4, 3.4, 3.9, 4.4, 4.9, 5.4, 5.9],
					gradelbls = ["1", "2", "3", "4", "5-lower", "5-upper", "6-lower", "6-upper", 7],
					labels = [],
					from, to;
					for (var i = 0; i < grades.length; i++) {
						from = grades[i];
						//to = grades[i + 1];
						labels.push(
							'<i style="background:' + getColor(from + 1) + '"></i> ' +
							//from + (to ? '&ndash;' + to : ''));
							gradelbls[i]);
					}
					div.innerHTML = labels.join('<br>');
					return div;
			};
			legend.addTo(that.oMap);
			
			// Create scale
			L.control.scale().addTo(that.oMap);
			
			// Create detail information
			var oInfo = that.oInfo = L.control();
			oInfo.onAdd = function (map) {
				this._div = L.DomUtil.create('div', 'info');
				this.update();
				return this._div;
				};
			oInfo.update = function (props) {
					this._div.innerHTML = '<h4>Mesh Information</h4>' +  (props ?
					'<b><font>Max</font>: 　' + Math.floor((Math.round(props["Aggregation Value"] * 100) / 100) * 10) / 10 + '</b></br>' +
					'<b><font>Count:</font> ' + props["Data Count"] + '</b>'
					: 'Move the pointer over the mesh');
					};
			oInfo.addTo(that.oMap);			
			
			// Attach event
			this.oMap.on("zoom", function(e) {
				
				//
				//for test purpose.
				console.log(that.oMap.getZoom());
				var wLoc = L.latLng(that.oMap.getCenter().lat, that.oMap.getBounds().getWest());
				var eLoc = L.latLng(that.oMap.getCenter().lat, that.oMap.getBounds().getEast());
				var nLoc = L.latLng(that.oMap.getBounds().getNorth(), that.oMap.getCenter().lng);
				var sLoc = L.latLng(that.oMap.getBounds().getSouth(), that.oMap.getCenter().lng);
				console.log("縦:" + that.oMap.distance(nLoc, sLoc));
				console.log("横:" + that.oMap.distance(wLoc, eLoc));
				//
				//
				
				that.oZoomsizetxt.setText(that.oMap.getZoom());
				var mesh;
				var meshsize;
				if(that.oMap.getZoom() < 8) {
					mesh = 1;
					meshsize = "80km * 80km";
				} else if (that.oMap.getZoom() < 10) {
					mesh = 2;
					meshsize = "10km * 10km";
				} else if (that.oMap.getZoom() < 12) {
					mesh = 3;
					meshsize = "1km * 1km";
				} else if (that.oMap.getZoom() < 14) {
					mesh = 4;
					meshsize = "250m * 250m";
				} else if (that.oMap.getZoom() < 18) {
					mesh = 5;
					meshsize = "100m * 100m";
				} else if (that.oMap.getZoom() == 18) {
					mesh = "-";
					meshsize = "-";					
				}
				
				that.oMeshtxt.setText("#" + mesh);
				that.oMeshsizetxt.setText(meshsize);	
				
				var quakeId = that.getView().byId("quakeId").getSelectedKey();
				var calcMeasure = that.getView().byId("calcMeasure").getSelectedKey();
				if([8, 10, 12, 14].indexOf(that.oMap.getZoom()) >= 0 && that.oMap.getZoom() > that.iCurrentSize) {
					// In the case of scale up
					// Zoom 8 -> Mesh 2
					// Zoom 10 -> Mesh 3
					// Zoom 12 -> Mesh 4
					// Zoom 14 -> Mesh 5
					that.loadData(quakeId, calcMeasure, (that.oMap.getZoom() / 2) - 2);
					console.log("scale up");
				} else if([7, 9, 11, 13].indexOf(that.oMap.getZoom()) >= 0 && that.oMap.getZoom() < that.iCurrentSize){
					// In the case of scale down
					// Zoom 7 -> Mesh 2
					// Zoom 9 -> Mesh 3
					// Zoom 11 -> Mesh 4
					// Zoom 13 -> Mesh 5
					that.loadData(quakeId, calcMeasure, ((that.oMap.getZoom() - 1) / 2) - 2);
					console.log("scale down");
				} else if(that.oMap.getZoom() === 17 && that.oMap.getZoom() < that.iCurrentSize) {
					// In the case of scale down
					// Mesh 17 -> Mesh5
					that.loadData(quakeId, calcMeasure, 5);
				} else if (that.oMap.getZoom() === 18) {
					that.loadDataforPoints(quakeId);
				}
				that.iCurrentSize = that.oMap.getZoom();
			});
			
			this.oMap.on("dragend", function(e) {
				var quakeId = that.getView().byId("quakeId").getSelectedKey();
				var calcMeasure = that.getView().byId("calcMeasure").getSelectedKey();
				if(that.oCurrentBound && that.oMap.getZoom() >= 10) {
					if (that.oCurrentBound.XMax < that.oMap.getBounds().getEast() ||
							that.oCurrentBound.XMin > that.oMap.getBounds().getWest() ||
							that.oCurrentBound.YMax < that.oMap.getBounds().getNorth() ||
							that.oCurrentBound.YMin > that.oMap.getBounds().getSouth())  {
								console.log("Over the range");
								if (that.oMap.getZoom() === 18) {
									that.loadDataforPoints(quakeId);									
								} else {
									that.loadData(quakeId, calcMeasure, that.iCurrentMesh, true);									
								}
							} else {
								console.log("Not over the range");
							}
				}
			});
		},
		
		onPressButton: function(oEvent) {
			if(this.oMap.getZoom() !== 5) {
				this.oMap.flyTo([38.044358, 138.380263], 5);				
			}
			this.oMeshtxt.setText("#1");
			this.oMeshsizetxt.setText("80km * 80km");			
			var quakeId = this.getView().byId("quakeId").getSelectedKey();
			var calcMeasure = this.getView().byId("calcMeasure").getSelectedKey();
			MessageToast.show("Showing " + quakeId);
			this.loadData(quakeId, calcMeasure, 1);
		},

		loadData: function(quakeId, calcMeasure, aMeshDeg, isLazyLayerRemove) {
			var that = this;
			if(this.oPreviousLayers.length > 0 && !isLazyLayerRemove) {
				this.oPreviousLayers.forEach(function(oPreviousLayer) {
					that.oMap.removeLayer(oPreviousLayer);					
				});
				this.oPreviousLayers = [];
			}
			var oMeshSize = {
				3: {
					width: 1,
					num: 200
				},
				4: {
					width: 0.25,
					num: 200
				},
				5: {
					width: 0.1,
					num: 200
				}
			};
			var sCalcMeasure = this.fGetCulcMeasure(calcMeasure);

			var pQuery;
			if (aMeshDeg >= 3) {
				pQuery =
					"/destinations/myshindo/myshindo/app/services/getDataDetailMesh.xsjs?" +
					"eews_id=" + quakeId +
					"&sCalcMeasure=" + sCalcMeasure +
					"&fCenterLon=" + this.oMap.getCenter().lng +
					"&fCenterLat=" + this.oMap.getCenter().lat +
					"&fMeshWidthKm=" + oMeshSize[aMeshDeg].width +
					"&iMeshNumX=" + oMeshSize[aMeshDeg].num +
					"&iMeshNumY=" + oMeshSize[aMeshDeg].num;					
			} else {
				pQuery =
					"/destinations/myshindo/myshindo/app/services/getData1or2Mesh.xsjs?" +
					"meshDeg=" + aMeshDeg +
					"&eews_id=" + quakeId +
					"&sCalcMeasure=" + sCalcMeasure;				
			}

			if (this.ojqXHR && this.ojqXHR.readyState < 4) {
				this.ojqXHR.abort();
				this.ojqXHR = null;
			}
			this.oLoadingImg.setVisible(true);
			this.ojqXHR = $.ajax({
				url: pQuery,
				success: function(queryData) {
					that.oLoadingImg.setVisible(false);
					that.oPreviousLayers.forEach(function(oPreviousLayer) {
						that.oMap.removeLayer(oPreviousLayer);					
					});
					this.oPreviousLayers = [];
					that.iCurrentMesh = aMeshDeg;
					var oResultJson = JSON.parse(queryData);
					that.oCurrentBound = oResultJson.DataArea;
					that.fAddCreateJsonLayer(that, oResultJson.GeoJson);
					that.oTotalnumtxt.setText(oResultJson.GeoJson.features.length);
					console.log("Succeeded! cnt=" + oResultJson.GeoJson.features.length);
				},
				error: function(jqXHR, textStatus) {
					that.oLoadingImg.setVisible(false);
					if (textStatus === "abort") {
						console.info("The request has been successfully canceled.");
					} else {
						console.error("Cannot get geo related data.");						
					}
				}
			});
		},
		
		loadDataforPoints: function(quakeId) {
			var that = this;
			if(this.oPreviousLayers.length > 0) {
				this.oPreviousLayers.forEach(function(oPreviousLayer) {
					that.oMap.removeLayer(oPreviousLayer);					
				});
				this.oPreviousLayers = [];
			}
			
			// Get the points in the range[1000m*1000m].
			var targetBound = this.oMap.getCenter().toBounds(1000);
			
			var pQuery =
				"/destinations/myshindo/myshindo/app/services/getDataPoint.xsjs?" +
				"eews_id=" + quakeId +
				"&xMin=" + targetBound.getWest() +
				"&xMax=" + targetBound.getEast() +
				"&yMin=" + targetBound.getSouth() +
				"&yMax=" + targetBound.getNorth();

			if (this.ojqXHR && this.ojqXHR.readyState < 4) {
				this.ojqXHR.abort();
				this.ojqXHR = null;
			}
			
			this.oLoadingImg.setVisible(true);
			this.ojqXHR = $.ajax({
				url: pQuery,
				success: function(queryData) {
					that.oLoadingImg.setVisible(false);
					that.oPreviousLayers.forEach(function(oPreviousLayer) {
						that.oMap.removeLayer(oPreviousLayer);					
					});
					var oResultJson = JSON.parse(queryData);
					that.oCurrentBound = oResultJson.DataArea;
					that.fAddCreateJsonLayerForMarker(that, oResultJson.GeoJson);
					that.oTotalnumtxt.setText(oResultJson.GeoJson.features.length);
					console.log("Succeeded! cnt=" + oResultJson.GeoJson.features.length);
				},
				error: function(jqXHR, textStatus) {
					that.oLoadingImg.setVisible(false);
					if (textStatus === "abort") {
						console.info("The request has been successfully canceled.");
					} else {
						console.error("Cannot get geo related data.");						
					}
				}
			});
		}
		
	});
});