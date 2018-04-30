const request = require('request');
const eaeutils = require('eae-utils');
const opalutils = require('opal-utils');
let config = require('../config/opal.compute.config.js');
let TestServer = require('./testserver.js');
const ObjectID = require('mongodb').ObjectID;

jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000; // 20 seconds

let ts = new TestServer();
let g_job = null;

beforeAll(function() {
    return new Promise(function (resolve, reject) {
        ts.run().then(function() {
            ts.emptyCollection(opalutils.Constants_Opal.OPAL_ALGO_COLLECTION).then(function () {
                ts.insertAlgo({}).then(function () {
                    resolve(true);
                }, function (error) {
                    reject(error);
                });
            }, function (error) {
                reject(error.toString());
            });
        }, function(error) {
            reject(error.toString());
        });
    });
});


test('Wrong job_id must throw 500', function (done) {
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/run',
            json: true,
            body: {
                job_id: new ObjectID().toHexString()
            }
        }, function(error, response, body) {
            if (error) {
                done.fail(error.toString());
                return;
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(500);
            done(); // All good !
        }
    );
});


test('Create dummy job & start running', function(done) {
    ts.createJob(eaeutils.Constants.EAE_JOB_TYPE_PYTHON2, {
        startDate: new Date("2016-01-01"),
        endDate: new Date("2016-12-31"),
        params: {},
        algorithmName: 'density',
        resolution: 'location_level_1',
        keySelector: null
    }).then(function(job_model) {
        g_job = Object.assign({}, job_model);
        expect(job_model).toBeDefined();
        expect(job_model.type).toEqual(eaeutils.Constants.EAE_JOB_TYPE_PYTHON2);
        request(
            {
                method: 'POST',
                baseUrl: 'http://127.0.0.1:' + config.port,
                uri: '/run',
                json: true,
                body: {
                    job_id: job_model._id.toHexString()
                }
            },
            function(error, response, body) {
                if (error) {
                    done.fail(error.toString());
                    return;
                }
                expect(response).toBeDefined();
                expect(response.statusCode).toEqual(200);
                expect(body).toBeDefined();
                expect(body.status[0]).toEqual(eaeutils.Constants.EAE_JOB_STATUS_CREATED);
                done(); // All good !
            }
        );
    }, function(error) {
        done.fail(error.toString());
    });
});

test('Wait for compute to go idle', function(done) {
    expect.assertions(3);
    setTimeout(function() {
        request(
            {
                method: 'GET',
                baseUrl: 'http://127.0.0.1:' + config.port,
                uri: '/status',
                json: true
            },
            function(error, response, body) {
                if (error) {
                    done.fail(error.toString());
                    return;
                }
                expect(response).toBeDefined();
                expect(response.statusCode).toEqual(200);
                expect(body.status).toEqual(eaeutils.Constants.EAE_SERVICE_STATUS_IDLE);
                done();
            }
        );
    }, 40000); // 40 seconds
});

test('Check dummy output result and delete job', function(done) {
    expect.assertions(2);
    ts.opal_compute.jobController._jobCollection.findOne({_id: g_job._id}).then(
        function(jobModel){
            expect(typeof jobModel.output).toBe('object');
            ts.deleteJob(g_job).then(function(result) {
                expect(result).toBeTruthy();
                g_job = null;
                done();
            }, function(error) {
                done.fail(error.toString());
            });
        }, function(error) {
        done.fail(error.toString());
    });

});

test('Cancel job on idle compute, check error', function(done) {
    expect.assertions(4);
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/cancel',
            json: true
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(400);
            expect(body).toBeDefined();
            expect(body.error).toBeDefined();
            done();
        }
    );
});

test('Create a new job & start running', function(done) {
    expect.assertions(6);
    ts.createJob(eaeutils.Constants.EAE_JOB_TYPE_PYTHON2, {
        startDate: new Date("2016-01-01"),
        endDate: new Date("2016-12-31"),
        params: {},
        algorithmName: 'density',
        resolution: 'location_level_1',
        keySelector: null
    }).then(function(job_model) {
        expect(job_model).toBeDefined();
        expect(job_model.type).toEqual(eaeutils.Constants.EAE_JOB_TYPE_PYTHON2);
        g_job = job_model;
        request(
            {
                method: 'POST',
                baseUrl: 'http://127.0.0.1:' + config.port,
                uri: '/run',
                json: true,
                body: {
                    job_id: job_model._id.toHexString()
                }
            },
            function(error, response, body) {
                if (error) {
                    done.fail(error.toString());
                    return;
                }
                expect(response).toBeDefined();
                expect(response.statusCode).toEqual(200);
                expect(body).toBeDefined();
                expect(body.status[0]).toEqual(eaeutils.Constants.EAE_JOB_STATUS_CREATED);
                done(); // All good !
            }
        );
    }, function(error) {
        done.fail(error.toString());
    });
});

test('Check the new job is running', function(done) {
    expect.assertions(4);
    setTimeout(function() {
        request(
            {
                method: 'GET',
                baseUrl: 'http://127.0.0.1:' + config.port,
                uri: '/status',
                json: true
            },
            function(error, response, body) {
                if (error) {
                    done.fail(error.toString());
                    return;
                }
                expect(response).toBeDefined();
                expect(response.statusCode).toEqual(200);
                expect(body).toBeDefined();
                expect(body.status).toEqual(eaeutils.Constants.EAE_SERVICE_STATUS_BUSY);
                done();
            }
        );
    }, 1000); // 1 seconds
});

test('Cancel running job', function(done) {
    expect.assertions(4);
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/cancel',
            json: true,
            body: {
                job_id: g_job._id.toHexString()
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
                return;
            }
            expect(response).toBeDefined();

            if (response.statusCode !== 200) {
                done.fail(JSON.stringify(response));
                return;
            }

            expect(response.statusCode).toEqual(200);
            expect(body).toBeDefined();
            expect(body.status[0]).toEqual(eaeutils.Constants.EAE_JOB_STATUS_CANCELLED);
            done();
        }
    );
});

test('Check compute is idle after 1 sec', function(done) {
    expect.assertions(3);
    setTimeout(function () {
        request(
            {
                method: 'GET',
                baseUrl: 'http://127.0.0.1:' + config.port,
                uri: '/status',
                json: true
            },
            function (error, response, body) {
                if (error) {
                    done.fail(error.toString());
                }
                expect(response).toBeDefined();
                expect(response.statusCode).toEqual(200);
                expect(body.status).toEqual(eaeutils.Constants.EAE_SERVICE_STATUS_IDLE);
                done();
            }
        );
    }, 10000); // 3 Sec
});

test('Delete cancel job', function(done) {
    expect.assertions(1);
    ts.deleteJob(g_job).then(function(result) {
        expect(result).toBeTruthy();
        g_job = null;
        done();
    }, function(error) {
        done.fail(error.toString());
    });
});


afterAll(function() {
    return new Promise(function (resolve, reject) {
        ts.stop().then(function() {
            resolve(true);
        }, function(error) {
            reject(error.toString());
        });
    });
});
