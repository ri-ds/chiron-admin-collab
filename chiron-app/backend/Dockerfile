FROM python:3.11-slim
ARG proxy
ARG CHIRON_AUTH
ENV PYTHONUNBUFFERED=1
ENV http_proxy=${proxy}
ENV https_proxy=${proxy}
RUN mkdir -p /code
WORKDIR /code
RUN apt-get update && \
    apt-get -y install gcc git
COPY requirements.txt .
# Install CA certs, OpenSSL, and system utilities
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    openssl \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    --trusted-host pypi.org \
    --trusted-host files.pythonhosted.org \
    -r requirements.txt
RUN python3 -m pip install --upgrade pip

RUN pip install git+https://${CHIRON_AUTH}@github.com/cchmc/is4r-chiron.git@feature/data-api2
RUN pip install git+https://${CHIRON_AUTH}@github.com/cchmc/is4r-chiron-ontology.git@develop
RUN apt-get -y remove gcc && \
    apt-get -y auto-remove
COPY . /code
