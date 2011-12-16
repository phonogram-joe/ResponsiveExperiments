(function($) {
	var context = this,
		PLUGIN_NAME = 'googlemap',
		PLUGIN_CALLBACK_NAME = '$.' + PLUGIN_NAME + '.utils.onApiLoad',
		API_URL = 'http://maps.googleapis.com/maps/api/js?sensor=false&callback=' + PLUGIN_CALLBACK_NAME,
		STATUSES = {
			UNLOADED: 0,
			LOADING: 1,
			LOADED: 2,
			ERROR: 3
		},
		API_LOAD_STATUS = STATUSES.UNLOADED,
		GoogleMap = {},
		ALL_MAPS = [];

	/*
	 *	GoogleMap.Map($wrapper) - Class
	 *		class representing an instance of a google map
	 *		and the DOM container. HTML structure should be as follows:
	 *
	 *	params:
	 *		$wrapper: 	jQuery element representing a div in which to display
	 *			a google map. div must use the following html structure:
	 *
	 *	<div class="google_map" data-center="34,120" data-zoom="14" data-mapheight="400">
	 *		<ul>
	 *			<li data-geo="34,120" data-icon="/inc/img/marker.png" title="Tokaichi">
	 *				...flexible html, this is an example...
	 *				<img src="..." /><h1>Tokaichi</h1>
	 *				...end example...
	 *			</li>
	 *			...more markers in <li> tags...
	 *		</ul>
	 *	</div>
	 *
	 *	map options set through the following (@ = attribute, # = property):
	 *		.google_map @data-center: geolocation for the center point of the map.
	 *			in "latitude,longitude" format
	 *		.google_map @data-zoom: numeric zoom level to use for the map
	 *		.google_map @data-mapheight: height (px) for the map
	 *		li @data-geo: geolocation of the marker in "latitude,longitude" format
	 *		li @data-icon: optional. image to use for marker icons on the map
	 *		li @title: (short) title/tooltip when user hovers over the marker w/o clicking
	 *		li #innerHTML: html to show without marker popup info window
	 *
	 *	note: initial size of the map is determined by the size of the .google_map
	 *		div, and map will be automatically resized when window size changes. the actual
	 *		map will be a child div of $wrapper.
	 */
	GoogleMap.MapView = function($wrapper) {
		this.$wrapper = $wrapper;
		this.$mapDiv = $('<div></div>');
		this.$mapDiv.height(this.$wrapper.data('mapheight'));
		this.map = null;
		
		this.$wrapper.addClass('map_loading');
	}
	GoogleMap.MapView.prototype = {
		init: function() {
			if (this.map != null) return;
			this.$wrapper.removeClass('map_loading');
			this.$wrapper.addClass('map_active');
			this.$wrapper.children().hide();
			this.$wrapper.append(this.$mapDiv);
			
			this.updateLayout();
			this.initMap();
			this.initInfoView();
			this.initMarkerViews();
		},

		initMap: function() {
			var mapOptions = {
				center: GoogleMap.utils.geoToLatLng(this.$wrapper.data('center')),
				zoom: this.$wrapper.data('zoom'),
				mapTypeId: google.maps.MapTypeId.ROADMAP
			};
			this.map = new google.maps.Map(this.$mapDiv.get(0), mapOptions);
		},

		initInfoView: function() {
			this.infoView = new GoogleMap.InfoView(this);
		},

		initMarkerViews: function() {
			var thisMapView = this,
				markers = {},
				$listMarker;
			this.$wrapper.find('li').each(function() {
				var listMarkerData;
				$listMarker = $(this);
				listMarkerData = {
					position: GoogleMap.utils.geoToLatLng($listMarker.data('geo')),
					map: thisMapView.map,
					infoHtml: $listMarker.html(),
					title: $listMarker.attr('title')
				}
				markers[listMarkerData.title] = new GoogleMap.MarkerView(thisMapView, listMarkerData);
			});
			this.markers = markers;
		},

		updateLayout: function() {
			this.$mapDiv.css({
				width: this.$wrapper.width() + 'px'
			});
		},

		/*
		 *	showInfoWindow(markerView)
		 *		show the info window popup for the named/specified marker.
		 *
		 *	params:
		 *		markerView: either a string (the marker title) or the marker view
		 *					itself for which the info window should open
		 */
		showInfoWindow: function(markerView) {
			if (_.isString(markerView)) {
				markerView = this.markers[markerView];
			}
			this.infoView.showForMarker(markerView);
		},
		
		/*
		 *	closeInfoWindow()
		 *		close the info window if open.
		 */
		closeInfoWindow: function() {
			
		},

		/*
		 *	resize()
		 *		update the size of the map itself to reflect its parent
		 *		height. you should call this method if you explicitly
		 *		change page element styles/sizing such that the width
		 *		of the parent container changes. window resize events
		 *		are handled automatically by the plugin in an
		 *		efficient way.
		 *
		 *	note: to call the resize event on a map, select its parent
		 *		element and call <code>$(wrapper).googlemap('resize');</code>
		 */
		resize: function() {
			console.log("resizing map", this);
			this.updateLayout();
			google.maps.event.trigger(this.map, 'resize');
		},

		/*
		 *	remove()
		 *		remove the google map functionality from the wrapper
		 *		and re-show its normal contents.
		 */
		remove: function() {
			if (this.map != null) {
				$.each(this.markers, function(title, markerView) {
					markerView.remove();
				});
				this.$mapDiv.remove();
				this.map = null;
			}
			this.$wrapper
				.removeClass('map_loading map_active')
				.data(PLUGIN_NAME, null)
				.children().show();
		}	
	}


	/*
	 *	GoogleMap.MarkerView(mapView, markerData) - Class
	 *		class representing an instance of a google map marker
	 *		and data (HTML) corresponding to that marker
	 *
	 *	params:
	 *		mapView: a GoogleMap.MapView instance representing
	 *			the map on which this marker should be displayed
	 *		markerData: an object with parameters to use for
	 *			initializing the google maps Marker object
	 */
	GoogleMap.MarkerView = function(mapView, markerData) {
		_.bindAll(this, 'onClick');
		this._id = _.uniqueId(PLUGIN_NAME);
		this.mapView = mapView;
		this.data = markerData;
		this.marker = new google.maps.Marker(markerData);
		this.markerClickListener = google.maps.event.addListener(this.marker, 'click', this.onClick);
	}

	GoogleMap.MarkerView.prototype = {
		/*
		 *	onClick(event)
		 *		callback function to handle clicks on the marker. has same
		 *		effect as calling MapView.showInfoWindow("marker title")
		 */
		onClick: function(event) {
			this.mapView.showInfoWindow(this);
		},

		/*
		 *	remove()
		 *		remove the marker from its parent map and remove all callbacks
		 */
		remove: function() {
			this.marker.setMap(null);
			google.maps.event.removeListener(this.markerClickListener);
			this.marker = null;
			this.markerClickListener = null;
		},

		/*
		 *	content()
		 *		returns the HTML content to show for this marker.
		 */
		content: function() {
			return this.data.infoHtml;
		},

		/*
		 *	title()
		 *		returns the text to use as the title for this marker
		 */
		 title: function() {
		 	return this.data.title;
		 },

		 /*
		  *	id()
		  *		returns a unique id for this marker
		  */
		 id: function() {
		 	return this._id;
		 }
	}


	/*
	 *	GoogleMap.InfoView(mapView) - Class
	 *		class representing an instance of a google map information
	 *		window that pops up with details about a specific marker
	 *
	 *	params:
	 *		mapView: a GoogleMap.MapView instance representing
	 *			the map on which this info window should be displayed
	 */
	GoogleMap.InfoView = function(mapView) {
		_.bindAll(this, 'onClose');
		this.mapView = mapView;
		this.currentMarkerView = null;
		this.infoWindow = new google.maps.InfoWindow({
			content: ''
		});
		this.infoWindowClickListener = google.maps.event.addListener(this.infoWindow, 'closeclick', this.onClose);
	}
	GoogleMap.InfoView.prototype = {
		onClose: function() {
			this.currentMarkerView = null;
		},

		showForMarker: function(markerView) {
			if (this.currentMarkerView == null || this.currentMarkerView.id() !== markerView.id()) {
				//clicking on a different marker than the one for which the
				//window is currently opens switches the info window
				//to show for that newly clicked marker.
				this.infoWindow.setContent(markerView.content());
				this.infoWindow.open(this.mapView.map, markerView.marker);
				this.currentMarkerView = markerView;
			} else {
				//clicking on the marker for which window is closes the window
				this.hide();
			}
		},
		
		hide: function() {
			this.currentMarkerView = null;
			this.infoWindow.close();
		},

		remove: function() {
			this.hide();
			google.maps.events.removeListener(this.infoWindowClickListener);
			this.infoWindow = null;
			this.infoWindowClickListener = null;
		}
	}
	

	/*
	 *	GoogleMap.utils {}
	 *		utility functions for use in initializing and interacting with the library
	 */
	GoogleMap.utils = {
		/*
		 *	geoToLatLng(geostr)
		 *		converts a string of the form "latitude#,longitude#" to a google maps
		 *		LatLng object.
		 *
		 *	params:
		 *		geostr: string representing latitude,longitude
		 */
		geoToLatLng: function(geostr) {
			var latLong = geostr.split(',');
			return new google.maps.LatLng(latLong[0], latLong[1]);
		},

		/*
		 *	loadApi()
		 *		begins async loading of the google maps library by injecting the base
		 *		script tag into the page and configuring the library load-complete
		 *		callback
		 */
		loadApi: function() {
			var script;
			if (API_LOAD_STATUS !== STATUSES.UNLOADED) return;
			script = document.createElement('script');
			script.type = 'text/javascript';
			script.src = API_URL;
			document.body.appendChild(script);
			API_LOAD_STATUS = STATUSES.LOADING;
			
			//set a timeout of 1 minute after which we consider the library to have failed loading
			window.setTimeout(function() {
				GoogleMap.utils.onApiError();
			}, 1000 * 60);
		},

		/*
		 *	onApiLoad()
		 *		callback for load-complete of the google maps library.
		 *		does nothing if onApiError has already been called - 
		 *		through our explicit timeout set at load time.
		 */
		onApiLoad: function() {
			var mapIndex;
			if (API_LOAD_STATUS !== STATUSES.LOADING) return;
			API_LOAD_STATUS = STATUSES.LOADED;

			//initialize the map(s) that have been requested
			for (mapIndex = 0; mapIndex < ALL_MAPS.length; mapIndex++) {
				ALL_MAPS[mapIndex].init();
			}
			//configure global events affecting all maps, eg window.resize
			$(window).resize(_.debounce(GoogleMap.utils.onWindowResize, 300));
		},

		/*
		 *	onWindowResize()
		 *		alert all MapViews on the page that the window has resized
		 *		and let them update their size as necessary.
		 */
		onWindowResize: function() {
			console.log("utils.onWindowResize");
			for (var mapIndex = 0; mapIndex < ALL_MAPS.length; mapIndex++) {
				ALL_MAPS[mapIndex].resize();
			}
		},

		/*
		　*	onApiError()
		 *		callback for cases when google map api times out.
		 */
		onApiError: function() {
			API_LOAD_STATUS = STATUSES.ERROR;
			for (var mapIndex = 0; mapIndex < ALL_MAPS.lenth; mapIndex++) {
				ALL_MAPS[mapIndex].remove();
			}
			ALL_MAPS = [];
		}
	}

	$[PLUGIN_NAME] = GoogleMap;
	$.fn[PLUGIN_NAME] = function() {
		var $wrapper,
			mapView,
			args = Array.prototype.slice.call(arguments);
		if (args.length === 0) {
			GoogleMap.utils.loadApi();
			return this.each(function() {
				if (API_LOAD_STATUS === STATUSES.LOADING || API_LOAD_STATUS === STATUSES.LOADED) {
					$wrapper = $(this);
					//prevent double-init for given dom node
					mapView = $wrapper.data(PLUGIN_NAME) || new GoogleMap.MapView($wrapper);
					//save the mapview for later access
					$wrapper.data(PLUGIN_NAME, mapView);
					//add it to list of managed mapviews so we can retrieve it later
					if (ALL_MAPS.indexOf(mapView) < 0) {
						ALL_MAPS.push(mapView);
					}
					//if the api has already been loaded, init the map straight away
					if (API_LOAD_STATUS === STATUSES.LOADED) {
						mapView.init();
					}
				} else if (API_LOAD_STATUS === STATUSES.ERROR) {
					
				} //we already called loadApi(), so status cannot be UNLOADED
			});
		} else {
			mapView = $(this).data(PLUGIN_NAME);
			if (args[0] === "get") {
				return mapView;
			} else if (args[0] === "remove") {
				mapView.remove();
				return null;
			} else if (args[0] === "resize") {
				mapView.resize();
			} else if (args[0] === "showMarker" && args.length === 2) {
				mapView.showInfoWindow(args[1]);
			}
		}
	}

	$(document).ready(function() {
		$('.google_map').googlemap();
	});

}).call(this, jQuery);