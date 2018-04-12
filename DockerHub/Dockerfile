# Select source image
FROM ubuntu:xenial

# Install all dependencies
ENV TERM linux

RUN apt-get update -q

RUN apt-get install -y dialog apt-utils
RUN echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections

RUN apt-get upgrade -y --no-install-recommends

RUN apt-get install -y python-pip python-dev gcc
RUN apt-get install -y apparmor apparmor-profiles apparmor-utils
RUN apt-get install -y netcat
RUN apt-get update && apt-get install -y sudo && rm -rf /var/lib/apt/lists/*
RUN apt-get update && apt-get install -y git

# required libraries
RUN apt-get install -y libpthread-stubs0-dev

RUN apt-get install -y curl

RUN pip install --upgrade pip

# install node
RUN curl -sL https://deb.nodesource.com/setup_9.x | sudo -E bash -
RUN apt-get install -y nodejs

RUN apt-get install -y build-essential

# Install python library required
RUN pip install git+https://github.com/OPAL-Project/codejail.git \
    && pip install git+https://github.com/emalgorithm/bandicoot.git \
    && pip install opalalgorithms

# Creating virtualenv for sandbox
RUN mkdir /usr/venv
RUN pip install virtualenv \
    && virtualenv /usr/venv/sandbox \
    && chmod +x /usr/venv/sandbox/bin/activate

RUN ls -alh /usr/venv/sandbox/bin/

# install libraries in virtualenv
RUN /bin/bash -c "source /usr/venv/sandbox/bin/activate \
    && pip install git+https://github.com/emalgorithm/bandicoot.git \
    && pip install git+https://github.com/OPAL-Project/codejail.git \
    && pip install opalalgorithms \
    && deactivate"

WORKDIR /root

# We download the opal compute
RUN git clone -b master https://github.com/OPAL-Project/OPAL-Compute

WORKDIR /root/OPAL-Compute

# setup restricted environment
RUN cp ./setupScripts/usr.venv.sandbox.bin.python /etc/apparmor.d/
RUN cp ./setupScripts/95-sandbox /etc/sudoers.d/

# create a sandbox user
RUN useradd -ms /bin/bash sandbox
RUN useradd -ms /bin/bash opal
USER opal

# Create app directories
RUN mkdir -p /home/opal/app/config && mkdir -p /home/opal/test

# Bundle app
RUN cp package.json /home/opal/app/ \
   && cp -r src /home/opal/src \
   && cp config/opal.compute.test.config.js /home/opal/app/config/opal.compute.config.js

WORKDIR /home/opal/app

# Install opal-compute npm dependencies
RUN npm install --silent; exit 0;
RUN sudo cat /root/.npm/_logs/*; exit 0;

# Bundle app
RUN sudo ldconfig -v | grep -v ^$'\t'

EXPOSE 80
