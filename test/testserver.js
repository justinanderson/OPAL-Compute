let express = require('express');
let OpalCompute = require('../src/opalCompute');
let config = require('../config/opal.compute.config.js');
let ObjectID = require('mongodb').ObjectID;
const request = require('request');
const opalutils = require('opal-utils');
const TestUtils = require('./test_utils.js');
const eaeutils = require('eae-utils');


function TestServer() {
    // Bind member vars
    this._app = express();
    this.testUtils = new TestUtils();

    // Bind member functions
    this.run = TestServer.prototype.run.bind(this);
    this.stop = TestServer.prototype.stop.bind(this);
    this.mongo = TestServer.prototype.mongo.bind(this);
    this.createJob = TestServer.prototype.createJob.bind(this);
    this.deleteJob = TestServer.prototype.deleteJob.bind(this);
    this.insertAlgo = TestServer.prototype.insertAlgo.bind(this);
    this.emptyCollection = TestServer.prototype.emptyCollection.bind(this);
}

TestServer.prototype.run = function() {
    let _this = this;
    return new Promise(function(resolve, reject) {
        // Setup node env to test during test
        process.env.TEST = 1;

        // Create opal.compute server
        _this.opal_compute = new OpalCompute(config);

        // Start server
        _this.opal_compute.start().then(function (compute_router) {
            _this._app.use(compute_router);
            _this._server = _this._app.listen(config.port, function (error) {
                if (error)
                    reject(error);
                else {
                    _this.mongo().createCollection(eaeutils.Constants.EAE_COLLECTION_JOBS, {
                        strict: true
                    }, function(_unused__err, _unused__collection) {
                        resolve(true);
                    });
                }
            });
        }, function (error) {
            reject(error);
        });
    });
};

TestServer.prototype.stop = function() {
    let _this = this;
    return new Promise(function(resolve, reject) {
        // Remove test flag from env
        delete process.env.TEST;
        _this.opal_compute.stop().then(function() {
            _this._server.close(function(error) {
                if (error)
                    reject(error);
                else
                    resolve(true);
            });
        }, function (error) {
            reject(error);
        });
    });
};

TestServer.prototype.mongo = function() {
    return this.opal_compute.db;
};

TestServer.prototype.createJob = function(type, params) {
    let _this = this;
    return new Promise(function(resolve, reject) {
        let job_id = new ObjectID();
        let job_model = Object.assign({},
            opalutils.DataModel.OPAL_JOB_MODEL,
            {
                _id: job_id,
                type: type,
                params: params
            }
        );
        // Insert in DB
        _this.opal_compute.jobController._jobCollection.insertOne(job_model).then(function() {
            resolve(job_model);
        }, function(error) {
            reject(error);
        });
    });
};

TestServer.prototype.deleteJob = function(job_model) {
    let _this = this;
    return new Promise(function(resolve, reject) {
        _this.opal_compute.jobController._jobCollection.deleteOne({_id : job_model._id}).then(function() {
            resolve(true);
        }, function(error) {
            reject(error);
        });
    });
};

TestServer.prototype.insertAlgo = function(params) {
    let _this = this;
    return new Promise(function (resolve, reject) {
        request({
            method: 'POST',
            baseUrl: config.opalAlgoServiceURL,
            uri: '/add',
            body: _this.testUtils.getPostData(params),
            json: true
        }, function(error, response, __unused__body) {
            if (error) {
                reject(error.toString());
            } else if (response.statusCode !== 200){
                reject(response);
            } else {
                resolve(response);
            }
        });
    });
};

/**
 * @fn createFreshDb
 * @desc Empties collection.
 * @return {Promise<any>}
 */
TestServer.prototype.emptyCollection = function (collectionName) {
    let _this = this;
    return new Promise(function (resolve, reject) {
        _this.mongo().listCollections({name: collectionName}).toArray().then(
            function(items) {
                if (items.length > 0) {
                    _this.mongo().collection(collectionName).deleteMany({}).then(
                        function (success) {
                            resolve(success);
                        }, function (error) {
                            reject(error);
                        });
                } else {
                    resolve(true);
                }
            }, function (error) {
                reject(error);
            });
    });
};

module.exports = TestServer;
