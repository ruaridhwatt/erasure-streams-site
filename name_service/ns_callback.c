#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <pthread.h>
#include "llist.h"
#include "ns_callback.h"

const int nrNSCommands = 3;
const char *nsCommandStr[] = { "lst", "con" , "rem"};
enum nsCommand {
	LIST_SERVERS = 0, SERVER_CONNECTED = 1, REMOVE_SERVER = 2, UNKNOWN = 3
};

llist *serverList;
int servers = 0;

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
	char* video;

	pthread_mutex_lock(&mux);
	currentElement = llist_first(serverList);
	video = malloc((sizeof(char) * strlen(serverinfo)) + 1);
	strcpy(video, serverinfo);
	llist_insert(currentElement, serverList, (char*)video);
	pthread_mutex_unlock(&mux);
}

char *appendString(char *s1, char *s2) {
	char *s3 = (char *)malloc((strlen(s1) + strlen(s2) + 2)*sizeof(char));
	strcpy(s3, s1);
	strcat(s3, s2);
	return s3;
}

unsigned char * list_to_send(struct toSend *s) {
	element *position;
	char *tempString1;
	char *tempString2;
	unsigned char *list;
	int length;
	int paddingSize;

	pthread_mutex_lock(&mux);
	position = llist_first(serverList);
	tempString1 = malloc((sizeof(char) * strlen("lst")) + 1);
	strcpy(tempString1, "lst");

	while(!llist_isEnd(position)){
		tempString2 = appendString(tempString1, "\t");
		free(tempString1);
		tempString1 = appendString(tempString2, (char*)llist_inspect(position));
		free(tempString2);
		position = llist_next(position);
	}

	pthread_mutex_unlock(&mux);
	fprintf(stderr, "%s\n", tempString1);
	length = strlen(tempString1);
	paddingSize = LWS_SEND_BUFFER_PRE_PADDING + LWS_SEND_BUFFER_POST_PADDING;
	list = (unsigned char *) malloc(paddingSize + length);
	memcpy(&(list[LWS_SEND_BUFFER_PRE_PADDING]), tempString1, length);

	s->size = length;
	free(tempString1);
	return list;
}

int callback_ns(struct libwebsocket_context *ctx, struct libwebsocket *wsi, enum libwebsocket_callback_reasons reason, void *user, void *in,
		size_t len) {

	enum nsCommand c;
	struct toSend *s;
	int res;
	char *serverinfo;

	switch (reason) {
	case LWS_CALLBACK_RECEIVE:

		s = (struct toSend *) user;
		c = getNSCommand(strtok(in, "\t"));
		switch(c) {
		case LIST_SERVERS:
			s->writeMode = LWS_WRITE_TEXT;
			s->data = list_to_send(s);
			break;
		case SERVER_CONNECTED:
			serverinfo = strtok(NULL, "\t");
			put_server_list(serverinfo);

			break;
		case REMOVE_SERVER:
			break;
		default:
			break;
		}
		if (s->size < MAX_SEND_SIZE && s->size > 0) {
			res = libwebsocket_write(wsi, &s->data[LWS_SEND_BUFFER_PRE_PADDING], s->size, s->writeMode);
			fprintf(stderr, "send res: %d\n", res);
			free(s->data);
			s->data = NULL;
			s->size = 0;
		} else {
			s->sent = 0;
			libwebsocket_callback_on_writable(ctx, wsi);
		}
		break;

		break;
		case LWS_CALLBACK_SERVER_WRITEABLE:
			res = 0;
			s = (struct toSend *) user;
			if (s->data == NULL) {
				break;
			}
			if (s->size - s->sent > MAX_SEND_SIZE) {
				res = libwebsocket_write(wsi, &s->data[LWS_SEND_BUFFER_PRE_PADDING + s->sent], MAX_SEND_SIZE, s->writeMode | LWS_WRITE_NO_FIN);
				fprintf(stderr, "send res: %d\n", res);
				if (res < 0) {
					free(s->data);
					s->data = NULL;
					s->size = 0;
				} else {
					s->writeMode = LWS_WRITE_CONTINUATION;
					s->sent += MAX_SEND_SIZE;
					libwebsocket_callback_on_writable(ctx, wsi);
				}
			} else {
				res = libwebsocket_write(wsi, &s->data[LWS_SEND_BUFFER_PRE_PADDING + s->sent], s->size - s->sent, s->writeMode);
				fprintf(stderr, "send res: %d\n", res);
				free(s->data);
				s->data = NULL;
				s->size = 0;
			}
			break;
		default:

			break;
	}
	return 0;
}

void init_server_list() {
	serverList = llist_empty(free);
}


