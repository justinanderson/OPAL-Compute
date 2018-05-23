const process = require('process');
const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const {Constants} = require('eae-utils');
const url = require('url');

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
                    let aggregationUpdateUrl = url.resolve(global.opal_compute_config.opalAggPrivServiceURL, '/update/');
                    let jobUpdateUrl = url.resolve(aggregationUpdateUrl, _this._model._id.toString());
                    model_params['aggregationServiceUrl'] = jobUpdateUrl;
                    fse.outputJson(path.join(_this._tmpDirectory, 'params.json'), model_params).then(function () {
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
        _this.fetchData().then(function (__unused__dataDir) {
            // Clean model for execution
            _this._model.stdout = '';
            _this._model.stderr = '';
            _this._model.status.unshift(Constants.EAE_JOB_STATUS_RUNNING);
            _this.pushModel().then(function() {
                let cmd = 'python';
                let args = ['main.py --data_dir input --algorithm_json algorithm.json --params_json params.json'];
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
