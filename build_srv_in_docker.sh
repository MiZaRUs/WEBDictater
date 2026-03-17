#!/bin/bash

# Сборка докер-образа сервиса.
####
APP=web_dictater
#
if [ -d ./Build ]; then
    rm -R Build/*
else
    mkdir Build
fi
#
cd ./src/
GO111MODULE=off CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o $APP
if [ -f "$APP" ]; then
    cp -rT ../Docker ../Build
    mv $APP ../Build/srv/
    cd ../Build
    cp -r ../web/* ./srv/
    tar -czvf srv.tar.gz srv
    echo "CMD [\"./${APP}\"]" >> ./Dockerfile
    docker buildx build --label=$APP -t $APP .
    cd ..
    docker save $APP > ${APP}.tar
    docker rmi $APP
else
    echo ""
    echo " * ERROR: Компиляция безуспешна! *"
    echo ""
fi
