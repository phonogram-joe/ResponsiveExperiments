/*
    derived from Cris Coyier's 'Organic Tabs' at http://css-tricks.com/organic-tabs/
*/
(function($) {
    var context = this,
        PLUGIN_NAME = 'tab_group';

    $[PLUGIN_NAME] = function(el, options) {
    
        var base = this;
        base.$el = $(el);
        base.$nav = base.$el.find(".tab_nav");
                
        base.init = function() {
        
            base.options = $.extend({},$[PLUGIN_NAME].defaultOptions, options);
            
            // Accessible hiding fix
            $(".inactive").css({
                "position": "relative",
                "top": 0,
                "left": 0,
                "display": "none"
            });

            base.$nav.delegate("li > a", "click", function() {
                //TODO: should be able to click a different tab
                //      and go to it without waiting for
                //      transition animation to finish
            
                // Figure out current list via CSS class
                var curList = base.$el.find("a.active").attr("href").substring(1),
                
                // List moving to
                $newList = $(this),
                    
                // Figure out ID of new list
                listID = $newList.attr("href").substring(1),
                
                // Set outer wrapper height to (static) height of current inner list
                $allListWrap = base.$el.find(".tabs"),
                curListHeight = $allListWrap.height();
                $allListWrap.height(curListHeight);
                                        
                if ((listID != curList) && ( base.$el.find(":animated").length == 0)) {
                                        
                    // Fade out current list
                    base.$el.find("#"+curList).fadeOut(Modernizr.opacity ? base.options.speed : 0, function() {
                        $(this).trigger('tabhidden:tab_group');

                        // Fade in new list on callback
                        base.$el.find("#"+listID).fadeIn(base.options.speed, function() {
                            $(this).trigger('tabshown:tab_group');
                        });
                        
                        // Adjust outer wrapper to fit new list snuggly
                        var newHeight = base.$el.find("#"+listID).height();
                        $allListWrap.animate({
                            height: newHeight
                        }, base.options.speed, function() {
                            $allListWrap.css('height', '');
                        });
                        
                        // Remove highlighting - Add to just-clicked tab
                        base.$el.find(".tab_nav li a").removeClass("active");
                        $newList.addClass("active");
                    });   
                }
                
                return base.options.deepLinking; //if no deep linking cancel the link follow
            });
            
        };
        /*
         *  openDefaultTab()
         *      attempts to open the default tab for cases where either 
         *      a) one tab has a data-autoopen=true attribute OR
         *      b) the URL contains a hash tag matching the ID of one of the tabs
         *
         *      in either of those cases, the tab to open will be opened with the
         *      default tab-switching animation (same as if the user had clicked on
         *      the tab). 
         */
        base.openDefaultTab = function() {
            var currentHash = null,
                $linkForHash;
            if (base.options.deepLinking) {
                currentHash = window.location.hash.replace('#','');
                if (currentHash.length <= 0) currentHash = null;
            }
            if (currentHash == null) {
                currentHash = base.$el.find('.tabs > *').filter('[data-autoopen="true"]').attr('id');
            }
            if (currentHash != null && currentHash.length > 0) {
                $linkForHash = base.$el.find('a').filter('[href=#' + currentHash + ']');
                if ($linkForHash.size()) {
                    $linkForHash.trigger('click');
                }
            }
            
        }
        base.init();
        $(document).ready(base.openDefaultTab);
    };
    
    $[PLUGIN_NAME].defaultOptions = {
        speed: 300,
        autoload: false,
        deepLinking: false
    };
    
    $.fn[PLUGIN_NAME] = function(options) {
        return this.each(function() {
            (new $[PLUGIN_NAME](this, options));
        });
    };

    function initPlugin() {
        var $scriptTag = $('script').filter(':last'),
            scriptContent = $scriptTag.get(0).innerHTML;
        if ($scriptTag.data('autoload')) {
            $[PLUGIN_NAME].defaultOptions.autoload = true;
        }
        if ($scriptTag.data('speed')) {
            $[PLUGIN_NAME].defaultOptions.speed = $scriptTag.data('speed');
        }
        $(document).ready(function() {
            if ($[PLUGIN_NAME].defaultOptions.autoload) {
                //active the tab_group() plugin for anything with a class of 'tab_group'
                $('.' + PLUGIN_NAME)[PLUGIN_NAME]();
            }
            if (scriptContent) {
                $.globalEval(scriptContent);
            }
        });
    }
    initPlugin();
    
}).call(this, jQuery);