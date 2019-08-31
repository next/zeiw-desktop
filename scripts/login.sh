#!/bin/sh
mkdir -p $HOME/.dispatch
cat << EOF > $HOME/.dispatch/credentials.json
{
  "BotCredentials": {
    "application_id": "$DISCORD_APPLICATION_ID",
    "token": "$DISCORD_BOT_TOKEN"
  }
}
EOF
