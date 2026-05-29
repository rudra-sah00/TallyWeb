.PHONY: build run clean

build:
	go build -o bin/tallyweb-server ./cmd/server/

run: build
	./bin/tallyweb-server -config config.yaml

clean:
	rm -rf bin/
