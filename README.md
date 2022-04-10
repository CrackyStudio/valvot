# Valvot

## Environment variables (dotenv)

- DISCORD_TOKEN

## Docker release

```sh
ssh root@SERVER_IP
scp ./src/config/config.json root@SERVER_IP:~/valvot/src/config/
docker ps
docker stop CONTAINER_ID
docker system prune --all --force
docker build --tag valvot .
docker run -d valvot
```
