#!/bin/sh
cat << EOF > ./app/build-env.js
module.exports = {
  nativeVersion: '$(git rev-parse HEAD)',
}
EOF
