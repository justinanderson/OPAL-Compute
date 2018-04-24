#!/bin/bash

apparmor_parser -r -W /etc/apparmor.d/usr.venv.sandbox.bin.python
node ./src/index.js
