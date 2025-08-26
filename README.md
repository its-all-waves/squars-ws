# Web Socket "Game"

This is a multiplayer "game" in which a player is a square that moves around with the keyboard. That's it.

Game logic is on the server, for now, with no optimistic or predictive updating on the client.

## TODO:

- [ ] render other players
- [ ] deal with boundaries
    - [ ] establish game bounds in server and communicate to client
    - [ ] loop around OR stop at wall
- [ ] start with sprite centered

## TODO :: Issues

- [ ] server seems to drop client after hub `writeWait` in server/hub.go

## Development

### Server

Terminal 1: run the Go server with live reloading

```sh
cd server
air
```

### Client

Terminal 2: rebuild client on change

```sh
cd client
vite build --watch --mode development
```

## Spec

### How Does State Propagate?

Within one tick...

- A moves up -> ws.send
- B moves left -> ws.send
- server does game logic with input events, processing chronologically
- server broadcasts current positions of all players
