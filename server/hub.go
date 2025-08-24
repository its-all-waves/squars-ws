package main

import (
	"bytes"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
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

func (c *Client) setConn() {
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
}

/* GO ROUTINE */
func (c *Client) readMessagesIntoHub() {
	log.Println("CALL readMessagesIntoHub")
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	// log.Println("SEE ME?")
	for {
		// get one message // TODO: how often? do we for range hub ticker here? or do we move this somewhere else? if we only send from client every tick interval, will that suffice?
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(
				err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}
		message = bytes.TrimSpace(bytes.ReplaceAll(message, newline, space))
		log.Println("incoming msg:", string(message))
		c.hub.incoming <- message
	}
}

/* GO ROUTINE */
func (c *Client) writeBroadcast() {
	log.Println("CALL writeBroadcast")
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
			for range len(c.send) {
				w.Write(newline)
				w.Write(<-c.send)
			}
			// default: // this line shuts up the lsp
		}
	}
}

type GameHub struct {
	ticker *time.Ticker

	// register clients
	clients map[*Client]bool

	// register requests from clients
	register chan *Client

	unregister chan *Client

	// messages from clients
	incoming chan []byte

	// outbound game state messages
	broadcast chan []byte
}

func newGameHub() *GameHub {
	return &GameHub{
		ticker: time.NewTicker(time.Second),
		// ticker:     time.NewTicker(time.Second / 60),
		clients:    make(map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		incoming:   make(chan []byte),
		broadcast:  make(chan []byte),
	}
}

func (h *GameHub) run() {
	go h.processMessageAndQueueForBroadcast()
	for {

		select {
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}

		// // if there are incoming messages, process them to update game state
		// // FOR NOW: simply edit the message and return it to client
		// case message := <-h.incoming:
		// 	log.Println("SEE ME?")
		// 	h.broadcast <- []byte(string(message) + " GOT IT!")

		// if there's something to broadcast, copy it to all clients' send channels
		case message := <-h.broadcast:
			// log.Println("PULLING MSG FROM BROADCAST:", string(message))
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		case <-h.ticker.C:
			log.Println("TICK")
			continue
		}
	}
}

/*
GO ROUTINE -- OR IS IT??!?!?!?!
Process incoming messages and populate broadcast channel.
*/
func (h *GameHub) processMessageAndQueueForBroadcast() {
	// TODO: unmarshall messages into game events

	// TODO: FOR NOW: add a word to the message and stick the new message in broadcast
	for message := range h.incoming {
		h.broadcast <- []byte(string(message) + " GOT IT!")
		// TODO: not OK?
	}
}

func serveWs(hub *GameHub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	client := &Client{hub, conn, make(chan []byte, 256)}
	client.setConn()

	hub.register <- client

	go client.readMessagesIntoHub()
	go client.writeBroadcast()
}
