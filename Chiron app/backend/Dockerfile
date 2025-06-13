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
RUN python3 -m pip install -r requirements.txt --no-cache-dir
RUN pip install git+https://${CHIRON_AUTH}@github.com/cchmc/is4r-chiron.git@main
RUN apt-get -y remove gcc && \
    apt-get -y auto-remove
COPY . /code
