package main

import (
	"fmt"
	"log"
	"net/http"
	"time"
)

const PORT = ":8080"
const CLIENT_DIR = "../client"
const STATIC_FILES_DIR = CLIENT_DIR + "/dist/"

func main() {
	eventHub := newHub()
	go eventHub.run()

	// DEBUG - keep sending some shit to the broadcast channel (and thus the client)
	go func() {
		for {
			eventHub.broadcast <- []byte("Some shit right chere")
			time.Sleep(3 * time.Second)
			fmt.Println("broadcast:", eventHub.broadcast)
		}
	}()

	serveMux := http.NewServeMux()

	serveMux.Handle("GET /", http.FileServer(http.Dir(STATIC_FILES_DIR)))

	serveMux.HandleFunc("GET /ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(eventHub, w, r)
	})

	// http.HandleFunc("/", func(w http.ResponseWriter, req *http.Request) {
	// 	log.Printf("Fallback: %s %s\n", req.Method, req.URL.Path)
	// 	http.NotFound(w, req)
	// })

	log.Fatal(http.ListenAndServe(PORT, serveMux))
}
