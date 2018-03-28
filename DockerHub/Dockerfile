# Select source image
FROM node:stretch

# Install all dependencies
RUN apt-get update -q && apt-get upgrade -y --no-install-recommends

# Create app directories
RUN mkdir -p /usr/app/config
WORKDIR /root

# We download the opal compute
RUN git clone -b master https://github.com/opal-project/opal-compute

WORKDIR /root/opal-compute

# Bundle app
RUN cp package.json /usr/app/ \
   && cp -r src /usr/app/src

WORKDIR /usr/app

# Install opal-compute npm dependencies
RUN npm install --silent; exit 0;
RUN cat /root/.npm/_logs/*; exit 0;

# Run compute service
EXPOSE 80
