const {Constants}  =  require('eae-utils');

module.exports = {
    mongoURL: 'mongodb://mongodb/opal',
    port: 80,
	enableCors: true,
    computeType: [Constants.EAE_COMPUTE_TYPE_PYTHON2],
    opalAlgoServiceURL: 'http://algoservice:3001',
    opalAggPrivServiceURL: '',
    clusters:{}
};
