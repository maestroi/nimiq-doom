package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

func main() {
	var rootCmd = &cobra.Command{
		Use:   "uploader",
		Short: "Nimiq DOOM chunk uploader",
	}

	rootCmd.AddCommand(newUploadCmd())
	rootCmd.AddCommand(newManifestCmd())
	rootCmd.AddCommand(newAccountCmd())

	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
