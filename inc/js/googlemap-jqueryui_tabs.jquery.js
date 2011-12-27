(function($) {
	var context = this;

	function mapsTabsInit() {
		var $tabsRoot,
			$mapTab,
			eventNamespace,
			tabShownCallback;
		$.googlemap.utils.eachMap(function(mapView) {
			$tabsRoot = mapView.$wrapper.parents('.ui-tabs');
			$mapTab = $tabsRoot.find('.ui-tabs-hide');
			eventNamespace = _.uniqueId('googlemap-tabs');
			if ($mapTab.size()) {
				$mapTab.height(mapView.height());
				tabShownCallback = function($event, ui) {
					//if the shown tab is the one for this mapView's parent tab,
					//then continue. otherwise return
					if (ui.panel !== $mapTab.get(0)) return;
					mapView.init();
					$tabsRoot
					$tabsRoot.off('tabsshow:' + eventNamespace);
				};
				$tabsRoot.bind('tabsshow:' + eventNamespace, tabShownCallback);
				return;
			}
		});
	}
	$(document).ready(mapsTabsInit);
	
}).call(this, jQuery);