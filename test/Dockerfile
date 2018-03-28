# Select source image
FROM node:stretch

# Install all dependencies
RUN apt-get update -q                                   \
    && apt-get upgrade -y --no-install-recommends       \
    && apt-get install -y python-pip                    \
    && apt-get install -y apparmor-profiles apparmor-utils \
    && apt-get install -y netcat

# Install python library required
RUN pip install git+https://github.com/emalgorithm/bandicoot.git \
    && pip install git+https://github.com/OPAL-Project/codejail.git \
    && pip install opalalgorithms

# Creating virtualenv for sandbox
RUN mkdir /usr/venv
RUN pip install virtualenv \
    && virtualenv /usr/venv/sandbox \
    && source /usr/venv/sandbox/bin/activate

# Create app directories
RUN mkdir -p /usr/app && mkdir -p /usr/test
WORKDIR /usr/app

# Install app dependencies
COPY ./package.json /usr/app/
# Install opal-compute npm dependencies
RUN npm install --silent; exit 0;
RUN cat /root/.npm/_logs/*; exit 0;
RUN python --version;

# Bundle app
COPY ./src /usr/app/src
COPY ./.eslintrc /usr/app/.eslintrc
COPY ./test/*.js /usr/app/test/
COPY ./test/jobs /usr/app/test/jobs
COPY ./config/opal.compute.test.config.js /usr/app/config/opal.compute.config.js

EXPOSE 80
