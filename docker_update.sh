docker build -t arunchess/neobrowse .
docker stop $(docker ps -q --filter ancestor=arunchess/neobrowse) 2>/dev/null
docker rm $(docker ps -aq --filter ancestor=arunchess/neobrowse) 2>/dev/null
docker push arunchess/neobrowse:latest
