package main

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

const (
	// ConfigDirName is the name of the config directory
	ConfigDirName = "nimiq-uploader"
	// CredentialsFileName is the default credentials file name
	CredentialsFileName = "account_credentials.txt"
	
	// DefaultRPCURL is the default Nimiq RPC endpoint
	// Users should run their own node or use a public endpoint
	// Set NIMIQ_RPC_URL environment variable or RPC_URL in credentials file to override
	DefaultRPCURL = "http://localhost:8648"
)

// GetConfigDir returns the config directory path
// On Linux/Mac: ~/.config/nimiq-uploader
// Falls back to current directory if home is not available
func GetConfigDir() string {
	// First check XDG_CONFIG_HOME (Linux standard)
	if xdgConfig := os.Getenv("XDG_CONFIG_HOME"); xdgConfig != "" {
		return filepath.Join(xdgConfig, ConfigDirName)
	}

	// Fall back to ~/.config
	homeDir, err := os.UserHomeDir()
	if err != nil {
		// Can't get home dir, use current directory
		return "."
	}

	return filepath.Join(homeDir, ".config", ConfigDirName)
}

// GetCredentialsPath returns the full path to the credentials file
// Searches in order:
// 1. Current directory (./account_credentials.txt)
// 2. Config directory (~/.config/nimiq-uploader/account_credentials.txt)
func GetCredentialsPath() string {
	// First check current directory
	localPath := CredentialsFileName
	if _, err := os.Stat(localPath); err == nil {
		return localPath
	}

	// Check config directory
	configPath := filepath.Join(GetConfigDir(), CredentialsFileName)
	if _, err := os.Stat(configPath); err == nil {
		return configPath
	}

	// Return local path as default (will error when opened)
	return localPath
}

// EnsureConfigDir creates the config directory if it doesn't exist
func EnsureConfigDir() error {
	configDir := GetConfigDir()
	return os.MkdirAll(configDir, 0700)
}

// LoadCredentials loads credentials from account_credentials.txt
// Searches in current directory first, then config directory
func LoadCredentials(filename string) (map[string]string, error) {
	creds := make(map[string]string)

	// If no specific filename given, use the search path
	if filename == "" || filename == CredentialsFileName {
		filename = GetCredentialsPath()
	}

	file, err := os.Open(filename)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		// Skip comments and empty lines
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		// Parse KEY=VALUE format
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			creds[key] = value
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return creds, nil
}

// GetDefaultAddress tries to load address from account_credentials.txt
// Searches in current directory first, then config directory
func GetDefaultAddress() string {
	creds, err := LoadCredentials(CredentialsFileName)
	if err != nil {
		return ""
	}
	return creds["ADDRESS"]
}

// GetDefaultPassphrase tries to load passphrase from account_credentials.txt
func GetDefaultPassphrase() string {
	creds, err := LoadCredentials(CredentialsFileName)
	if err != nil {
		return ""
	}
	return creds["PASSPHRASE"]
}

// GetDefaultRPCURL returns the RPC URL from (in order):
// 1. NIMIQ_RPC_URL environment variable
// 2. RPC_URL in credentials file
// 3. DefaultRPCURL constant (localhost:8648)
func GetDefaultRPCURL() string {
	// First check environment variable
	if url := os.Getenv("NIMIQ_RPC_URL"); url != "" {
		return url
	}
	
	// Then check credentials file
	creds, err := LoadCredentials(CredentialsFileName)
	if err == nil && creds["RPC_URL"] != "" {
		return creds["RPC_URL"]
	}
	
	// Fall back to default
	return DefaultRPCURL
}

// SaveCredentialsToConfig saves credentials to the config directory
func SaveCredentialsToConfig(content string) error {
	if err := EnsureConfigDir(); err != nil {
		return err
	}
	
	configPath := filepath.Join(GetConfigDir(), CredentialsFileName)
	return os.WriteFile(configPath, []byte(content), 0600)
}
