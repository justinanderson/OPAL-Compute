# eae-compute
[![Dim Sums](https://img.shields.io/badge/made-with_bratwurst-bfaf13.svg?style=flat-square)](https://www.opalproject.org)
[![Travis branch](https://img.shields.io/travis/OPAL-Project/OPAL-Scheduler/master.svg?style=flat-square)](https://travis-ci.org/OPAL-Project/OPAL-Scheduler) 
[![David](https://img.shields.io/david/dsi-icl/eae-scheduler.svg?style=flat-square)](https://david-dm.org/dsi-icl/eae-scheduler) 
[![David](https://img.shields.io/david/dev/dsi-icl/eae-scheduler.svg?style=flat-square)](https://david-dm.org/dsi-icl/eae-scheduler?type=dev) 

OPAL - Compute micro-service
---------------------------

The OPAL-compute service provides execution capabilities to the OPAL eco-system. While managing jobs is expected to be handled by the opal-scheduler, running them is the role of opal-compute. 
To do so, the opal-compute service exposes a REST interface. 

We provide the [API documentation](doc-api-swagger.yml) in swagger 2.0 format. You can paste the content in the [swagger editor](http://editor.swagger.io/) to render the API documentation.

## Configuration
At its construction, the `opalCompute` server receives a configuration object that MUST respect the following schema:
 * [Example configuration](config/opal.compute.sample.config.js)
 * [Tests configuration](config/opal.compute.test.config.js)
 
