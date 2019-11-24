#!/usr/bin/env bash

set -eu

DIR=`dirname $0`
WORK=/tmp/momo

mkdir -p $WORK
cp -R $DIR/* $WORK
cd $WORK
rm -f webrtc_logs_*
exec ./momo --log-level 4 --resolution VGA --port 8000 test
