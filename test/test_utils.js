// Utilities for testing
const fs = require('fs');
const { Constants_Opal } = require('opal-utils');


/**
 * @class TestUtils
 * @desc Utilities to be used for testing.
 * @param testServer TestServer
 * @constructor
 */
function TestUtils() {
    this.getPostData = TestUtils.prototype.getPostData.bind(this);
    this.getFileBase64 = TestUtils.prototype.getFileBase64.bind(this);
}

/**
 * @fn getPostData
 * @desc Return data for Post request, replace the actual arguments if data is supplied.
 * @param data {JSON} JSON object that will have parameters that needs to be replaced, else defaults will be used.
 * @return {{algoName: string, description: string, algorithm: {code: string, className: string }}}
 */
TestUtils.prototype.getPostData = function (data) {
    let _this = this;
    data = data ? data : {};
    let filename = data.hasOwnProperty('filename') ? data.filename : 'test/algorithms/density.py';
    return {
        algoName: data.hasOwnProperty('algoName') ? data.algoName : 'density',
        description: data.hasOwnProperty('description') ? data.description : 'Population density',
        algorithm: {
            code: _this.getFileBase64(filename),
            className: data.hasOwnProperty('className') ? data.className : 'PopulationDensity',
            reducer: data.hasOwnProperty('reducer') ? data.reducer : Constants_Opal.OPAL_AGGREGATION_METHOD_SUM
        }
    };
};

/**
 * @fn getFileBase64
 * @desc Read file in base64 string.
 * @param filepath
 * @return {string}
 */
TestUtils.prototype.getFileBase64 = function (filepath) {
    let data = fs.readFileSync(filepath, 'utf8');
    return new Buffer(data).toString('base64');
};

module.exports = TestUtils;
