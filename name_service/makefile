OUT=name_server
COMPILER=gcc
FLAGS=-g -Wall -pedantic
LIBS=-lwebsockets -lpthread

BIN_DIR=../name_bin

all: $(OUT)

$(OUT):name_server.o ns_callback.o llist.o
	$(COMPILER) $(FLAGS) -o $(BIN_DIR)/$(OUT) $(BIN_DIR)/name_server.o $(BIN_DIR)/ns_callback.o $(BIN_DIR)/llist.o $(LIBS)

name_server.o: name_server.c name_server.h ns_callback.h llist.h
	$(COMPILER) $(FLAGS) -o $(BIN_DIR)/name_server.o name_server.c -c

ns_callback.o: ns_callback.c ns_callback.h llist.h
	$(COMPILER) $(FLAGS) -o $(BIN_DIR)/ns_callback.o ns_callback.c -c

llist.o: llist.c llist.h 
	$(COMPILER) $(FLAGS) -o $(BIN_DIR)/llist.o llist.c -c

