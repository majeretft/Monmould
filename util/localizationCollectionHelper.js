'use strict';

var Multilang = require('./localizationCollectionCode');

module.exports = function (ops) {
    var multilang = new Multilang(ops);

    return multilang.getPlugin();
};

