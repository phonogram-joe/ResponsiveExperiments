/*
    http://github.com/phonogram-joe/ResponsiveExperiments
    Copyright 2012 Joe Savona
    Licensed under the MIT license (http://www.opensource.org/licenses/mit-license.php)
*/
(function($) {
	var context = this;

	function mapsTabsInit() {
		var $parentTab,
			tabShownCallback;
		$.googlemap.utils.eachMap(function(mapView) {
			$parentTab = mapView.$wrapper.parents('.tab_group .tabs > div');
			if ($parentTab.size()) {
				$parentTab.height(mapView.height());
				tabShownCallback = function($event) {
					mapView.init();
					$parentTab.off('tabshown:tab_group');
				};
				$parentTab.on('tabshown:tab_group', tabShownCallback);
				return;
			}
		});
	}
	$(document).ready(mapsTabsInit);
	
}).call(this, jQuery);