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
            stroke: '#000',
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

    svgmap.Map = function($rootNode, options) {
        var svgUrl;
        this.$rootNode = $rootNode;
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
            })
        }
    };
    svgmap.Map.prototype = {
        init: function(data) {
            var R,
                width,
                height,
                pathAttrs,
                onHoverAttrs,
                onClickAttrs,
                areaIndex,
                areaCount,
                $area,
                $svg,
                $rootNode;
            $rootNode = this.$rootNode;
            $svg = $(data).find('svg');

            width = parseInt($svg.attr('width'), 10);
            $rootNode.width(width);
            height = parseInt($svg.attr('height'), 10);
            $rootNode.height(height);

            R = Raphael($rootNode.get(0), width, height);
            pathAttrs = this.pathAttrs;
            onHoverAttrs = this.onHoverAttrs;
            onClickAttrs = this.onClickAttrs;

            $svg.find('path').each(function() {
                var currentPath;
                $area = $(this);
                currentPath = R.path($area.attr('d'));
                currentPath.attr(pathAttrs);
                currentPath.mouseover(function() {
                    currentPath.animate(onHoverAttrs, 500);
                });
                currentPath.mouseout(function() {
                    currentPath.animate(pathAttrs, 500);
                });
                currentPath.click(function() {
                    currentPath.animate(onClickAttrs, 500);
                });
            });
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