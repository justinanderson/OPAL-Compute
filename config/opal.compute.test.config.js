const {Constants}  =  require('eae-utils');

module.exports = {
    mongoURL: 'mongodb://0.0.0.0/opal',
    port: 80,
	enableCors: true,
    computeType: [Constants.EAE_COMPUTE_TYPE_PYTHON2],
    opalAlgoServiceURL: 'http://0.0.0.0:3001',
    opalAggPrivServiceURL: '',
    clusters:{}
};
