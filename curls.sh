#!/usr/bin/env bash

# some curls to test the api

accessToken=''
server='http://localhost:8080'

if [ "$1" = "get-accounts" ]; then
  curl -i -X GET -H 'Content-Type: application/json' -H "Authorization: Bearer ${accessToken}" "${server}/accounts"
fi

if [ "$1" = "get-documents" ]; then
  curl -i -X GET -H 'Content-Type: application/json' -H "Authorization: Bearer ${accessToken}" "${server}/documents"
fi

if [ "$1" = "get-document" ]; then
  fileId=$2
  if [ "$fileId" = "" ]; then
    echo "File id is required"
    exit 1
  fi
  curl -i -X GET -H 'Content-Type: application/json' -H "Authorization: Bearer ${accessToken}" "${server}/documents/${fileId}"
fi