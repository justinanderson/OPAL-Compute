const ObjectID = require('mongodb').ObjectID;
const { ErrorHelper, Constants } = require('eae-utils');
const { Constants_Opal } = require('opal-utils');
const child_process = require('child_process');
const DataFetcher = require('./dataFetcher.js');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const os = require('os');
const axios = require('axios');
const url = require('url');

/**
 * @class JobExecutorAbstract
 * @param jobID {String} The job unique identifier in DB
 * @param jobCollection MongoDB collection to sync the job model against
 * @param jobModel {Object} Plain js Job model from the mongoDB, optional if fetchModel is called
 * @constructor
 */
function JobExecutorAbstract(jobID, postgresClient, jobCollection, jobModel) {
    this._jobID = new ObjectID(jobID);
    this._jobCollection = jobCollection;
    this._model = jobModel;
    this._callback = null;
    this._dataFetcher = new DataFetcher(postgresClient);
    this._tmpDirectory = null;
    this._child_process = null;
    this._dataDir = null;
    this._algorithm = null;
    this._kill_signal = 'SIGINT';
    this._aggregationStarted = false;

    // Bind member functions
    this.fetchData = JobExecutorAbstract.prototype.fetchData.bind(this);
    this.fetchModel = JobExecutorAbstract.prototype.fetchModel.bind(this);
    this.pushModel = JobExecutorAbstract.prototype.pushModel.bind(this);
    this._exec = JobExecutorAbstract.prototype._exec.bind(this);
    this._kill = JobExecutorAbstract.prototype._kill.bind(this);
    this.handleExecutionError = JobExecutorAbstract.prototype.handleExecutionError.bind(this);
    this.fetchAlgorithm = JobExecutorAbstract.prototype.fetchAlgorithm.bind(this);
    this._cleanUp = JobExecutorAbstract.prototype._cleanUp.bind(this);
    this._contactAggregationService = JobExecutorAbstract.prototype._contactAggregationService.bind(this);
    this._getAggregationServiceUrl = JobExecutorAbstract.prototype._getAggregationServiceUrl.bind(this);

    // Bind pure member functions
    this._preExecution = JobExecutorAbstract.prototype._preExecution.bind(this);
    this._postExecution = JobExecutorAbstract.prototype._postExecution.bind(this);
    this.startExecution = JobExecutorAbstract.prototype.startExecution.bind(this);
    this.stopExecution = JobExecutorAbstract.prototype.stopExecution.bind(this);
}


JobExecutorAbstract.prototype._getAggregationServiceUrl = function (event) {
    let _this = this;

    let aggregationEventUrl =  url.resolve(global.opal_compute_config.opalAggPrivServiceURL, '/' + event + '/');
    let jobEventUrl = url.resolve(aggregationEventUrl, _this._model._id.toString());
    return jobEventUrl;
}


JobExecutorAbstract.prototype._contactAggregationService = function (event) {
    let _this = this;
    return new Promise(function (resolve, reject) {
        let data = {};
        switch (event){
            case 'start':
                data = {
                    aggregationMethod: _this._algorithm.reducer,
                    keySelector: _this._model.params.keySelector
                };
                _this._aggregationStarted = true;
                break;
            default:
                if (!_this._aggregationStarted) {
                    resolve(true);
                    return;
                }
                _this._aggregationStarted = false;
                data = {};
        }
        axios.post(_this._getAggregationServiceUrl(event), data)
            .then(function (success) {
                resolve(success);
            })
            .catch(function (error) {
                reject(error);
            });
    });
};

/**
 * @fn handleExecutionError
 * @desc Handle any error that might arise at time of execution.
 * @param message {String} Defines the error at the time of execution.
 * @private
 */
JobExecutorAbstract.prototype.handleExecutionError = function(message, status) {
    let _this = this;
    status = (status !== null && status !== undefined) ? status : Constants.EAE_JOB_STATUS_ERROR;

    _this._model.status.unshift(status);
    _this._model.exitCode = 1;
    _this._model.message = message;
    _this._cleanUp();
    _this.pushModel().then(function() {
        _this._contactAggregationService('cancel').then(function (__unused__success){
            if (_this._callback !== null && _this._callback !== undefined)
                _this._callback(message, null);
        }, function (error) {
            message = 'Error in cancelling aggregation - ' + error.toString() + '\n' + message;
            if (_this._callback !== null && _this._callback !== undefined)
                _this._callback(message, null);
        });
    }, function(error) {
        message = 'Error in pushing model - ' + error.toString() + '\n' + message;
        if (_this._callback !== null && _this._callback !== undefined)
            _this._callback(message, null);
    });
};


