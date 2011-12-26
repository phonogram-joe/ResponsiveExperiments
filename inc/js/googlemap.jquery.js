/*
	Copyright Joseph C. Savona 2011-2012
	redistribution or use without author's permission is NOT allowed.
*/
(function($) {
	var context = this,
		PLUGIN_NAME = 'googlemap',
		PLUGIN_CALLBACK_NAME = '$.' + PLUGIN_NAME + '.utils.onApiLoad',
		API_URL = 'http://maps.googleapis.com/maps/api/js?sensor=false&callback=' + PLUGIN_CALLBACK_NAME,
		STATIC_MAP_URL = 'http://maps.googleapis.com/maps/api/staticmap?',
		STATIC_MAP_URL_MAX_LENGTH = 2048,
		STATUSES = {
			UNLOADED: 0,
			LOADING: 1,
			LOADED: 2,
			ERROR: 3
		},
		CLASSES = {
			mapLoading: 'map_loading',
			mapActive: 'map_active',
			mapStatic: 'map_static',
			autoOpen: 'map_autoopen'
		}
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
	 *	<div class="googlemap" data-center="34,120" data-zoom="14" data-mapheight="400">
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
	 *		.googlemap @data-center: geolocation for the center point of the map.
	 *			in "latitude,longitude" format
	 *		.googlemap @data-noscroll: if a truthy value is given, prevent
	 *			mousewheel scroll will not zoom the map.
	 *		.googlemap @data-zoom: numeric zoom level to use for the map
	 *		.googlemap @data-mapheight: height (px) for the map
	 *		li @data-geo: geolocation of the marker in "latitude,longitude" format
	 *		li @data-icon: optional. image to use for marker icons on the map
	 *		li @title: (short) title/tooltip when user hovers over the marker w/o clicking
	 *		li #innerHTML: html to show without marker popup info window
	 *
	 *	note: initial size of the map is determined by the size of the .googlemap
	 *		div, and map will be automatically resized when window size changes. the actual
	 *		map will be a child div of $wrapper.
	 */
	GoogleMap.MapView = function($wrapper) {
		this.$wrapper = $wrapper;
		this.$mapDiv = $('<div></div>');
		this.$mapDiv.height(this.$wrapper.data('mapheight'));
		this.map = null;
		this.infoView = null;
		this.markers = null;
		this.markerBounds = null;
		this.center = null;
		this.isInitialized = false;
		
		this.$wrapper.addClass(CLASSES.mapLoading);
	}
	GoogleMap.MapView.prototype = {
		init: function() {
			if (this.isInitialized) return;
			this.isInitialized = true;
			this.$wrapper.removeClass(CLASSES.mapLoading);
			this.$wrapper.addClass(CLASSES.mapActive);
			this.$wrapper.children().hide();
			this.$wrapper.append(this.$mapDiv);
			
			this.updateLayout();
			if (GoogleMap.utils.useDynamicMaps()) {
				this.initMap();
			} else {
				this.initStaticMap();
			}
		},

		getMapOptions: function() {
			var mapOptions = {
				center: GoogleMap.utils.geoToLatLng(this.$wrapper.data('center')),
				zoom: this.$wrapper.data('zoom') || 14,
				scrollwheel: this.$wrapper.data('noscroll') ? false : true
			};
			return mapOptions;
		},

		initStaticMap: function() {
			var mapOptions = this.getMapOptions(),
				markers = [],
				marker,
				mapImg;
			this.$wrapper.find('li').each(function() {
				marker = $(this).data('geo').split(',');
				marker = {latitude: marker[0], longitude: marker[1]};
				markers.push(marker);
			});
			mapOptions.icon = '//' + window.location.hostname + this.$wrapper.find('li[data-icon]').data('icon');
			mapOptions.markers = markers;
			mapOptions.width = this.$mapDiv.width();
			mapOptions.height = this.$mapDiv.height();

			this.$wrapper.removeClass(CLASSES.mapActive);
			this.$wrapper.addClass(CLASSES.mapStatic);
			mapImg = new Image();
			mapImg.src = GoogleMap.utils.staticMapUrl(mapOptions);
			this.$mapDiv.append(mapImg);
		},

		initMap: function() {
			var mapOptions = this.getMapOptions();
			mapOptions.mapTypeId = google.maps.MapTypeId.ROADMAP;
			this.map = new google.maps.Map(this.$mapDiv.get(0), mapOptions);
			this.initInfoView();
			this.initMarkerViews();
			if (this.openDefaultMarker()) {
				
			} else {
				this.map.fitBounds(this.markerBounds);
			}
		},

		initInfoView: function() {
			this.infoView = new GoogleMap.InfoView(this);
		},

		initMarkerViews: function() {
			var thisMapView = this,
				markers = {},
				markerBounds = new google.maps.LatLngBounds(),
				$listMarker;
			this.$wrapper.find('li').each(function() {
				var listMarkerData;
				$listMarker = $(this);
				listMarkerData = {
					map: thisMapView.map,
					position: GoogleMap.utils.geoToLatLng($listMarker.data('geo')),
					infoHtml: $listMarker.html(),
					title: $listMarker.attr('title'),
					icon: $listMarker.data('icon')
				};
				markerBounds.extend(listMarkerData.position);
				markers[listMarkerData.title] = new GoogleMap.MarkerView(thisMapView, listMarkerData);
			});
			this.markerBounds = markerBounds;
			this.markers = markers;
		},

		openDefaultMarker: function() {
			var defaultMarkerTitle = this.$wrapper.find('.' + CLASSES.autoOpen).attr('title'),
				markerView,
				thisMapView = this;
			if (this.map != null && defaultMarkerTitle != null 
				&& defaultMarkerTitle.length > 0 && this.markers.hasOwnProperty(defaultMarkerTitle)) 
			{
				markerView = this.markers[defaultMarkerTitle];
				this.map.setCenter(markerView.marker.getPosition());
				window.setTimeout(function() {
					thisMapView.showInfoWindow(defaultMarkerTitle);
				}, 150);
				return true;
			}
			return false;
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
			if (this.infoView != null && this.markers != null) {
				if (_.isString(markerView)) {
					markerView = this.markers[markerView];
				}
				this.infoView.showForMarker(markerView);
			}
		},
		
		/*
		 *	closeInfoWindow()
		 *		close the info window if open.
		 */
		closeInfoWindow: function() {
			if (this.infoView != null) {
				this.infoView.close();
			}
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
			if (this.map != null) {
				this.updateLayout();
				google.maps.event.trigger(this.map, 'resize');
			}
		},

		/*
		 *	deactive()
		 *		remove the google map functionality from the wrapper
		 *		and re-show its normal contents. map will have to be
		 *		re-initialized with 'init()' to turn it into a map again.
		 */
		deactive: function() {
			if (this.markers != null) {
				$.each(this.markers, function(title, markerView) {
					markerView.remove();
				});
			}
			if (this.infoView != null) {
				this.infoView.remove();
			}
			if (this.map != null) {
				this.map = null;
			}
			this.$mapDiv.empty().remove(); //remove any static images and then hide
			this.$wrapper
				.removeClass(CLASSES.mapLoading + ' ' + CLASSES.mapActive + ' ' + CLASSES.mapStatic)
				.children().show();
			this.isInitialized = false;
		},

		/*
		 * 	remove()
		 *		public function for deactivating this map and putting it back to its pre-map
		 *		html state.
		 */
		remove: function() {
			GoogleMap.utils.removeMap(this);
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
				this.close();
			}
		},
		
		close: function() {
			this.currentMarkerView = null;
			this.infoWindow.close();
		},

		remove: function() {
			this.close();
			google.maps.event.removeListener(this.infoWindowClickListener);
			this.infoWindow = null;
			this.infoWindowClickListener = null;
		}
	}

	/*
	 *	GoogleMap.LatLng
	 *		compatibility class for Google's LatLng class. in cases where static
	 *		maps are used and the google library is not loaded, we fall back to
	 *		this class for representing center & marker locations.
	 */
	GoogleMap.LatLng = function(latitude, longitude) {
		this.latitude = latitude;
		this.longitude = longitude;
	}
	GoogleMap.LatLng.prototype = {
		lat: function() {
			return this.latitude;
		},

		lng: function() {
			return this.longitude;
		}
	}

	/*
	 * options for the plugin. these are set using data- attributes on the script tag itself.
	 */
	GoogleMap.options = {
		forceDynamic: false, //data-forcedynamic="true" to force dynamic maps even in unsupported browsers
		forceStatic: false, //data-forcestatic="true" to force static maps even in supported browsers
		autoload: false //data-autoload="true" to automatically turn any divs with the googlemap class into maps
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
			if (typeof google !== 'undefined') {
				return new google.maps.LatLng(latLong[0], latLong[1]);
			} else {
				return new GoogleMap.LatLng(latLong[0], latLong[1]);
			}
		},

		/*
		 *	useDynamicMaps()
		 *		returns true if the browser is supported by Google Maps API 3, or
		 *		if a flag is set on the plugin's script tag to 'force' support.
		 *		otherwise, returns false. at present, only IE 6 is set to unsupported
		 *		by default due to reports of odd display/layout issues.
		 */
		useDynamicMaps: function() {
			var isSupportedBrowser = !($.browser.msie && $.browser.version <= 6);
			if (GoogleMap.options.forceStatic) return false;
			return isSupportedBrowser || GoogleMap.options.forceDynamic;
		},

		/*
		 *	staticMapUrl(options)
		 *		returns a string URL for a static Google Map with the given options & markers.
		 */
		staticMapUrl: function(mapOptions) {
			var url,
				queryParams = {},
				markerStyle = '',
				markerData = [],
				centerLatitude = mapOptions.center.lat(),
				centerLongitude = mapOptions.center.lng(),
				markerLocationStr;
			queryParams.sensor = 'false'; //google returns a 403 error if sensor not specified
			queryParams.size = (mapOptions.width || 400) + 'x' + (mapOptions.height || 400); //result image size
			queryParams.maptype = 'roadmap';
			
			//can optionally provide an icon to use for map locations
			if (mapOptions.icon) {
				markerStyle = 'icon:' + mapOptions.icon;
			}
			markerStyle += '|';
			
			//if marker data is supplied, sort the data in closest-to-center -> farthest-from-center order.
			if (mapOptions.markers != null) {
				markerData = mapOptions.markers.sort(function(a,b) {
					var a_dist = Math.sqrt(Math.pow(a.latitude - centerLatitude,2) * Math.pow(a.longitude - centerLongitude,2)),
						b_dist = Math.sqrt(Math.pow(b.latitude - centerLatitude,2) * Math.pow(b.longitude - centerLongitude,2));
					return a_dist - b_dist;
				});
			}
			if (markerData.length == 0) {
				//if no marker data, then we have to set a center & zoom.
				queryParams.center = centerLatitude + ',' + centerLongitude;
				queryParams.zoom = mapOptions.zoom || 14;
			}

			//first get the base URL without any marker data, appending all non-marker related query params
			url = STATIC_MAP_URL + _(queryParams).chain().keys().map(function(value) {
				return value + '=' + encodeURIComponent(queryParams[value]);
			}).value().join('&') + '&markers=' + encodeURIComponent(markerStyle);
			
			//one at a time append marker data to URL, stopping when google's max URL length is reached
			//in the case that not all marker data can fit, we will show the closest-to-center markers
			//because of the sort previously applied to the array
			for (var i = 0; i < markerData.length; i++) {
				markerLocationStr = encodeURIComponent(markerData[i].latitude + ',' + markerData[i].longitude + '|');
				if (url.length + markerLocationStr.length < STATIC_MAP_URL_MAX_LENGTH) {
					url += markerLocationStr;
				} else {
					break;
				}
			}
			return url;
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
			API_LOAD_STATUS = STATUSES.LOADING;
			
			script = document.createElement('script');
			script.type = 'text/javascript';
			script.src = API_URL;
			document.body.appendChild(script);
			
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
			var mapIndex,
				mapsCount =ALL_MAPS.length;
			console.log("utils.onWindowResize: updating " + mapsCount + " maps");
			for (mapIndex = 0; mapIndex < mapsCount; mapIndex++) {
				ALL_MAPS[mapIndex].resize();
			}
		},

		/*
		　*	onApiError()
		 *		callback for cases when google map api times out.
		 *		removes all maps that have been created and reverts
		 *		them to their original state.
		 */
		onApiError: function() {
			if (API_LOAD_STATUS !== STATUSES.LOADING) return;
			API_LOAD_STATUS = STATUSES.ERROR;
			while (ALL_MAPS.length > 0) {
				GoogleMap.utils.removeMap(ALL_MAPS.pop());
			}
		},

		/*
		 *	addMap($wrapper)
		 *		if the given $wrapper is not already converted into a map, 
		 *		convert it into one (otherwise re-initialize it)
		 */
		addMap: function($wrapper) {
			//prevent double-init for given dom node
			if (typeof $wrapper.data(PLUGIN_NAME) && $wrapper.data(PLUGIN_NAME) != null) {
				$wrapper.data(PLUGIN_NAME).init();
				return;
			}
			mapView = new GoogleMap.MapView($wrapper);
			//save the mapview for later access
			$wrapper.data(PLUGIN_NAME, mapView);
			//add it to list of managed mapviews so we can retrieve it later
			ALL_MAPS.push(mapView);
			//if the api has already been loaded, init the map straight away
			if (API_LOAD_STATUS === STATUSES.LOADED) {
				mapView.init();
			}
		},

		/*
		 *	removeMap(mapView)
		 *		convert the given mapView back into its pre-map HTML state
		 *		and remove it from the list of managed maps.
		 */
		removeMap: function(mapView) {
			var allMapsIndex = _.indexOf(ALL_MAPS, mapView);
			mapView.deactive();
			mapView.$wrapper.removeData(PLUGIN_NAME);
			if (allMapsIndex >= 0) {
				GoogleMap.utils.arrayRemove(ALL_MAPS, allMapsIndex);
			}
		},

		/* 
		 *	arrayRemove(array, from, to)
		 *		Array Remove - By John Resig (MIT Licensed)
		 *		http://ejohn.org/blog/javascript-array-remove/
		 *		removes the items with index in the range from-to from
		 *		the passed array. modifies the array in place.
		 *
		 *	params:
		 *		array: the array from which to remove one/more items
		 *		from: the start index of the items to remove
		 *		to: the end index of the items to remove
		 *	returns: the new length of the array
		 */
		arrayRemove: function(array, from, to) {
			var rest = array.slice((to || from) + 1 || array.length);
			array.length = from < 0 ? array.length + from : from;
			return array.push.apply(array, rest);
		}
	}

	/*
	 *	$.googlemap
	 *		root object (GoogleMap) that provides direct access to all plugin classes
	 *		and functions
	 */
	$[PLUGIN_NAME] = GoogleMap;

	/*
	 *	$.fn.googlemap()
	 *
	 *	$('selector').googlemap()
	 *		jquery method for converting an appropriately-structured HTML div
	 *		into a google maps v3 map. plugin provides initialize-by-default
	 *		behavior for any divs with a class of 'googlemap'.
	 *		if you disable the auto-load feature, or create a map div after
	 *		page load, you can call this method to initialize the map.
	 *
	 *	$('selector').googlemap('method'[, params])
	 *		call methods against a previously created MapView instance
	 *			method "get", no params: returns the MapView instance
	 *							for this div
	 *			method "remove", no params: removes the google map 
	 *							from this div and shows the original contents
	 *			method "resize", no params: adjusts the size of the google map
	 *							to match its parent (the selector). useful
	 *							if you cause the parent's size to change
	 *			method "showMarker", "markerTitle": pass the @title attribute
	 *							of the marker for which you want to show
	 *							the info window.
	 *			method "closeWindow", no params: close the info window if open
	 *
	 *	note: see comment for GoogleMap.MapView class for HTML structure that
	 *		the selected div(s) should follow.
	 */
	$.fn[PLUGIN_NAME] = function() {
		var $wrapper,
			mapView,
			args = Array.prototype.slice.call(arguments);
		if (args.length === 0) {
			GoogleMap.utils.loadApi();
			return this.each(function() {
				if (API_LOAD_STATUS === STATUSES.LOADING || API_LOAD_STATUS === STATUSES.LOADED) {
					$wrapper = $(this);
					GoogleMap.utils.addMap($wrapper);
				} else if (API_LOAD_STATUS === STATUSES.ERROR) {
					
				} //we already called loadApi(), so status will not be UNLOADED
			});
		} else {
			mapView = $(this).data(PLUGIN_NAME);
			if (typeof mapView === 'undefined' || mapView == null) return;
			if (args[0] === "get") {
				return mapView;
			} else if (args[0] === "remove") {
				mapView.remove();
				return null;
			} else if (args[0] === "resize") {
				mapView.resize();
			} else if (args[0] === "showMarker" && args.length === 2) {
				mapView.showInfoWindow(args[1]);
			} else if (args[0] === "closeWindow") {
				mapView.closeInfoWindow();
			} else if (args[0] === "mapOptions") {
				var options = {};
				options.zoom = mapView.map.getZoom();
				options.center = mapView.map.getCenter();
				return options;
			}
		}
	}

	function initPlugin() {
		var $scriptTag = $('script').filter(':last'),
			scriptContent = $scriptTag.get(0).innerHTML;
		if ($scriptTag.data('autoload')) {
			GoogleMap.options.autoload = true;
		}
		if ($scriptTag.data('forcedynamic')) {
			GoogleMap.options.forceDynamic = true;
		}
		if ($scriptTag.data('forcestatic')) {
			GoogleMap.options.forceStatic = true;
		}

		if (!GoogleMap.utils.useDynamicMaps()) {
			//if settings/browser are such that dynamic maps will not be used,
			//act as if google maps library was already loaded (w/o bothering to load it)
			API_LOAD_STATUS = STATUSES.LOADED;
		}
		$(document).ready(function() {
			if (GoogleMap.options.autoload) {
				//active the googlemap() plugin for anything with a classname of 'googlemap'
				$('.' + PLUGIN_NAME)[PLUGIN_NAME]();
			}
			if (scriptContent) {
				$.globalEval(scriptContent);
			}
		});
	};
	initPlugin();

}).call(this, jQuery);