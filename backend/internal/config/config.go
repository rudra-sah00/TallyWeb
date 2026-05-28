package config

import (
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Tally          TallyConfig  `yaml:"tally"`
	Server         ServerConfig `yaml:"server"`
	DefaultCompany string       `yaml:"default_company"`
	DataPath       string       `yaml:"data_path"` // Path to Tally data folder (contains company dirs)
}

type TallyConfig struct {
	Host    string        `yaml:"host"`
	Port    int           `yaml:"port"`
	Timeout time.Duration `yaml:"timeout"`
}

type ServerConfig struct {
	Port        int      `yaml:"port"`
	CORSOrigins []string `yaml:"cors_origins"`
}

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	if cfg.Server.Port == 0 {
		cfg.Server.Port = 8080
	}
	return &cfg, nil
}
