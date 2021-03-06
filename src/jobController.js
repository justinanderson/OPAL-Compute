const { Constants, ErrorHelper } =  require('eae-utils');
const JobExecutorFactory = require('./jobExecutorFactory.js');

/**
 * @class JobController
 * @desc Controller of the job execution
 * @param jobCollection MongoDb collection, stores the job data models
 * @param statusHelper Status helper class
 * @constructor
 */
function JobController(jobCollection, statusHelper) {
    this._jobCollection = jobCollection;
    this._status_helper = statusHelper;
    this._jobExecFactory = new JobExecutorFactory();
    this._executor = undefined;

    this.runJob = JobController.prototype.runJob.bind(this);
    this.cancelJob = JobController.prototype.cancelJob.bind(this);
}

/**
 * @fn runJob
 * @desc Starts a new execution from a job_id
 * @param req Express.js request object
 * @param res Express.js response object
 */
JobController.prototype.runJob = function(req, res) {
    let _this = this;
    let job_id = req.body ? req.body.job_id : undefined;

    if (job_id === undefined || job_id === null) {
        res.status(401);
        res.json(ErrorHelper('Unknown job, aborting..'));
        return;
    }
    if (_this._executor !== undefined) {
        res.status(503);
        res.json(ErrorHelper('Service is not available for compute'));
        return;
    }

    //Set the node to busy
    _this._status_helper.setStatus(Constants.EAE_SERVICE_STATUS_BUSY);

    // Create executor based on type
    _this._jobExecFactory.createFromId(job_id, _this._jobCollection).then(function(executor) {
        _this._executor = executor;
        // Trigger asynchronous execution
        res.status(200);
        res.json(Object.assign({}, _this._executor._model));
        _this._executor.startExecution(function(__unused__error, __unused__execStatus) {
            // After exec, set the node to idle
            _this._status_helper.setStatus(Constants.EAE_SERVICE_STATUS_IDLE);
            // Cleanup executor instance
            delete _this._executor;
        });
    }, function(error) {
        delete _this._executor;
        res.status(500);
        res.json(ErrorHelper('Execution aborted', error));

        // Set the node to idle
        _this._status_helper.setStatus(Constants.EAE_SERVICE_STATUS_IDLE);
    });
};

/**
 * @fn cancelJob
 * @desc Interrupts the current job
 * @param __unused__req Express.js request object
 * @param res Express.js response object
 */
JobController.prototype.cancelJob = function(__unused__req, res) {
    let _this = this;

    if (_this._executor === undefined) {
        res.status(400);
        res.json(ErrorHelper('Not currently running a job'));
        return;
    }

    _this._executor.stopExecution(function(error, __unused__jobStatus) {
        if (error !== undefined && error !== null) {
            res.status(500);
            res.json(ErrorHelper('Failed to interrupt job', error));
        }
        else {
            // Reply inside callback so the job is stopped
            // Will cancel, set the node to idle
            _this._status_helper.setStatus(Constants.EAE_SERVICE_STATUS_IDLE);

            res.status(200);
            res.json(Object.assign({}, _this._executor._model));
        }
        //Cleanup executor instance
        delete _this._executor;
    });
};

module.exports = JobController;
