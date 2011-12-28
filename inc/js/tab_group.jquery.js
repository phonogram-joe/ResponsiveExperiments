/*
    Copyright Joseph C. Savona 2011-2012
    redistribution or use without author's permission is NOT allowed.

    * depends on jQuery 1.7+ and underscore 1.2+
    * any javscript included within the body of the script tag that refers to this file
        will be executed (eval'ed) when the script loads and jQuery ready event
        fires
    * if the script tag that refers to this file has an attribute/value 
        data-autoload="true", then any DOM nodes with a class of 'tab_group'
        will automaticaly have the plugin effect applied at jQuery ready event

    inspired by Cris Coyier's 'Organic Tabs' at http://css-tricks.com/organic-tabs/
*/
(function($) {
    var context = this,
        PLUGIN_NAME = 'tab_group',
        TabGroup = {};

    /*
     *  TabGroup.TabView
     *      class representing a tab group including its nav section, tab blocks,
     *      and the associated behaviors/options. html structure should be as follows:
     *
     *      <div id="tabOne" class="tab_group">
     *          <ul class="tab_nav group">
     *              <li><a href="#html" class="active">HTML</a></li>
     *              <li><a href="#css">Styles</a></li>
     *          </ul>
     *          <div class="tabs">
     *              <div id="html">...</div>
     *              <div id="css">...</div>
     *          </div>
     *      </div>
     *
     *      The <ul> with <li> containing <a> tags is required. All other tags
     *      can be of any tag type, so long as they have the appropriate class
     *      and they are set to display:block. 
     *
     *      The href of the .tab_nav_group's <a> tags should match up with the
     *      id of the children of the .tabs container
     */
    TabGroup.TabView = function($root, options) {
        _.bindAll(this, 'onNavClick', 'onReady');

        this.options = _.extend({}, TabGroup.defaultOptions, options);
        this.$root = $root;
        this.$nav = this.$root.find('.tab_nav');
        this.$tabs = this.$root.find('.tabs');
        //default tab is the first one without the 'inactive' class
        this.$currentTab = this.$tabs.children().not('.inactive').filter(':first');
        //and then all other tabs are hidden (whether they had 'inactive' or not)
        this.$tabs.children().not(this.$currentTab).css({
            position: "relative",
            top: 0,
            left: 0,
            display: "none"
        });

        this.$nav.on('click', 'li a', this.onNavClick);
        if (this.options.openToHash) {
            $(document).ready(this.onReady);
        }
    }
    TabGroup.TabView.prototype = {
        /*
         *  activateTab(tabId, isAnimate)
         *      internal function to perform actual tab switching
         */
        activateTab: function(tabId, isAnimate) {
            var $currentListItem,
                $newListItem,
                $currentTab,
                $newTab,
                thisTabGroup = this,
                fadeOutSpeed = Modernizr.opacity ? this.options.speed : 0;
            //do not switch if already in process of animated switch
            if (this.$tabs.children().filter(':animated').size()) return false;

            $currentTab = this.$currentTab;
            $newTab = tabId instanceof $ ? tabId : this.$tabs.find('#' + tabId);
            //bail out if there is no tab with matching ID or current/new are same
            if (!$newTab.size() || $currentTab.is($newTab)) return false;
            $currentListItem = this.$nav.find('li.active');
            $newListItem = this.$nav.find('a').filter('[href=#' + tabId + ']').parent();

            if (isAnimate) {
                //fix the starting height for the tab wrapper so we can animate it
                this.$tabs.height(this.$tabs.height());
                //ensure all animations have stopped
                this.$tabs.stop(true,true);
                $newTab.stop(true,true);
                //fade out the old tab contents first
                $currentTab.stop(true,true).fadeOut(fadeOutSpeed, function() {
                    //trigger custom event for the hidden tab
                    $currentTab.trigger('tabhidden:' + PLUGIN_NAME);
                    
                    //fade in the content of the newly selected tab
                    $newTab.fadeIn(thisTabGroup.options.speed);

                    //simulataneously animate the height of the tab wrapper to adjust 
                    //to the selected tab's height
                    thisTabGroup.$tabs.animate({
                        height: $newTab.height()
                    }, thisTabGroup.options.speed, function() {
                        //remove explicit height after animation finishes so that
                        //tab wrapper will resize automatically
                        thisTabGroup.$tabs.css('height', '');
                        
                        //also set the list item active classes
                        $currentListItem.removeClass('active');
                        $newListItem.addClass('active');
                        $newTab.trigger('tabshown:' + PLUGIN_NAME);
                    });

                    
                });
            } else {
                $currentListItem.removeClass('active');
                $newListItem.addClass('active');
                $currentTab.stop(true,true).fadeOut(0);
                $newTab.stop(true,true).fadeIn(0);
            }
            this.$currentTab = $newTab;
            return true;
        },

        /*
         *  onReady()
         *      internal event for use when deep linking is enabled. if so, 
         *      attempt to set the active tab using the URL hash if it 
         *      matches a tab ID.
         *
         *      by default, the switch will be non-animated. to animate, set
         *      setting option 'animateOnDeepLink' to true
         */
        onReady: function() {
            this.activateTab(window.location.hash.replace('#',''), this.options.animateOnDeepLink);
        },

        /*
         *  onNavClick($event)
         *      internal event handler for use when a nav link is clicked. selects
         *      the corresponding tab if not already active.
         *
         *      by default, the switch will be animated. change to non-animated by
         *      setting option 'animateOnClick' to false
         */
        onNavClick: function($event) {
            var didSwitch = this.activateTab($($event.currentTarget).attr('href').replace('#',''), this.options.animateOnClick);

            //if deep linking is not enabled, don't bother
            //to change the URL hash. if enabled,
            //let the hash change so the user can bookmark
            //otherwise, if nothing happened as a result of the switch 
            //then prevent the link follow (eg no matching
            //tab or the tab was already active)
            if (!this.options.deepLinking || !didSwitch) {
                $event.preventDefault();
            }
        },

        /*
         *  select(tabId)
         *      select & show the given tab if not already active. param can be either the id
         *      of the tab to show, or a jquery object wrapping that tab's root node.
         *
         *      by default, the switch to new tab is not animated. change to animated by 
         *      setting option 'animateOnSelect' to true
         *
         *  returns: true if the tab was switched to, false otherwise. note that if the tab
         *      was already active or not found false will be returned.
         */
        select: function(tabId) {
            return this.activateTab(tabId, this.options.animateOnSelect);
        },

        /*
         *  length()
         *      returns the number of tabs (based on the number of list items with links
         *      in the nav area)
         */
        length: function() {
            return this.$nav.find('li a').size();
        },

        /*
         *  option(property[, value])
         *      set/get the given option property. if two args given, sets.
         *      if one, returns the existing property.
         *      either way, the (newly) current value will be returned.
         */
        option: function() {
            var args = Array.prototype.slice.call(arguments);
            if (args.length === 1) {
                return this.options[args[0]];
            } else if (args.length === 2) {
                return this.options[args[0]] = args[1];
            }
            return null;
        }
    }

    TabGroup.defaultOptions = {
        speed: 300,
        autoload: false,
        deepLinking: false,
        openToHash: true,
        animateOnClick: true,
        animateOnSelect: false,
        animateOnDeepLink: false
    }
    
    /*
     *  $.tab_group
     *      provides direct access to the root of the plugin classes
     */
    $[PLUGIN_NAME] = TabGroup;
    
    /*
     *  $.fn.tab_group()
     *      core plugin functionality, for attaching tab behavior to
     *      (a) specified element(s)
     *
     *  $('selector').tab_group({...options...})
     *      converts all the selected items to TabViews
     *
     *  $('selector').tab_group(method[, ...args])
     *      calls methods against the TabView of the first selected
     *      element. methods:
     *          method "option", 1/2 params. if one param, gets the value
     *              of an option. if 2 params, sets the option given in the
     *              first param to the value of the second param
     *              eg. $('#tabs').tab_group("option", "speed", 500)
     *          method "select", 1 param. selects the tab with the ID given
     *              in param. to select the top with id tabOne:
     *              $('#tabs').tab_group("select", "tabOne");
     */
    $.fn[PLUGIN_NAME] = function(options) {
        var tabView,
            $wrapper;
        if (options == null || $.isPlainObject(options)) {
            return this.each(function() {
                $wrapper = $(this);
                //skip duplicate initialization for a given node
                if (typeof $wrapper.data(PLUGIN_NAME) != 'undefined') return;
                //if not exists both crate the TabView obj. & save on node
                tabView = new TabGroup.TabView($wrapper, options);
                $wrapper.data(PLUGIN_NAME, tabView);
            });
        } else {
            tabView = this.data(PLUGIN_NAME);
            if (typeof tabView === 'undefined' || tabView == null) return;
            if (args.length === 2 && args[0] === 'select') {
                return tabView.select(args[1]);
            } else if (args.length > 0 && args[0] === 'option') {
                if (args.length === 2) {
                    return tabView.option(args[0], args[1]);
                } else {
                    return tabView.option(args[0]);
                }
            }
        }
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
            TabGroup.defaultOptions.autoload = true;
        }
        if ($scriptTag.data('speed')) {
            TabGroup.defaultOptions.speed = $scriptTag.data('speed');
        }
        $(document).ready(function() {
            if (TabGroup.defaultOptions.autoload) {
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