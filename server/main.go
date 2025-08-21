package main

import (
	"log"
	"net/http"
)

const PORT = ":8080"
const CLIENT_DIR = "../client"
const STATIC_FILES_DIR = CLIENT_DIR + "/dist/"

func main() {

	serveMux := http.NewServeMux()

	serveMux.Handle("GET /", http.FileServer(http.Dir(STATIC_FILES_DIR)))

	// http.HandleFunc("/", func(w http.ResponseWriter, req *http.Request) {
	// 	log.Printf("Fallback: %s %s\n", req.Method, req.URL.Path)
	// 	http.NotFound(w, req)
	// })

	log.Fatal(http.ListenAndServe(PORT, serveMux))
}
