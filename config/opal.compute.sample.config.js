const {Constants}  =  require('eae-utils');

module.exports = {
    mongoURL: 'mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]',
    timescaleURL: 'postgres://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]',
    port: 8080,
	enableCors: true,
    computeType: [Constants.EAE_COMPUTE_TYPE_PYTHON2],
    opalAlgoServiceURL: '',
    opalAggPrivServiceURL: '',
    opalalgoSandboxVenv: '/usr/venv/sandbox',
    opalalgoSandboxUser: 'sandbox',
    maxUsersPerFetch: 10000,
    maxCores: 40,
    randomSeed: 0.42 // should be in [-1, 1]
};
