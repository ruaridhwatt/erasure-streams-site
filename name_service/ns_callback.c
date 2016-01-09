#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <pthread.h>
#include "llist.h"
#include "hashmap.h"
#include "hashmap_settings.h"
#include "ns_callback.h"

const int nrNSCommands = 1;
const char *nsCommandStr[] = { "lst", "prt", "ini"};
enum nsCommand {
	LIST_SERVERS = 0, SERVER_CONNECTED = 1, YID = 2, UNKNOWN = 3
};

llist *serverList;
hashmap *serverMap;
int servers = 1;

enum nsCommand getNSCommand(char *in) {
	int i;
	for (i = 0; i < nrNSCommands; i++) {
		if (strcmp(in, nsCommandStr[i]) == 0) {
			break;
		}
	}
	return (enum nsCommand) i;
}

void put_server_list(char *serverinfo) {
	element *currentElement;
	char* server;

	currentElement = llist_first(serverList);
	server = malloc((sizeof(char) * strlen(serverinfo)) + 1);
	strcpy(server, serverinfo);
	llist_insert(currentElement, serverList, (char*)server);
	free(serverinfo);
}

void remove_server(char *id, char *serverurl) {

	element *position;
	char *temp_string;

	position = llist_first(serverList);

	while(!llist_isEnd(position)) {

		temp_string = malloc((sizeof(char) * strlen((char*)llist_inspect(position))) + 1);
		strcpy(temp_string, (char*)llist_inspect(position));
		strtok(temp_string, ":");
		strtok(NULL, ":");
		if(strcmp(strtok(NULL, ":"), id) == 0) {
			llist_remove(position, serverList);
			if(hashmap_get(serverurl, strlen(serverurl) + 1, serverMap) != NULL) {
				hashmap_remove(serverurl, strlen(serverurl) + 1, serverMap);
			}

			free(temp_string);
			break;
		}
		free(temp_string);
		position = llist_next(position);
	}
}

void put_server_map(char *filename) {
	entry *mentry;

	mentry = create_entry(filename, "void");
	hashmap_put(mentry, serverMap);
}

char *appendString(char *s1, char *s2) {
	char *s3 = (char *)malloc((strlen(s1) + strlen(s2) + 2)*sizeof(char));
	strcpy(s3, s1);
	strcat(s3, s2);
	return s3;
}

char *getKMstr() {
	char * temp_string1;
	char * temp_string2;
	char * kmStr;

	temp_string1 = appendString("\t", kStr);
	temp_string2 = appendString(temp_string1, "\t");
	free(temp_string1);
	kmStr = appendString(temp_string2, mStr);
	free(temp_string2);
	return kmStr;
}

unsigned char * list_to_send(struct toSend *s) {
	element *position;
	char *tempString1;
	char *tempString2;
	char *tempString3;
	unsigned char *list;
	int length;
	int paddingSize;

	position = llist_first(serverList);
	tempString1 = malloc((sizeof(char) * strlen("lst")) + 1);
	strcpy(tempString1, "lst");

	while(!llist_isEnd(position)){
		tempString3 = malloc((sizeof(char) * strlen((char*)llist_inspect(position))) + 1);
		strcpy(tempString3, (char*)llist_inspect(position));
		strtok(tempString3, ":");
		strtok(NULL, ":");

		if(strcmp(strtok(NULL, ":"), s->id) != 0) {

			tempString2 = appendString(tempString1, "\t");
			free(tempString1);
			tempString1 = appendString(tempString2, (char*)llist_inspect(position));
			free(tempString2);
		}
		position = llist_next(position);
		free(tempString3);
	}

	length = strlen(tempString1);
	paddingSize = LWS_SEND_BUFFER_PRE_PADDING + LWS_SEND_BUFFER_POST_PADDING;
	list = (unsigned char *) malloc(paddingSize + length);
	memcpy(&(list[LWS_SEND_BUFFER_PRE_PADDING]), tempString1, length);

	s->size = length;
	free(tempString1);
	return list;
}

