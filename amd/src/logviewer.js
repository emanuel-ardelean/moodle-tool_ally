// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Ally admin tool log view.
 *
 * @package   tool_ally
 * @copyright Copyright (c) 2018 Open LMS / 2023 Anthology Inc.
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// Configure RequireJS first
(function() {
    var pluginJSURL = function(path) {
        return M.cfg.wwwroot + "/pluginfile.php/" + M.cfg.contextid + "/tool_ally/" + path;
    };

    require.config({
        enforceDefine: false,
        paths: {
            "tool_ally/vue_2_5_16": [
                "https://cdn.jsdelivr.net/npm/vue@2.5.16/dist/vue.common",
                pluginJSURL("vendorjs/vue")
            ],
            "tool_ally/vuerouter_2_5_3": [
                "https://cdn.jsdelivr.net/npm/vue-router@2.5.3/dist/vue-router.common",
                pluginJSURL("vendorjs/vuerouter")
            ],
            "tool_ally/vuedatatable": pluginJSURL("vendorjs/vuedatatable"),
            "tool_ally/vuecomp": pluginJSURL('vue/comps')
        },
        shim: {
            'tool_ally/vue_2_5_16': {
                exports: 'Vue'
            },
            'tool_ally/vuerouter_2_5_3': {
                deps: ['tool_ally/vue_2_5_16'],
                exports: 'VueRouter'
            },
            'tool_ally/vuedatatable': {
                deps: ['tool_ally/vue_2_5_16'],
                exports: 'VueDataTable'
            }
        }
    });
})();

// Define the combined module
define([
    'jquery',
    'tool_ally/vue_2_5_16',
    'tool_ally/vuerouter_2_5_3',
    'tool_ally/vuedatatable',
    'core/ajax',
    'tool_ally/vuecomp/th-Filter',
    'tool_ally/vuecomp/td-HTML',
    'tool_ally/vuecomp/td-LogDetails'
], function($, Vue, VueRouter, VueDataTable, ajax, thFilter, tdHTML, tdLogDetails) {
    'use strict';

    // Initialize Vue and its plugins
    Vue.use(VueRouter);
    Vue.use(VueDataTable.default);

    var LogViewer = {
        vue: null,
        globalComponents: {},

        getBootstrapVersion: function() {
            var version = 2;
            if (window.$ && window.$.fn && window.$.fn.tooltip && window.$.fn.tooltip.Constructor) {
                version = window.$.fn.tooltip.Constructor.VERSION || 2;
            }
            return parseInt(version);
        },

        applyBootstrapClass: function() {
            $('body').addClass('bs-major-version-' + this.getBootstrapVersion());
        },

        setupVue: function(vueOpts) {
            var self = this;
            return new Promise(function(resolve) {
                $(document).ready(function() {
                    var opts = {
                        el: '#app',
                        router: null
                    };

                    // Merge options
                    Object.assign(opts, vueOpts);

                    if (opts.routes) {
                        opts.router = new VueRouter({
                            routes: opts.routes
                        });
                    }

                    // Register global components
                    if (opts.globalComponents) {
                        Object.keys(opts.globalComponents).forEach(function(key) {
                            Vue.component(key, opts.globalComponents[key]);
                        });
                    }

                    self.vue = new Vue(opts).$mount('#app');
                    resolve(self.vue);
                });
            });
        },

        init: function() {
            var self = this;
            var logData = null;

            // Apply bootstrap class
            this.applyBootstrapClass();

            // Setup global components
            this.globalComponents = {
                thFilter: thFilter,
                tdHTML: tdHTML,
                tdLogDetails: tdLogDetails
            };

            // Create datatable template
            var dumpList = {
                props: ['data'],
                template: '<div id="dt-allylog"><datatable v-bind="data"></datatable></div>'
            };

            // Initial data load
            return ajax.call([{
                methodname: 'tool_ally_get_logs',
                args: {
                    query: null
                }
            }])[0].then(function(data) {
                logData = data;

                var routes = [
                    {path: '/', redirect: '/logView'},
                    {path: '/logView', component: dumpList, props: {data: logData}}
                ];

                return self.setupVue({
                    data: {
                        logData: logData
                    },
                    routes: routes,
                    globalComponents: self.globalComponents,
                    watch: {
                        'logData.query': {
                            handler: function(query) {
                                ajax.call([{
                                    methodname: 'tool_ally_get_logs',
                                    args: {
                                        query: JSON.stringify(query)
                                    }
                                }])[0].then(function(newData) {
                                    logData = newData;
                                    self.vue.logData.data = logData.data;
                                    self.vue.logData.total = logData.total;
                                });
                            },
                            deep: true
                        }
                    }
                });
            });
        }
    };

    return LogViewer;
});