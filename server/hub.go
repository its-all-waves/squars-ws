package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"time"
	"web-socket-game/game"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type MessageType = string

const (
	MSG_TYPE_PLAYER_ID  MessageType = "playerId"
	MSG_TYPE_GAME_STATE MessageType = "gState"
)

type Message struct {
	MsgType MessageType `json:"msgType"`
	Payload any         `json:"payload"`
}

func newGameMsgJson(msgType MessageType, data any) ([]byte, error) {
	msg := Message{
		MsgType: msgType,
		Payload: data,
	}
	return json.Marshal(msg)
}

type Client struct {
	playerId string
	hub      *GameHub
	conn     *websocket.Conn
	send     chan []byte // buffered channel of outbound messages
}

const (
	// TODO: FIX: client dropping connection after writeWait
	writeWait      = 10 * time.Second // period within which client must message back
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
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(
				err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}
		message = bytes.TrimSpace(bytes.ReplaceAll(message, newline, space))

		// DEBUG
		// log.Println("incoming msg:", string(message))

		c.hub.incoming <- message
	}
}

/* GO ROUTINE */
func (c *Client) writeMessagesFromSendChan() {
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

			// DEBUG
			// log.Println("WROTE ALL MESSAGES TO:", c.playerId)

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

type GameHub struct {
	g *game.Game

	// TODO: close the ticker!
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
		g:          game.New(),
		ticker:     time.NewTicker(time.Second / time.Duration(game.Settings.TickRate)),
		clients:    make(map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		incoming:   make(chan []byte),
		broadcast:  make(chan []byte),
	}
}

/*
Once per tick, dump the game state into all clients' send channels,
to be sent by another go routine. Also launch go routines to update
game state and add/remove players.
*/
func (h *GameHub) run() {
	go h.updateGameState()
	go h.addRemovePlayers()

	for range h.ticker.C {

		gStateMsg, err := newGameMsgJson(MSG_TYPE_GAME_STATE, h.g)
		if err != nil {
			log.Println("Couldn't convert game state to json.")
		}

		// DEBUG
		// log.Println("gStateMsg:", string(gStateMsg))

		for client := range h.clients {
			select {
			case client.send <- gStateMsg:
			default:
				close(client.send)
				delete(h.clients, client)
			}
		}
	}
}

/* GO ROUTINE */
func (h *GameHub) addRemovePlayers() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
			h.g.AddPlayer(client.playerId)

		case client := <-h.unregister:
			h.g.RemovePlayer(client.playerId)
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
		}
	}
}

/*
GO ROUTINE
When there's a message, unmarshal it, and send it to the game to update its state.
*/
func (h *GameHub) updateGameState() {
	// TODO: sort messages in queue ? do we still need to do this?
	// are we guaranteed to get events in order given all the go
	// routines and their respective channels?

	for {
		message, ok := <-h.incoming
		if !ok {
			// TODO:
			log.Println("What does this mean? Channel closed? So do we return? RETURNING!")
			return
		}

		// DEBUG
		// log.Println("PULLED MSG FROM INCOMING:", string(message))

		event := game.GameEvent{}
		err := json.Unmarshal(message, &event)

		// DEBUG
		// log.Println("GAME EVENT CONVERTED FROM MESSAGE:", event)

		if err != nil {
			// TODO: handle error -- probably bubble up error
			log.Println("Couldn't convert ws message to game event:", err)
			continue
		}
		h.g.Update(event)
	}
}

func serveWs(hub *GameHub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	playerId := uuid.New().String()
	client := &Client{playerId, hub, conn, make(chan []byte, 256)}
	client.setConn()
	hub.register <- client

	idMsg, err := newGameMsgJson(
		MSG_TYPE_PLAYER_ID,
		map[string]game.PlayerId{"playerId": playerId},
	)
	if err != nil {
		log.Println("Couldn't create a json message from playerId.")
	}

	// DEBUG
	// log.Println("SEND ID MESSAGE:", string(idMsg))

	client.send <- idMsg

	go client.readMessagesIntoHub()
	go client.writeMessagesFromSendChan()
}
