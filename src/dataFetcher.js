// Data fetcher module
const { ErrorHelper, Constants } = require('eae-utils');


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
DataFetcher.prototype.fetchDataFromServer = function(startDate, endDate, folderPath) {
    console.log('Fetching data from ' + startDate + ' to ' + endDate);
    return new Promise(function (resolve, reject) {
        resolve(folderPath);
    });
};

/**
 * @fn saveDataAsCSV
 * @desc
 * @constructor
 */
DataFetcher.prototype.saveDataAsCSV = function (data, username, folderPath) {

};


module.exports = DataFetcher;

