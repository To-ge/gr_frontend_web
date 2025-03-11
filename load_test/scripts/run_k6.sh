mkdir -p ../k6/logs

source ../.env && k6 run ../k6/live_stream.js > ../k6/logs/live_stream.log
