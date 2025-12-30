package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	var (
		port              = flag.String("port", "8080", "HTTP server port")
		nimiqRPCURL      = flag.String("rpc-url", "", "Nimiq RPC URL (or set NIMIQ_RPC_URL)")
		indexStartHeight = flag.Int64("index-start-height", 0, "Start indexing from this height (or set INDEX_START_HEIGHT)")
		pollInterval     = flag.Int("poll-interval", 2, "Poll interval in seconds (or set POLL_INTERVAL_SECONDS)")
		manifestPath     = flag.String("manifest", "./manifest.json", "Path to manifest.json")
		dbPath           = flag.String("db", "./data/chunks.db", "Path to SQLite database")
	)
	flag.Parse()

	// Override with env vars if set
	if url := os.Getenv("NIMIQ_RPC_URL"); url != "" {
		*nimiqRPCURL = url
	}
	if h := os.Getenv("INDEX_START_HEIGHT"); h != "" {
		if parsed, err := strconv.ParseInt(h, 10, 64); err == nil {
			*indexStartHeight = parsed
		}
	}
	if p := os.Getenv("POLL_INTERVAL_SECONDS"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil {
			*pollInterval = parsed
		}
	}

	if *nimiqRPCURL == "" {
		log.Fatal("NIMIQ_RPC_URL must be set")
	}

	// Initialize database
	db, err := NewDB(*dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Initialize Nimiq RPC client
	rpcClient := NewNimiqRPC(*nimiqRPCURL)

	// Initialize indexer
	indexer := NewIndexer(db, rpcClient, *indexStartHeight, time.Duration(*pollInterval)*time.Second, *manifestPath)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start indexer in background
	go func() {
		if err := indexer.Start(ctx); err != nil {
			log.Printf("Indexer error: %v", err)
		}
	}()

	// Initialize API
	api := NewAPI(db, *manifestPath)

	// Setup router
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Route("/api", func(r chi.Router) {
		r.Get("/manifest", api.GetManifest)
		r.Get("/status", api.GetStatus)
		r.Get("/chunks", api.GetChunks)
		r.Get("/chunks/raw", api.GetChunksRaw)
		r.Get("/verify", api.Verify)
	})

	log.Printf("Starting server on port %s", *port)

	// Graceful shutdown
	srv := &http.Server{
		Addr:    ":" + *port,
		Handler: r,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	log.Println("Shutting down...")
	cancel()
	ctxShutdown, cancelShutdown := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelShutdown()
	if err := srv.Shutdown(ctxShutdown); err != nil {
		log.Printf("Server shutdown error: %v", err)
	}
}
