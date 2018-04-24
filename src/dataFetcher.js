// Data fetcher module
// const { ErrorHelper, Constants } = require('eae-utils');
const fs = require('fs-extra');
let config = require('../config/opal.compute.config.js');

/**
 * @class DataFetcher
 * @desc Data fetching class that ensures to fetch data.
 * @constructor
 */
function DataFetcher() {
    this.fetchDataFromServer = DataFetcher.prototype.fetchDataFromServer.bind(this);
    this.saveDataAsCSV = DataFetcher.prototype.saveDataAsCSV.bind(this);
}

/**
 * @fn fetchDataFromServer
 * @desc Fetches data from server and saves it in a csv.
 * @param startDate {Date} Starting date from which data to should be fetched.
 * @param endDate {Date} Ending date until which data should be fetched.
 * @constructor
 */
DataFetcher.prototype.fetchDataFromServer = function(__unused__startDate, __unused__endDate, folderPath) {
    // console.log('Fetching data from ' + startDate + ' to ' + endDate);
    //TODO: Change this after intergration with DB
    return new Promise(function (resolve, reject) {
        fs.copy(config.opalDataPath, folderPath).then(function () {
            resolve(folderPath);
        }, function (error) {
            reject(error);
        });
    });
};

/**
 * @fn saveDataAsCSV
 * @desc Save data received as CSV
 * @constructor
 */
DataFetcher.prototype.saveDataAsCSV = function (__unused__data, __unused__username, __unused__folderPath) {

};


module.exports = DataFetcher;