/**
 * @fn _cleanUp
 * @desc Clean up the temporary directory created and child process if it exists.
 * @private
 */
JobExecutorAbstract.prototype._cleanUp = function () {
    let _this = this;

    // Remove child process if exists
    if (_this._child_process !== undefined && _this._child_process !== null) {
        delete _this._child_process;
    }

    // Remove tmpDirectory if exists
    if (_this._tmpDirectory !== undefined && _this._tmpDirectory !== null) {
        fse.removeSync(_this._tmpDirectory);
    }
};

/**
 * @fn fetchData
 * @desc Fetch data from the server and save in a tmpdir folder path.
 * @return {Promise} resolves to directory where data is saved.
 */
JobExecutorAbstract.prototype.fetchData = function () {
    let _this = this;

    // Create tmp directory and fetch data
    return new Promise(function (resolve, reject) {
        fs.mkdtemp(path.join(os.tmpdir(), 'opal-'), function (error, directoryPath) {
            if (error !== undefined && error !== null) {
                reject(error);
            } else {
                _this._tmpDirectory = directoryPath; // Save tmp dir
                _this._dataDir = path.join(_this._tmpDirectory, 'input');

                _this._model.status.unshift(Constants.EAE_JOB_STATUS_TRANSFERRING_DATA);
                _this.pushModel().then(
                    function(){
                        _this._dataFetcher.fetchDataFromServer(_this._model.params.startDate, _this._model.params.endDate, _this._model.params.sample, _this._dataDir)
                            .then(function (dataDir) {
                                resolve(dataDir);
                            }, function (error) {
                                reject(error);
                            });
                    }, function (error) {
                        reject(error);
                    });
            }
        });
    });
};


/**
 * @fn fetchAlgorithm
 * @desc Fetch algorithm from the AlgoService.
 * @return {Promise<any>} Resolves to algorithm to be fetched, rejects with an error.
 */
JobExecutorAbstract.prototype.fetchAlgorithm = function () {
    let _this = this;

    return new Promise(function (resolve, reject) {
        _this.fetchModel().then(
            function (jobModel) {
                let retrievalURL = url.resolve(global.opal_compute_config.opalAlgoServiceURL, '/retrieve/');
                let algorithmURL = url.resolve(retrievalURL, jobModel.params.algorithmName + '/');
                axios.get(algorithmURL).then(
                    function (response) {
                        if (response.status === 200){
                            _this._algorithm = response.data.item.algorithm;
                            resolve(_this._algorithm);
                        } else {
                            reject(ErrorHelper(response.data));
                        }
                    }, function (error) {
                        reject(ErrorHelper(error));
                    });
            }, function (error) {
                reject(ErrorHelper(error));
            });
    });
};


/**
 * @fn fetchModel
 * @desc Retrieve the job data model from the MongoDB jobs collection
 * @return {Promise} Resolve to the retrieved data model on success, errorStack on error
 */
JobExecutorAbstract.prototype.fetchModel = function() {
    let _this = this;

    return new Promise(function(resolve, reject) {
        _this._jobCollection.findOne({ _id : _this._jobID })
            .then(function(jobModel) {
                _this._model = jobModel;
                resolve(jobModel);
            }, function(error) {
                reject(ErrorHelper('Failed to fetch job ' + _this._jobID.toHexString(), error));
            });
    });
};

/**
 * @fn pushModel
 * @desc Store the job data model into the MongoDB jobs collection
 * @return {Promise} Resolve to the updated data model on success, errorStack on error
 */
JobExecutorAbstract.prototype.pushModel = function() {
    let _this = this;

    return new Promise(function(resolve, reject) {
        let replacementData = Object.assign({}, _this._model);
        delete replacementData._id; // Cleanup MongoDB managed _id field, if any
        _this._jobCollection.updateOne({ _id : _this._jobID }, {$set: replacementData})
            .then(function() {
                resolve(_this._model);
            }, function(error) {
                reject(ErrorHelper('Failed to push job ' + _this._jobID.toHexString(), error));
            });
    });
};

/**
 * @fn _exec
 * @desc Cleans model, create a child process and handle child process events
 * @param command {String} Shell command
 * @param args {Array} Arguments on the command line
 * @param options Child process options (env, cwd)
 * @private
 */
