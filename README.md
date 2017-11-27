# eae-compute
[![Krakens](https://img.shields.io/badge/made-with_Krakens-2B65EC.svg?style=flat-square)](https://eae.dsi.ic.ac.uk)
[![Travis](https://img.shields.io/travis/dsi-icl/eae-compute/master.svg?style=flat-square)](https://travis-ci.org/dsi-icl/eae-compute) 
[![David](https://img.shields.io/david/dsi-icl/eae-compute.svg?style=flat-square)](https://david-dm.org/dsi-icl/eae-compute) 
[![David](https://img.shields.io/david/dev/dsi-icl/eae-compute.svg?style=flat-square)](https://david-dm.org/dsi-icl/eae-compute?type=dev) 

OPAL - Compute micro-service
---------------------------

The OPAL-compute service provides execution capabilities to the eae eco-system. While managing jobs is expected to be handled by the eae-scheduler, running them is the role of eae-compute. 
To do so, the eae-compute service exposes a REST interface. 

We provide the [API documentation](doc-api-swagger.yml) in swagger 2.0 format. You can paste the content in the [swagger editor](http://editor.swagger.io/) to render the API documentation.

## Configuration
At its construction, the `opalCompute` server receives a configuration object that MUST respect the following schema:
 * [Example configuration](config/eae.compute.sample.config.js)
 * [Tests configuration](config/eae.compute.test.config.js)
 
