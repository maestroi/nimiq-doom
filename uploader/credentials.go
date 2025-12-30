package main

import (
	"bufio"
	"os"
	"strings"
)

// LoadCredentials loads credentials from account_credentials.txt
func LoadCredentials(filename string) (map[string]string, error) {
	creds := make(map[string]string)
	
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
func GetDefaultAddress() string {
	creds, err := LoadCredentials("account_credentials.txt")
	if err != nil {
		return ""
	}
	return creds["ADDRESS"]
}
