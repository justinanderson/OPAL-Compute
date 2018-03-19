const process = require('process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {Constants} = require('eae-utils');

const JobExecutorAbstract = require('./jobExecutorAbstract.js');
const { SwiftHelper, ErrorHelper } = require('eae-utils');

/**
 * @class JobExecutorPython
 * @desc Specialization of JobExecutorAbstract for python scripts
 * @param jobID {String} The job unique identifier in DB
 * @param jobCollection MongoDB collection to sync the job model against
 * @param jobModel {Object} Plain js Job model from the mongoDB, optional if fetchModel is called
 * @constructor
 */
function JobExecutorPython(jobID, jobCollection, jobModel) {
    JobExecutorAbstract.call(this, jobID, jobCollection, jobModel);
    this._tmpDirectory = null;

    // Bind member functions
    this._preExecution = JobExecutorPython.prototype._preExecution.bind(this);
    this._postExecution = JobExecutorPython.prototype._postExecution.bind(this);
    this.startExecution = JobExecutorPython.prototype.startExecution.bind(this);
    this.stopExecution = JobExecutorPython.prototype.stopExecution.bind(this);

}
JobExecutorPython.prototype = Object.create(JobExecutorAbstract.prototype); //Inherit Js style
JobExecutorPython.prototype.constructor = JobExecutorPython;

/**
 * @fn _preExecution
 * @desc Prepare jobs inputs and params
 * @return {Promise} Resolve to true on successful preparation
 * @private
 * @pure
 */
JobExecutorPython.prototype._preExecution = function() {
    let _this = this;

    return new Promise(function (resolve, reject) {
        _this.fetchAlgorithm().then(
            function (algorithm) {
                fs.copyFileSync(path.join(__dirname, 'baseFiles/main.py'), path.join(_this._tmpDirectory, 'main.py'));
                resolve(algorithm);
            }, function (error) {
                reject(error);
            });
    });
};

/**
 * @fn _postExecution
 * @desc Saves jobs outputs and clean
 * @return {Promise} Resolve to true on successful cleanup
 * @private
 * @pure
 */
JobExecutorPython.prototype._postExecution = function() {
    return new Promise(function (resolve) {
        // TODO: Send request to Aggregation that execution is done.
        resolve(true);
    });
};

/**
 * @fn startExecution
 * @param callback {Function} Function called after execution. callback(error, status)
 * @desc Starts the execution of designated job.
 */
JobExecutorPython.prototype.startExecution = function(callback) {
    let _this = this;

    _this._callback = callback;

    _this.fetchData().then(function (dataDir) {
        _this.fetchModel().then(function () {
            //Clean model for execution
            _this._model.stdout = '';
            _this._model.stderr = '';
            _this._model.status.unshift(Constants.EAE_JOB_STATUS_RUNNING);
            _this._model.startDate = new Date();
            _this.pushModel().then(function() {
                let cmd = 'python';
                let args = ['main.py --data_dir input --algorithm_json algorithm.json --params_json params.json'];
                let opts = {
                    cwd: _this._tmpDirectory,
                    end: process.env,
                    shell: true
                };
                _this._exec(cmd, args, opts);
            }, function(error) {
                _this.handleExecutionError(error.toString());
            });
        }, function (error) {
            let message = 'Error in fetching model ' + error.toString();
            _this.handleExecutionError(message);
        });
    }, function (error) {
        let message = 'Error in fetching data - ' + error.toString();
        _this.handleExecutionError(message);
    });
};

/**
 * @fn stopExecution
 * @desc Interrupts the currently executed job.
 * @param callback {Function} Function called after execution. callback(error, status)
 */
JobExecutorPython.prototype.stopExecution = function(callback) {
    this._callback = callback;
    this._kill();
    // throw 'Should call _kill here';
};

module.exports = JobExecutorPython;
