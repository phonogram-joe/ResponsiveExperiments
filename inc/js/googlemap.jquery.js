(function($) {
	var context = this,
		NAMESPACE = 'GoogleMap',
		NO_CONFLICT_ORIGINAL = context[NAMESPACE],
		PLUGIN_CALLBACK_NAME = NAMESPACE + '.utils.onApiLoad',
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
	 *	<div class="google_map" data-center="34,120" data-zoom="14">
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
		this.map = null;
		
		this.$wrapper.addClass('map_loading');
	}
	GoogleMap.MapView.prototype = {
		init: function() {
			this.$wrapper.removeClass('map_loading');
			this.$wrapper.children().hide();
			this.$wrapper.append(this.$mapDiv);
			
			this.updateLayout();
			this.initMap();
			this.initMarkers();
		},

		remove: function() {
			this.$wrapper.removeClass('map_loading');
			this.$wrapper.data(NAMESPACE, null);
			if (this.map != null) {
				$.each(this.markers, function(title, markerView) {
					markerView.remove();
				});
				this.$mapDiv.remove();
				this.map = null;
			}
		},

		initMap: function() {
			var mapOptions = {
				center: GoogleMap.utils.geoToLatLng(this.$wrapper.data('center')),
				zoom: this.$wrapper.data('zoom'),
				mapTypeId: google.maps.MapTypeId.ROADMAP
			};
			this.map = new google.maps.Map(this.$mapDiv.get(0), mapOptions);
		},

		initMarkers: function() {
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
				width: this.$wrapper.width() + 'px',
				height: this.$wrapper.height() + 'px'
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
			console.log("showing info window for marker", markerView);
			//TODO if arg is a string, consider it a title and find the matching marker view
			//otherwise it already is a marker view
			//show the marker view
		},
		
		/*
		 *	closeInfoWindow()
		 *		close the info window if open.
		 */
		closeInfoWindow: function() {
			
		},

		resize: function() {
			console.log("resizng map", this);
			this.updateLayout();
			google.maps.event.trigger(this.map, 'resize');
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
		this.mapView = mapView;
		this.infoHtml = markerData.infoHtml;
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
		},

		/*
		 *	noConflict(callbackName)
		 *		removes the plugins global name to its original value, and
		 *		returns a reference to the plugin root object so that it
		 *		can still be referenced. if called after one or more maps have
		 *		been initialized, resetting would break the google map loading
		 *		callback. as such, pass in a new name that can be set globally
		 *		to reference the api callback method.
		 *
		 *	note: must be called before any maps are initialized. if called after,
		 *		returns null and has no effect.
		 *
		 *	params:
		 *		callbackName: a name to use on the global
		 */
		noConflict: function(callbackName) {
			if (API_LOAD_STATUS !== STATUSES.UNLOADED) return null;
			context[NAMESPACE] = NO_CONFLICT_ORIGINAL;
			context[callbackName] = GoogleMap.utils.onApiLoad;
			return GoogleMap;
		}
	}

	$.fn.googlemap = function() {
		var $wrapper,
			mapView,
			args = Array.prototype.slice.call(arguments);
		if (args.length === 0) {
			GoogleMap.utils.loadApi();
			return this.each(function() {
				if (API_LOAD_STATUS === STATUSES.LOADING || API_LOAD_STATUS === STATUSES.LOADED) {
					$wrapper = $(this);
					mapView = new GoogleMap.MapView($wrapper);
					$wrapper.data(NAMESPACE, mapView);
					ALL_MAPS.push(mapView);
					if (API_LOAD_STATUS === STATUSES.LOADED) {
						mapView.init();
					}
				} else if (API_LOAD_STATUS === STATUSES.ERROR) {
					
				} //we already called loadApi(), so status cannot be UNLOADED
			});
		} else {
			mapView = $(this).data(NAMESPACE);
			if (args[0] === "get") {
				return mapView;
			} else if (args[0] === "remove") {
				mapView.remove();
				return null;
			} else if (args[0] == "resize") {
				mapView.resize();
			}
		}
	}

	/*	
	 *	export the plugin globally under a single namespace.
	 */
	context[NAMESPACE] = GoogleMap;

}).call(this, jQuery);