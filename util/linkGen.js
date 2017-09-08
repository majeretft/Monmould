'use strict';

/**
 * Metalsmith plugin for generating metadata links usable by metalsmith-sitemap plugin.
 *
 * @param {Object} options
 *   @property {String} propertyCaption (optional)
 * @return {Function}
 */
module.exports = function plugin(opts) {
    /**
     * Init
     */
    opts = opts || {};

    /**
     * Main plugin function
     */
    return function (files, metalsmith, done) {
        Object.keys(files).forEach(function (file) {
            let data = files[file];
            let altLinks = [];

            for (let val in data.altFiles) {
                if (val === data.locale || !data.altFiles[val])
                    continue;

                altLinks.push({
                    lang: data.altFiles[val].locale,
                    url: data.altFiles[val].path || '/'
                });
            }

            data[opts.propertyCaption || 'links'] = altLinks;
        });
        
        done();
    };
};
