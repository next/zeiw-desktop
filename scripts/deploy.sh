#!/usr/bin/env sh
sh ./scripts/download.sh
sh ./scripts/login.sh

export DISPATCH_BUILD_ID=$(../dispatch build push $DISPATCH_BRANCH_ID $DISPATCH_CONFIG_PATH $DISPATCH_UPLOAD_PATH 2>&1| sed -n 's/.*Build ID: //p')
../dispatch build publish $DISCORD_APPLICATION_ID $DISPATCH_BRANCH_ID $DISPATCH_BUILD_ID
