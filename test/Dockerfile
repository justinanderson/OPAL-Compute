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

RUN rm -rf /etc/apparmor.d/docker-engine

RUN ls /etc/apparmor.d

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

# create a sandbox user
RUN useradd -ms /bin/bash sandbox
COPY ./setupScripts/usr.venv.sandbox.bin.python /etc/apparmor.d/

RUN useradd -ms /bin/bash opal
USER opal

COPY ./setupScripts/95-sandbox /etc/sudoers.d/
RUN /usr/bin/sudo -l

# Create app directories
RUN mkdir -p /home/opal/app && mkdir -p /home/opal/test
WORKDIR /home/opal/app

# Install app dependencies
COPY ./package.json /home/opal/app/
# Install opal-compute npm dependencies
RUN npm install --silent; exit 0;
RUN sudo cat /root/.npm/_logs/*; exit 0;
RUN python --version;

# Bundle app
COPY ./src /home/opal/app/src
COPY ./.eslintrc /home/opal/app/.eslintrc
COPY ./test/*.js /home/opal/app/test/
COPY ./test/*.py /home/opal/app/test/
COPY ./test/jobs /home/opal/app/test/jobs
COPY ./config/opal.compute.test.config.js /home/opal/app/config/opal.compute.config.js

RUN sudo ldconfig -v | grep -v ^$'\t'

EXPOSE 80
