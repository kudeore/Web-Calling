#!/bin/sh

# Set a stricter error handling mode.
# 'e' means exit immediately if a command fails.
# 'u' means treat unset variables as an error.
set -eu

# Substitute the PORT environment variable into the template
# and write the final config file for Nginx.
envsubst '$PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf

# Use 'exec' to replace the script process with the nginx process.
# This is a Docker best practice that ensures signals are handled correctly.
# The final semicolon has been removed.
exec nginx -g 'daemon off;'