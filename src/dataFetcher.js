// Data fetcher module
// const { ErrorHelper, Constants } = require('eae-utils');
const fs = require('fs-extra');
let config = require('../config/opal.compute.config.js');
const { ErrorHelper } =  require('eae-utils');
const path = require('path');


/**
 * @class DataFetcher
 * @desc Data fetching class that ensures to fetch data.
 * @constructor
 */
function DataFetcher(postgresClient) {
    this.postgresClient = postgresClient;
    this.fetchDataFromServer = DataFetcher.prototype.fetchDataFromServer.bind(this);
    this.saveDataAsCSV = DataFetcher.prototype.saveDataAsCSV.bind(this);
    this.getSalt = DataFetcher.prototype.getSalt.bind(this);
}

/**
 * @fn fetchDataFromServer
 * @desc Fetches data from server and saves it in a csv.
 * @param startDate {Date} Starting date from which data to should be fetched.
 * @param endDate {Date} Ending date until which data should be fetched.
 * @constructor
 */
DataFetcher.prototype.fetchDataFromServer = function(startDate, endDate, sample, folderPath) {
    let _this = this;
    sample = sample !== null && sample !== undefined ? sample : 1;
    // Algorithm
    // Fetch all distinct users
    // Handle sampling and fetch data only for sampled users
    // Pseudonymize username with random salt, delete the salt after pseudonymization
    return new Promise(function (resolve, reject) {
        fs.ensureDir(folderPath).then(function () {
            const users_query = {
                name: 'fetch-users',
                text: 'SELECT * FROM (SELECT DISTINCT(emiter_id) ' +
                'FROM public.opal as telecomdata\n' +
                'WHERE telecomdata.event_time >= $1 and telecomdata.event_time <= $2) AS usersid ORDER BY random();',
                values: [startDate.toISOString(), endDate.toISOString()]
            };
            _this.postgresClient.query(users_query)
                .then(function (result) {
                    let requiredNumElems = Math.floor(result.rows.length * sample);
                    const requiredUsers = result.rows.slice(0, requiredNumElems);
                    const requiredUsersId = [];
                    requiredUsers.forEach(function (entry) {
                        requiredUsersId.push(entry.emiter_id);
                    });
                    const salt = _this.getSalt(6);
                    const query = {
                        name: 'fetch-data',
                        text: 'SELECT event_time as datetime, interaction_type as interaction, ' +
                        'interaction_direction as direction, md5(CONCAT(emiter_id, $3::text)) as emiter_id, md5(CONCAT(receiver_id, $3::text)) ' +
                        'as correspondent_id, telecomdata.antenna_id as antenna_id, ' +
                        'latitude, longitude, location_level_1, location_level_2, duration as call_duration  ' +
                        'FROM public.opal as telecomdata\n' +
                        'INNER JOIN public.antenna_records as antenna_records\n' +
                        'ON (telecomdata.antenna_id=antenna_records.antenna_id AND ' +
                        'telecomdata.event_time >= antenna_records.date_from AND ' +
                        'telecomdata.event_time <= antenna_records.date_to)\n' +
                        'WHERE telecomdata.event_time >= $1 and telecomdata.event_time <= $2 and telecomdata.emiter_id = ANY($4);',
                        values: [startDate.toISOString(), endDate.toISOString(), salt, requiredUsersId]
                    };
                    _this.postgresClient.query(query)
                        .then(function (result) {
                            let userdata = {};
                            result.rows.forEach(function (entry) {
                                 if (!userdata.hasOwnProperty(entry.emiter_id)){
                                     userdata[entry.emiter_id] = 'interaction,direction,correspondent_id,datetime,' +
                                         'call_duration,antenna_id,latitude, longitude,' +
                                         'location_level_1,location_level_2\n';
                                 }
                                 let datastring = [entry.interaction, entry.direction, entry.correspondent_id, entry.datetime.toLocaleString(),
                                     entry.call_duration, entry.antenna_id, entry.latitude, entry.longitude, entry.location_level_1.trim(),
                                     entry.location_level_2.trim()];
                                 userdata[entry.emiter_id] += (datastring.join(',') + '\n');
                            });
                            let promises_list = [];
                            for(let key in userdata) {
                                if (userdata.hasOwnProperty(key)){
                                    promises_list.push(_this.saveDataAsCSV(userdata[key], key, folderPath));
                                }
                            }
                            Promise.all(promises_list).then(function (__unused__result) {
                                resolve(folderPath);
                            }, function (error) {
                                reject(error);
                            });
                        })
                        .catch(function (error) {
                            reject(ErrorHelper('Error in data fetching from postgres', error));
                        });
                })
                .catch(function (error) {
                    reject(ErrorHelper('Error in fetching users from postgres', error));
                });
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
DataFetcher.prototype.saveDataAsCSV = function (data, username, folderPath) {
    let csvpath = path.join(folderPath, username + '.csv');
    return new Promise(function (resolve, reject) {
        fs.writeFile(csvpath, data, 'utf-8', function (err) {
            if (err) reject(err);
            else resolve(csvpath);
        });
    });
};

DataFetcher.prototype.getSalt = function (len) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < len; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
};

module.exports = DataFetcher;

