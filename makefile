PROGRAM_NAME=name_server
SRC_DIR=name_service
BIN_DIR=name_bin

all: $(PROGRAM_NAME)

$(PROGRAM_NAME):
	mkdir -p $(BIN_DIR)
	cd $(SRC_DIR) && $(MAKE)

clean:
	rm -R $(BIN_DIR)
