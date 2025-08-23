package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"

	"web-socket-game/game"
)

type Client struct {
	hub  *GameHub
	conn *websocket.Conn

	// buffered channel of outbound messages
	send chan []byte
}

const (
	/* DEBUG */ writeWait = 300 * time.Second // period within which client must message back
	// writeWait      = 60 * time.Second // period within which client must message back
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10 // must be < pongWait
	maxMessageSize = 512
)

var (
	newline = []byte{'\n'}
	space   = []byte{' '}
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func (c *Client) readOneIncomingMsgIntoHub() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
	_, message, err := c.conn.ReadMessage()
	if err != nil {
		if websocket.IsUnexpectedCloseError(
			err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
			log.Printf("error: %v", err)
		}
		return
	}
	message = bytes.TrimSpace(bytes.ReplaceAll(message, newline, space))
	c.hub.incoming <- message
	// log.Println("Read incoming message:", string(message))
}

func (c *Client) writeToFromHub() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// the hub closed the channel
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// add queued messages to the current ws message
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write(newline)
				w.Write(<-c.send)
			}
		}
	}
}

// TODO: each tick, sort events before adding to chan
type GameHub struct {
	g *game.Game

	ticker *time.Ticker

	// register clients
	clients map[*Client]bool

	incoming chan []byte

	broadcast chan []byte

	// register requests from clients
	register chan *Client

	unregister chan *Client
}

func newGameHub() *GameHub {
	return &GameHub{
		g:          game.New(),
		ticker:     time.NewTicker(time.Second),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		incoming:   make(chan []byte),
		broadcast:  make(chan []byte),
	}
}

/* GO ROUTINE */
func (h *GameHub) run() {
	// iterate once per game tick
	gameTicks := h.ticker.C
	for range gameTicks {
		log.Println("GAME TICK")

		// register / unregister clients
		select {
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
		}

		// read incoming messages from all clients
		for client, _ := range h.clients {
			client.readOneIncomingMsgIntoHub()
		}

		h.updateGameAndUpdateBroadcast()

		// pump the game state from broadcast channel to clients' send channels
		message, ok := <-h.broadcast
		if !ok {
			log.Println("How did we get here? There's no message to broadcast")
			continue
		}
		// TODO: write directly instead of filling a middle man channel?
		for client := range h.clients {
			select {
			case client.send <- message:
			default:
				close(client.send)
				delete(h.clients, client)
			}
		}

		// finally, write the game state message to all clients
		for client, _ := range h.clients {
			client.writeToFromHub()
		}

	}
}

/* Populates the broadcast channel */
func (h *GameHub) updateGameAndUpdateBroadcast() {
	events := h.unmarshalMsgs()
	// TODO: sort events?
	h.g.Update(events)
	gameState, err := json.Marshal(h.g)
	if err != nil {
		log.Println("Somehow couldn't convert game state into json:", err)
	}
	h.broadcast <- gameState
}

func (h *GameHub) unmarshalMsgs() []game.GameEvent {
	events := []game.GameEvent{}
	for message := range h.incoming {
		event := game.GameEvent{}
		err := json.Unmarshal(message, &event)
		if err != nil {
			// TODO: handle error -- probably bubble up error
			log.Println("Couldn't convert ws message to game event:", err)
			continue
		}
		events = append(events, event)
	}
	return events
}

func serveGame(hub *GameHub, w http.ResponseWriter, r *http.Request) {
	log.Println("SERVING GAME")
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	client := &Client{hub, conn, make(chan []byte, 256)}
	client.hub.register <- client

	// // // allow collection of memory referenced by the caller by doing all work in new goroutines
	// // go client.readMessagesToHub()
	// // go client.writeMessagesToClient()
	// // INSTEAD: in the hub, do for each client
	// //
	// // ...and do the following in the hub:
	// // loop forever with one iteration per tick.
	// // for each tick:
	// // 		read messages into hub
	// // 		send unmarshalled messages (game events) from hub to game
	// // 		process game events in game
	// // 		send marshalled game events (messages) to clients

	// go func() {
	// 	// iterate once per game tick
	// 	gameTicks := hub.ticker.C
	// 	for range gameTicks {
	// 		log.Println("GAME TICK")
	// 		client.readIncomingIntoHub()
	// 		hub.tick()
	// 		client.writeBroadcast()
	// 	}
	// }()
}
