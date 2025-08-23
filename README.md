## Development

### Server

Terminal 1: run the Go server with live reloading

```sh
cd server
air
```

Terminal 2: rebuild client on change

```sh
cd client
vite build --watch
```

### Client

Run the client dev server:

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
