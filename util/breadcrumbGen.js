let path = require('path');

'use strict';

/**
 * Metalsmith plugin for generating breadcrumbs tree in metadata.
 *
 * @return {Function}
 */
module.exports = function plugin() {

    // Obtain platform specific path separator
    let sep = path.sep;
    // Regex to check if a key is index
    let indexRegex = /^index\x2E[a-zA-Z]+/m;

    return function (files, metalsmith, done) {
        // Copy of files. It is plugin result
        let copy = {};

        // Fill breadcrumbs tree
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

        // Check is node is localized (not default locale)
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

        // Add parent to each node in previously filled breadcrumbs tree
        // Takes current node, parent node and parent node index key
        let setParent = function (node, parentNode, parentIndex) {
            let nextParentIndex = null;

            // for all index pages
            Object.keys(node).forEach(function (nodeIndex) {
                // Check if it is index
                if (!indexRegex.test(nodeIndex))
                    return;

                // Prepare index key for next iteration
                nextParentIndex = nodeIndex;
                // Set current node parent using parent index key
                node[nodeIndex].parent = parentNode && parentIndex && parentNode[parentIndex] 
                    ? parentNode[parentIndex] 
                    : null;
            });

            // for other pages
            Object.keys(node).forEach(function (nodeNotIndex) {
                // Check if it is NOT index
                if (indexRegex.test(nodeNotIndex))
                    return;

                // Prepare parent for next iteration
                let parent = isLocale(nodeNotIndex) ? null : node;
                // Prepare node for next iteration
                let currentNode = node[nodeNotIndex];

                setParent(currentNode, parent, nextParentIndex);
            });
        };

        setParent(copy, null, null);

        // Assign result
        metalsmith._metadata.breadcrumbs = copy;
        metalsmith._metadata.breadcrumbIndexRegex = indexRegex;

        done();
    };
};
