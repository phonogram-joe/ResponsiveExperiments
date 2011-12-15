(function($) {

    $.organicTabs = function(el, options) {
    
        var base = this;
        base.$el = $(el);
        base.$nav = base.$el.find(".tab_nav");
                
        base.init = function() {
        
            base.options = $.extend({},$.organicTabs.defaultOptions, options);
            
            // Accessible hiding fix
            $(".inactive").css({
                "position": "relative",
                "top": 0,
                "left": 0,
                "display": "none"
            });

            $(window).bind('resize', debounce(function() {
                //TODO: stop the current animation and reset
            }, 50));
            
            base.$nav.delegate("li > a", "click", function() {
                //TODO: should be able to click a different tab
                //      and go to it without waiting for
                //      transition animation to finish
                //      should work properly with window resize as well
            
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
                    base.$el.find("#"+curList).fadeOut(base.options.speed, function() {
                        
                        // Fade in new list on callback
                        base.$el.find("#"+listID).fadeIn(base.options.speed);
                        
                        // Adjust outer wrapper to fit new list snuggly
                        var newHeight = base.$el.find("#"+listID).height();
                        $allListWrap.animate({
                            height: newHeight
                        });
                        
                        // Remove highlighting - Add to just-clicked tab
                        base.$el.find(".tab_nav li a").removeClass("active");
                        $newList.addClass("active");
                            
                    });
                    
                }   
                
                // Don't behave like a regular link
                // Stop propegation and bubbling
                return false;
            });
            
        };
        base.init();
    };
    
    $.organicTabs.defaultOptions = {
        "speed": 300
    };
    
    $.fn.organicTabs = function(options) {
        return this.each(function() {
            (new $.organicTabs(this, options));
        });
    };

    /*
     *  debounce(func,wait)
     *      @func: function to call
     *      @wait: the amount to wait before executing
     * 
     *  per underscore documentation:
     *      Returns a function, that, as long as it continues to be invoked, 
     *      will not be triggered. The function will be called after it stops
     *      being called for N milliseconds.
     *
     *  Underscore.js 1.2.3
     *  (c) 2009-2011 Jeremy Ashkenas, DocumentCloud Inc.
     *  Underscore is freely distributable under the MIT license.
     *  Portions of Underscore are inspired or borrowed from Prototype,
     *  Oliver Steele's Functional, and John Resig's Micro-Templating.
     *  For all details and documentation:
     *      http://documentcloud.github.com/underscore
     */
    function debounce(func,wait) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                func.apply(context, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
})(jQuery);