JobExecutorAbstract.prototype._exec = function(command, args, options) {
    let _this = this;

    let end_fn = function(status, code, message = '') {
        let save_fn = function() {
            _this.pushModel().then(function(success) {
                let aggregationCall = null;
                if (status === Constants_Opal.OPAL_JOB_STATUS_PRIVACY){
                    aggregationCall = 'finish';
                } else {
                    aggregationCall = 'cancel';
                }
                _this._contactAggregationService(aggregationCall).then(function (__unused__success) {
                    if (_this._callback !== null && _this._callback !== undefined)
                        _this._callback(null, success.status);
                }, function (error) {
                    if (_this._callback !== null && _this._callback !== undefined)
                        _this._callback(error, null);
                });
            }, function(error) {
                if (_this._callback !== null && _this._callback !== undefined)
                    _this._callback(error, null);
            });
        };

        _this._model.message = message;
        _this._model.endDate = new Date();
        _this._postExecution().then(function() {
            _this._model.status.unshift(status);
            _this._model.exitCode = code;
            _this._cleanUp();
            save_fn();
        }, function (error) {
            // Post execution error
            if (_this._child_process !== undefined) {
                delete _this._child_process;
            }
            _this.handleExecutionError('Post-exec - ' + error.toString());
        });
    }; // end_fn
    _this._preExecution().then(function() {
        _this._contactAggregationService('start').then(
            function (response) {
                if (response.status === 200){
                    // Fork a process on the machine
                    _this._child_process = child_process.spawn(command, args, options);

                    // Stores stdout
                    _this._child_process.stdout.on('data', function (stdout_data) {
                        _this._model.stdout += stdout_data;
                    });

                    // Stores stderr
                    _this._child_process.stderr.on('data', function (stderr_data) {
                        _this._model.stderr += stderr_data;
                    });

                    //Handle spawn errors
                    _this._child_process.on('error', function (error) {
                        _this.handleExecutionError('Spawn - ' + error.toString(), Constants.EAE_JOB_STATUS_ERROR);
                    });

                    //Handle child termination
                    _this._child_process.on('exit', function (code, signal) {
                        if (code !== null) { // Successful run or interruption
                            if (code === 0){
                                end_fn(Constants_Opal.OPAL_JOB_STATUS_PRIVACY, code, 'Exit success');
                            } else {
                                _this.handleExecutionError('Error in execution');
                            }
                        }
                        else if (signal === _this._kill_signal) {
                            end_fn(Constants.EAE_JOB_STATUS_CANCELLED, code, 'Interrupt success');
                        }
                        else {
                            _this.handleExecutionError('Exit error', Constants.EAE_JOB_STATUS_ERROR);
                        }
                    });
                } else {
                    _this.handleExecutionError('Agg - start, status code - ' + response.status + 'Error - ' + response.data.toString());
                }
            }, function (error) {
                _this.handleExecutionError('Agg - start - ' + error.toString());
            });
    }, function (error) {
        _this.handleExecutionError('Pre-exec - ' + error.toString());
    });
};

/**
 * @fn _kill
 * @desc Triggers kill signal on the child process, if any
 * @private
 */
JobExecutorAbstract.prototype._kill = function() {
    let _this = this;

    if (_this._child_process !== undefined && _this._child_process !== null) {
        _this._child_process.kill(_this._kill_signal);
    }
};

/**
 * @fn _preExecution
 * @desc Called before executing the job in a separate process.
 * Each implementation SHOULD prepare its inputs and params here
 * @return {Promise} Resolve to true on successful preparation
 * @private
 * @pure
 */
JobExecutorAbstract.prototype._preExecution = function() {
    throw 'Pure method should be implemented in child class';
};

/**
 * @fn _postExecution
 * @desc Called after executing the job in a separate process.
 * Each implementation SHOULD save its outputs and clean here
 * @return {Promise} Resolve to true on successful cleanup
 * @private
 * @pure
 */
JobExecutorAbstract.prototype._postExecution = function() {
    throw 'Pure method should be implemented in child class';
};

/**
 * @fn startExecution
 * @param callback {Function} Function called after execution. callback(error, status)
 * @desc Starts the execution of designated job.
 * @pure
 */
JobExecutorAbstract.prototype.startExecution = function(callback) {
    this._callback = callback;
    throw 'Pure method should be implemented in child class';
};

/**
 * @fn stopExecution
 * @desc Interrupts the currently executed job.
 * @param callback {Function} Function called after execution. callback(error, status)
 * @pure
 */
JobExecutorAbstract.prototype.stopExecution = function(callback) {
    this._callback = callback;
    throw 'Pure method should be implemented in child class';
};

module.exports = JobExecutorAbstract;
