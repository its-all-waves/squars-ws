# Web Socket "Game"

This is a multiplayer "game" in which a player is a square that moves around with the keyboard. That's it.

Game logic is on the server, for now, with no optimistic or predictive updating on the client.

## TODO:

- [x] render other players
- [x] player starts at center position with random color
- [ ] deal with boundaries
    - [-] establish game bounds in server
        - [ ] communicate to client
    - [x] loop around OR stop at wall

## TODO :: Issues

- [ ] server/hub.go:160 +0xf4 -- server crash -- cause unknown, but related to spamming messages from client to server
- [-] server seems to drop client after hub `writeWait` in server/hub.go
    - NOTE: seems fixed after restoring accidentally deleted end of `writeMessagesFromSendChan`

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
