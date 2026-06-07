.PHONY: build run test clean docker-build docker-run

build:
	npm run build

run:
	npm start

test:
	echo "No tests defined."

clean:
	rm -rf dist/
	rm -rf node_modules/

docker-build:
	docker build -t automata-engine .

docker-run:
	docker-compose up
