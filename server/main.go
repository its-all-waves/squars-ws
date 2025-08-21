package main

import (
	"io"
	"log"
	"net/http"
	"os"
)

const PORT = ":8080"
const CLIENT_DIR = "../client"

func main() {

	http.HandleFunc("GET /main.ts", func(w http.ResponseWriter, req *http.Request) {
		log.Println("REQUESTED MAIN TS")

		jsPath := CLIENT_DIR + "/main.ts"
		f, err := os.Open(jsPath)
		if err != nil {
			log.Printf("Couldn't find '%s'\n", jsPath)
			log.Panic("Panic!")
		}

		fBytes, err := io.ReadAll(f)
		if err != nil {
			log.Printf("Couldn't read the file '%s'\n", jsPath)
			log.Panic("Panic!")
		}

		w.Header().Add("Content-Type", "text/javascript")
		w.Write(fBytes)
	})

	http.HandleFunc("GET /{$}", func(w http.ResponseWriter, req *http.Request) {
		log.Println("REQUESTED INDEX HTML")

		indexPath := CLIENT_DIR + "/index.html"
		f, err := os.Open(indexPath)
		if err != nil {
			log.Printf("Couldn't find '%s'\n", indexPath)
			log.Panic("Panic!")
		}

		fBytes, err := io.ReadAll(f)
		if err != nil {
			log.Printf("Couldn't read the file '%s'\n", indexPath)
			log.Panic("Panic!")
		}

		w.Write(fBytes)
	})

	// http.HandleFunc("/", func(w http.ResponseWriter, req *http.Request) {
	// 	log.Printf("Fallback: %s %s\n", req.Method, req.URL.Path)
	// 	http.NotFound(w, req)
	// })

	log.Fatal(http.ListenAndServe(PORT, nil))
}
