/*
 *  http://github.com/phonogram-joe/ResponsiveExperiments
 *  Copyright 2012 Joe Savona
 *  Licensed under the MIT license (http://www.opensource.org/licenses/mit-license.php)
 */
(function($, Raphael) {
    var PLUGIN_NAME = 'svgmap',
        SVG_DATA_ATTR_NAME = 'mapurl',
        svgmap = {};

    svgmap.pluginOptions = {
        autoload: false
    };
    svgmap.defaultOptions = {
        pathAttrs: {
            fill: '#fff', //set from SVG
            stroke: '#000'
        },
        onHoverAttrs: {
            fill: '#ccc'
        },
        onClickAttrs: {
            fill: '#666'
        }
    };
    svgmap.emptyOptions = {
        pathAttrs: {},
        onHoverAttrs: {},
        onClickAttrs: {}
    };

    /*
     *  svgmap.Map($rootNode[, options])
     *      class for defining an svg 'map' - it is assumed that the SVG represents
     *      essentially non-overlapping distinct areas (as would be present on a 
     *      geographical map). provides access to paths by id when an 'id' is set in the
     *      group (<g>) tag. events are thrown for specific areas on mouse over, mouse out, click.
     *      all events are thrown at the $rootNode object with event information pointing to the
     *      id of the area of the target node. also a 'ready' event is thrown once the SVG has been
     *      retrieved and parsed.
     *
     *  params:
     *      $rootNode: a jQuery wrapped object representing the root node in which the SVG should
     *                  be displayed. should have a data-mapurl="...url..." attribute specifying
     *                  the URL of the SVG to be displayed.
     *      options: (optional). an object literal specifying the default path attributes for displaying areas,
     *              the attributes to animate to on area hover, and the attributes to animate to when an area
     *              is clicked. see svgmap.defaultOptions for an example.
     *
     *  events:
     *      type 'svg-ready' @ $rootNode: signifies that the svg has been retrieved successfully and the map
     *                                      is fully initialized.
     *      type 'svg-mouseover' @ $rootNode: when an area has been moused over. event.originalEvent.areaId gives
     *                                      the id of the group the area is in.
     *      type 'svg-mouseout' @ $rootNode: mouse out version of the above, same way to access the id of the group.
     *      type 'svg-click' @ $rootNode: mouse click version of the above, same way to access the id of the group.
     */
    svgmap.Map = function($rootNode, options) {
        var svgUrl;
        this.$rootNode = $rootNode;
        this.pathsById = {};
        //ensure the top-level keys of the options hash are present
        this.options = _.extend({}, svgmap.emptyOptions, options || {});
        //read in and set defaults for all of the sub-sections of the options
        this.pathAttrs = _.extend({}, svgmap.defaultOptions.pathAttrs, this.options.pathAttrs);
        this.onHoverAttrs = _.extend({}, svgmap.defaultOptions.onHoverAttrs, this.options.onHoverAttrs);
        this.onClickAttrs = _.extend({}, svgmap.defaultOptions.onClickAttrs, this.options.onClickAttrs);

        svgUrl = this.$rootNode.data(SVG_DATA_ATTR_NAME);
        if (svgUrl != null) {
            $.ajax(svgUrl, {
                dataType: 'xml',
                success: _.bind(this.init, this)
            });
        }
    };
    svgmap.Map.prototype = {
        init: function(data) {
            var R,
                width,
                height,
                pathAttrs,
                mouseOverHandler,
                mouseOutHandler,
                clickHandler,
                areaIndex,
                areaCount,
                $area,
                $svg,
                $rootNode,
                pathsById;
            $rootNode = this.$rootNode;
            pathsById = this.pathsById;
            $svg = $(data).find('svg');

            width = parseInt($svg.attr('width'), 10);
            $rootNode.width(width);
            height = parseInt($svg.attr('height'), 10);
            $rootNode.height(height);

            R = Raphael($rootNode.get(0), width, height);
            pathAttrs = this.pathAttrs;
            mouseOverHandler = _.bind(this.mouseOverPath, this);
            mouseOutHandler = _.bind(this.mouseOutPath, this);
            clickHandler = _.bind(this.clickPath, this);

            $svg.find('path').each(function() {
                var currentPath;
                $area = $(this);
                currentPath = R.path($area.attr('d'));
                currentPath.attr(pathAttrs);
                currentPath.areaId = $.trim($area.parents('g').filter('[id]').attr('id'));
                pathsById[currentPath.areaId] = currentPath;
                currentPath.mouseover(function() {
                    var customEvent = $.Event({
                        type: 'svg-mouseover',
                        areaId: currentPath.areaId
                    });
                    $rootNode.trigger(customEvent);
                    if (!customEvent.isDefaultPrevented()) {
                        mouseOverHandler(currentPath);
                    }
                });
                currentPath.mouseout(function() {
                    var customEvent = $.Event({
                        type: 'svg-mouseout',
                        areaId: currentPath.areaId
                    });
                    $rootNode.trigger(customEvent);
                    if (!customEvent.isDefaultPrevented()) {
                        mouseOutHandler(currentPath);
                    }
                });
                currentPath.click(function() {
                    var customEvent = $.Event({
                        type: 'svg-click',
                        areaId: currentPath.areaId
                    });
                    $rootNode.trigger(customEvent);
                    if (!customEvent.isDefaultPrevented()) {
                        clickHandler(currentPath);
                    }
                });
            });
            this.$rootNode.trigger($.Event({type: 'svg-ready'}));
        },

        mouseOverPath: function(path) {
            path.animate(this.onHoverAttrs, 500);
        },

        mouseOutPath: function(path) {
            path.animate(this.pathAttrs, 500);
        },

        clickPath: function(path) {
            path.animate(this.onClickAttrs, 500);
        },

        trigger: function(id, eventType) {
            var path = this.pathsById[id];
            if (eventType === 'mouseover') this.mouseOverPath(path)
            else if (eventType === 'mouseout') this.mouseOutPath(path)
            else if (eventType === 'click') this.clickPath(path)
        }
    };

    /*
     *  $.svgmap
     *      direct access to the classes and options of the plugin
     */
    $[PLUGIN_NAME] = svgmap;

    /*
     *  $.fn.svgmap([options])
     *      jQuery method to apply the plugin to selected elements
     */
    $.fn[PLUGIN_NAME] = function(options) {
        var map,
            $rootNode;
        if (options == null || $.isPlainObject(options)) {
            return this.each(function() {
               $rootNode = $(this);
               if (typeof $rootNode.data(PLUGIN_NAME) != 'undefined') return;
               map = new svgmap.Map($rootNode, options); 
               $rootNode.data(PLUGIN_NAME, map);
            });
        }
        return this;
    };

    /*
     *  initPlugin()
     *      internal function for use in initializing the plugin settings
     *      based on data- attributes in the <script> tag
     */
    function initPlugin() {
        var $scriptTag = $('script').filter(':last'),
            scriptContent = $scriptTag.get(0).innerHTML;
        if ($scriptTag.data('autoload')) {
            TabGroup.pluginOptions.autoload = true;
        }
        $(document).ready(function() {
            if (svgmap.pluginOptions.autoload) {
                //active the tab_group() plugin for anything with a class of 'tab_group'
                $('.' + PLUGIN_NAME)[PLUGIN_NAME]();
            }
            if (scriptContent) {
                $.globalEval(scriptContent);
            }
        });
    };
    initPlugin();

})(jQuery, Raphael);