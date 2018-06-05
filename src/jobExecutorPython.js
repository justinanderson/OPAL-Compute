const process = require('process');
const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const {Constants} = require('eae-utils');

const JobExecutorAbstract = require('./jobExecutorAbstract.js');
const { ErrorHelper } = require('eae-utils');

/**
 * @class JobExecutorPython
 * @desc Specialization of JobExecutorAbstract for python scripts
 * @param jobID {String} The job unique identifier in DB
 * @param jobCollection MongoDB collection to sync the job model against
 * @param jobModel {Object} Plain js Job model from the mongoDB, optional if fetchModel is called
 * @constructor
 */
function JobExecutorPython(jobID, postgresClient, jobCollection, jobModel) {
    JobExecutorAbstract.call(this, jobID, postgresClient, jobCollection, jobModel);
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
 * @desc Fetch algorithm from, copy main file to temp directory and save algorithm and params as json in the directory.
 * @return {Promise} Resolve to true on successful preparation, rejects with an error
 * @private
 * @pure
 */
JobExecutorPython.prototype._preExecution = function() {
    let _this = this;

    return new Promise(function (resolve, reject) {
        _this.fetchAlgorithm().then(
            function (algorithm) {
                fs.copyFileSync(path.join(__dirname, 'baseFiles/main.py'), path.join(_this._tmpDirectory, 'main.py'));
                fse.outputJson(path.join(_this._tmpDirectory, 'algorithm.json'), algorithm).then(function () {
                    let model_params = (_this._model.params !== undefined && _this._model.params !== null) ? _this._model.params : {};
                    model_params['aggregationServiceUrl'] = _this._getAggregationServiceUrl('update');
                    fse.outputJson(path.join(_this._tmpDirectory, 'params.json'), model_params).then(function () {
                        delete model_params.aggregationServiceUrl;
                        resolve(true);
                    }, function (error) {
                        reject(ErrorHelper('Unable to save params', error));
                    });
                }, function (error) {
                    reject(error);
                });
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
        resolve(true);
    });
};

/**
 * @fn startExecution
 * @param callback {Function} Function called after execution. callback(error, status)
 * @desc Starts the execution of designated job. Fetch model, fetch data and push updated status before starting execution.
 */
JobExecutorPython.prototype.startExecution = function(callback) {
    let _this = this;

    _this._callback = callback;

    _this.fetchModel().then(function () {
        _this._model.startDate = new Date();
        _this.setupDir().then(function (__unused__dataDir) {
            // Clean model for execution
            _this._model.stdout = '';
            _this._model.stderr = '';
            process.env['OPALALGO_SANDBOX_VENV'] = global.opal_compute_config.opalalgoSandboxVenv;
            process.env['OPALALGO_SANDBOX_USER'] = global.opal_compute_config.opalalgoSandboxUser;
            _this.pushModel().then(function() {
                let cmd = 'python';
                let args = ['-W ignore main.py --data_dir input --algorithm_json algorithm.json ' +
                            '--params_json params.json --db ' + global.opal_compute_config.timescaleURL +
                            ' --max_users_per_fetch ' + global.opal_compute_config.maxUsersPerFetch.toString() +
                            ' --max_cores ' + global.opal_compute_config.maxCores.toString()];
                let opts = {
                    cwd: _this._tmpDirectory,
                    env: process.env,
                    shell: true
                };
                _this._exec(cmd, args, opts);
            }, function(error) {
                _this.handleExecutionError(error.toString());
            });
        }, function (error) {
            let message = 'Error in fetching data - ' + error.toString();
            _this.handleExecutionError(message);
        });
    }, function (error) {
        let message = 'Error in fetching model ' + error.toString();
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
};

module.exports = JobExecutorPython;