unsigned char * ini_to_send(struct toSend *s) {
	int length;
	int paddingSize;
	unsigned char* data;
	char *temp_string;

	char *str_tosend;
	char *kmStr;
	kmStr = getKMstr();

	temp_string = appendString("ini\t", s->id);
	str_tosend = appendString(temp_string, kmStr);
	free(temp_string);
	free(kmStr);

	length = strlen(str_tosend);
	paddingSize = LWS_SEND_BUFFER_PRE_PADDING + LWS_SEND_BUFFER_POST_PADDING;
	data = (unsigned char *) malloc(paddingSize + length);
	memcpy(&(data[LWS_SEND_BUFFER_PRE_PADDING]), str_tosend, length);
	free(str_tosend);
	s->size = length;
	return data;
}

int callback_ns(struct libwebsocket_context *ctx, struct libwebsocket *wsi, enum libwebsocket_callback_reasons reason, void *user, void *in,
		size_t len) {

	enum nsCommand c;
	struct toSend *s;
	char *serverport;
	char *serverurl;
	char *temp_string;
	int res;
	char *serverinfo;
    char client_name [IP_SIZE];
    char client_ip   [IP_SIZE];
    char idStr		 [IP_SIZE];

	switch (reason) {
	case LWS_CALLBACK_ESTABLISHED:
		s = (struct toSend *) user;

        libwebsockets_get_peer_addresses(ctx, wsi, libwebsocket_get_socket_fd(wsi),
                 client_name, sizeof(client_name),
                 client_ip, sizeof(client_ip));

        fprintf(stderr, "Received network connect from %s (%s)\n",
                               client_name, client_ip);

        s->address = malloc((sizeof(char) * strlen(client_name)) + 1);
        strcpy(s->address, client_name);
        break;

	case LWS_CALLBACK_RECEIVE:
		fprintf(stderr, "%s\n", (char*)in);
		s = (struct toSend *) user;
		c = getNSCommand(strtok(in, "\t"));

		switch(c) {
		case LIST_SERVERS:
			s->writeMode = LWS_WRITE_TEXT;
			s->data = list_to_send(s);
			break;
		case SERVER_CONNECTED:
			serverport = strtok(NULL, "\t");

			if(serverport != NULL) {
				temp_string = appendString(s->address, ":");

				/*the memory allocated in server leaks at the moment */
				serverurl = appendString(temp_string, serverport);

				free(temp_string);
				if(hashmap_get(serverurl, strlen(serverurl) + 1, serverMap) == NULL) {

					snprintf(idStr, IP_SIZE, "%d", servers);

					temp_string = appendString(serverurl, ":");
					serverinfo = appendString(temp_string, idStr);

					put_server_list(serverinfo);
					put_server_map(serverurl);

					s->serverurl = malloc((sizeof(char) * strlen(serverurl)) + 1);
					strcpy(s->serverurl, serverurl);

					s->id = malloc((sizeof(char) * strlen(idStr)) + 1);
					strcpy(s->id, idStr);

					servers++;
					s->data = ini_to_send(s);
					s->writeMode = LWS_WRITE_TEXT;

					free(temp_string);
				} else {
					free(serverurl);
				}
			}
			break;
		default:
			break;
		}

		if (s->size > 0) {
			res = libwebsocket_write(wsi, &s->data[LWS_SEND_BUFFER_PRE_PADDING], s->size, s->writeMode);
			fprintf(stderr, "send res: %d\n", res);
			free(s->data);
			s->data = NULL;
			s->size = 0;
		}
		break;

	case LWS_CALLBACK_CLOSED:
		s = (struct toSend *) user;
		fprintf(stderr, "connection closed\n");
		fprintf(stderr, "%s\n", s->id);
		remove_server(s->id, s->serverurl);
		free(s->address);
		free(s->serverurl);
		free(s->id);
		break;
		default:
			break;
	}
	return 0;
}

void init_server_list() {
	serverList = llist_empty(free);
}

void init_server_map() {
	serverMap = hashmap_empty(20, string_hash_function, entry_free_func);
}

void free_server_list() {
	llist_free(serverList);
}

void free_server_map() {
	hashmap_free(serverMap);
}


