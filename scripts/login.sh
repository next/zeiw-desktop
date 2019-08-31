#!/bin/sh
mkdir -p ~/.dispatch
cat << EOF > ~/.dispatch/credentials.json
{
  "BotCredentials": {
    "application_id": "$DISCORD_APPLICATION_ID",
    "token": "$DISCORD_BOT_TOKEN"
  }
}
EOF
