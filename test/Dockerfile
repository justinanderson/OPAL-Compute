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

# Install python library required
RUN pip install git+https://github.com/OPAL-Project/codejail.git \
    && pip install git+https://github.com/emalgorithm/bandicoot.git \
    && pip install git+https://github.com/OPAL-Project/opalalgorithms.git \
    && pip install python-dateutil psycopg2

# Creating virtualenv for sandbox
RUN mkdir /usr/venv
RUN pip install virtualenv \
    && virtualenv /usr/venv/sandbox \
    && chmod +x /usr/venv/sandbox/bin/activate

# install libraries in virtualenv
RUN /bin/bash -c "source /usr/venv/sandbox/bin/activate \
    && pip install git+https://github.com/emalgorithm/bandicoot.git \
    && pip install git+https://github.com/OPAL-Project/codejail.git \
    && pip install git+https://github.com/OPAL-Project/opalalgorithms.git \
    && pip install python-dateutil \
    && deactivate"

# create a sandbox user
RUN useradd -ms /bin/bash sandbox
COPY ./setupScripts/usr.venv.sandbox.bin.python /etc/apparmor.d/

RUN echo "#!/bin/bash\nsudo mount -tsecurityfs securityfs /sys/kernel/security && sudo apparmor_parser -r -W /etc/apparmor.d/usr.venv.sandbox.bin.python" > /usr/bin/apparmor_init && \
    chmod +x /usr/bin/apparmor_init

RUN useradd -ms /bin/bash opal
USER opal

COPY ./setupScripts/95-sandbox /etc/sudoers.d/
RUN sudo ldconfig

# generate dummy data
WORKDIR /home/opal
RUN git clone https://github.com/shubhamjain0594/opalalgorithms.git
WORKDIR /home/opal/opalalgorithms/tests
RUN mkdir /home/opal/data
RUN python generate_data.py --conf datagen.conf --data_path /home/opal/data --num_users 100

# Create app directories
RUN mkdir -p /home/opal/app && mkdir -p /home/opal/test
WORKDIR /home/opal/app

# Install app dependencies
COPY ./package.json /home/opal/app/
# Install opal-compute npm dependencies
RUN npm install --silent; exit 0;
RUN sudo cat /root/.npm/_logs/*; exit 0;

# Bundle app
COPY ./src /home/opal/app/src
COPY ./test/algorithms /home/opal/app/test/algorithms
COPY ./config/opal.compute.test.config.js /home/opal/app/config/opal.compute.config.js
COPY ./.eslintrc /home/opal/app/.eslintrc
COPY ./test/*.js /home/opal/app/test/

EXPOSE 8001
