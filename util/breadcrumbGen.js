let path = require('path');

'use strict';

/**
 * Metalsmith plugin for generating breadcrumbs tree in metadata.
 *
 * @return {Function}
 */
module.exports = function plugin() {

    let sep = path.sep;
    let indexRegex = /index\x2E[a-zA-Z]+/;

    return function (files, metalsmith, done) {
        let copy = {};

        Object.keys(files).forEach(function (file) {
            let arr = file.split(sep);

            let lvl = copy;
            for (let i = 0; i < arr.length; i++) {
                if (!(arr[i] in lvl))
                    lvl[arr[i]] = {};
                lvl = lvl[arr[i]];
            }

            lvl.file = file;
            lvl.path = files[file].path;
            lvl.title = files[file].title;
        });

        let isLocale = function (node) {
            if (!metalsmith._metadata.locales)
                return;

            let result = false;

            metalsmith._metadata.locales.forEach(function (l) {
                if (node === l)
                    result = true;
            });

            return result;
        }

        let setParent = function (node, parentNode) {
            // for all index pages
            Object.keys(node).forEach(function (nodeIndex) {
                if (!indexRegex.test(nodeIndex))
                    return;
                node[nodeIndex].parent = parentNode && parentNode[index] ? parentNode[index] : null;
            });

            // for other dirs
            Object.keys(node).forEach(function (nodeNotIndex) {
                if (indexRegex.test(nodeNotIndex))
                    return;

                let parent = isLocale(nodeNotIndex) ? null : node;
                let currentNode = node[nodeNotIndex];

                setParent(currentNode, parent);
            });
        };

        setParent(copy, null);

        metalsmith._metadata.breadcrumbs = copy;
        metalsmith._metadata.breadcrumbIndex = index;

        done();
    };
};
