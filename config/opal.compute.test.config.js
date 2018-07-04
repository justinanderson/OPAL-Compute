const {Constants}  =  require('eae-utils');

module.exports = {
    mongoURL: 'mongodb://mongodb/opal',
    timescaleURL: 'postgres://postgres@postgres/opal',
    port: 8001,
	enableCors: true,
    computeType: [Constants.EAE_COMPUTE_TYPE_PYTHON2],
    opalAlgoServiceURL: 'http://algoservice:3001',
    opalAggPrivServiceURL: 'http://aggandprivacy:9001',
    opalalgoSandboxVenv: '/usr/sandbox/venv',
    opalalgoSandboxUser: 'sandbox',
    maxUsersPerFetch: 50000,
    maxCores: 48,
    randomSeed: 0.42 // should be in [-1, 1]
};
