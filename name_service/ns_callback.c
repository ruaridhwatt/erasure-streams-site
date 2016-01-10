#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <pthread.h>
#include "llist.h"
#include "ns_callback.h"

const int nrNSCommands = 2;
const char *nsCommandStr[] = {"prt", "ini"};
enum nsCommand {
	SERVER_CONNECTED = 0, YID = 1, UNKNOWN = 2
};

llist *serverList = NULL;
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

element* set_tail() {
	element *position;
	position = llist_first(serverList);
	while(!llist_isEnd(position)) {
		position = llist_next(position);
	}
	return position;

}

void remove_server(struct per_session_data *psd) {

	element *position;
	char *temp_string;

	position = llist_first(serverList);
	while(!llist_isEnd(position)) {

		temp_string = malloc((sizeof(char) * strlen((char*)llist_inspect(position))) + 1);
		strcpy(temp_string, (char*)llist_inspect(position));
		fprintf(stderr, "%s\n", temp_string);
		strtok(temp_string, ":");
		strtok(NULL, ":");
		if(strcmp(strtok(NULL, ":"), psd->id) == 0) {
			llist_remove(position, serverList);
			free(temp_string);
			break;
		}
		free(temp_string);
		position = llist_next(position);
	}
}

char *appendString(char *s1, char *s2) {
	char *s3 = (char *)malloc((strlen(s1) + strlen(s2) + 2)*sizeof(char));
	strcpy(s3, s1);
	strcat(s3, s2);
	return s3;
}

char * list_to_send() {
	element *position;
	char *listContains;
	size_t buff_len;

	position = llist_first(serverList);
	buff_len = LWS_SEND_BUFFER_PRE_PADDING + LWS_SEND_BUFFER_POST_PADDING + (sizeof(char) * (strlen("lst") + 1));
	listContains = malloc(buff_len);
	strcpy(&listContains[LWS_SEND_BUFFER_PRE_PADDING], "lst");

	while(!llist_isEnd(position)){
		buff_len += sizeof(char) * (strlen((char*)llist_inspect(position)) + 1);
		listContains = realloc(listContains, buff_len);
		strcat(&listContains[LWS_SEND_BUFFER_PRE_PADDING], "\t");
		strcat(&listContains[LWS_SEND_BUFFER_PRE_PADDING], llist_inspect(position));

		position = llist_next(position);

	}
	return listContains;
}

char * ini_to_send(struct per_session_data *s) {
	size_t buff_len;
	char *ini;

	buff_len = LWS_SEND_BUFFER_PRE_PADDING + LWS_SEND_BUFFER_POST_PADDING + (sizeof(char) * (strlen("ini") + 1));
	ini = malloc(buff_len);
	strcpy(&ini[LWS_SEND_BUFFER_PRE_PADDING], "ini");

	buff_len += sizeof(char) * (strlen(s->id) + 1);
	ini = realloc(ini, buff_len);
	strcat(&ini[LWS_SEND_BUFFER_PRE_PADDING], "\t");
	strcat(&ini[LWS_SEND_BUFFER_PRE_PADDING], s->id);

	buff_len += sizeof(char) * (strlen(kStr) + 1);
	ini = realloc(ini, buff_len);
	strcat(&ini[LWS_SEND_BUFFER_PRE_PADDING], "\t");
	strcat(&ini[LWS_SEND_BUFFER_PRE_PADDING], kStr);

	buff_len += sizeof(char) * (strlen(mStr) + 1);
	ini = realloc(ini, buff_len);
	strcat(&ini[LWS_SEND_BUFFER_PRE_PADDING], "\t");
	strcat(&ini[LWS_SEND_BUFFER_PRE_PADDING], mStr);

	return ini;
}

char *server_to_send() {

	static element *position = NULL;
	size_t buff_len;
	char *ini;

	if (position == NULL) {
		position = llist_first(serverList);
	}

	buff_len = LWS_SEND_BUFFER_PRE_PADDING + LWS_SEND_BUFFER_POST_PADDING + (sizeof(char) * (strlen("ini") + 1));
	ini = malloc(buff_len);
	strcpy(&ini[LWS_SEND_BUFFER_PRE_PADDING], "ini");

	if(llist_isEmpty(serverList)) {
		buff_len += sizeof(char) * (strlen("NAK") + 1);
		ini = realloc(ini, buff_len);
		strcat(&ini[LWS_SEND_BUFFER_PRE_PADDING], "\t");
		strcat(&ini[LWS_SEND_BUFFER_PRE_PADDING], "NAK");

	} else {

		buff_len += sizeof(char) * (strlen((char*)llist_inspect(position)) + 1);
		ini = realloc(ini, buff_len);
		strcat(&ini[LWS_SEND_BUFFER_PRE_PADDING], "\t");
		strcat(&ini[LWS_SEND_BUFFER_PRE_PADDING], llist_inspect(position));

		position = llist_next(position);
		if(llist_inspect(position) == NULL) {
			position = llist_first(serverList);
		}
	}
	return ini;
}

int callback_intern(struct libwebsocket_context *ctx, struct libwebsocket *wsi, enum libwebsocket_callback_reasons reason, void *user, void *in,
		size_t len) {

	enum nsCommand c;
	struct per_session_data *psd;
	char *serverport;
	char *serverurl;
	char *temp_string;
	int res;
	char *serverinfo;
    char client_name [IP_SIZE];
    char client_ip   [IP_SIZE];
    char* list;
    char* ini;

    static element *tail = NULL;


	switch (reason) {
	case LWS_CALLBACK_ESTABLISHED:
		psd = (struct per_session_data *) user;

        libwebsockets_get_peer_addresses(ctx, wsi, libwebsocket_get_socket_fd(wsi),
                 client_name, sizeof(client_name),
                 client_ip, sizeof(client_ip));

        fprintf(stderr, "Received network connect from %s (%s)\n",
                               client_name, client_ip);

        strncpy(psd->host, client_ip, IP_SIZE);
        psd->host[IP_SIZE - 1] = '\0';

        snprintf(psd->id, ID_SIZE, "%d", servers);
        psd->id[ID_SIZE - 1] = '\0';
        ini = ini_to_send(psd);

        res = libwebsocket_write(wsi, (unsigned char*)&ini[LWS_SEND_BUFFER_PRE_PADDING], strlen(&ini[LWS_SEND_BUFFER_PRE_PADDING]), LWS_WRITE_TEXT);
        fprintf(stderr, "sent ini: %d\n", res);
        free(ini);

        servers++;
        break;

	case LWS_CALLBACK_RECEIVE:
		fprintf(stderr, "%s\n", (char*)in);
		psd = (struct per_session_data *) user;
		c = getNSCommand(strtok(in, "\t"));


		switch(c) {
		case SERVER_CONNECTED:
			serverport = strtok(NULL, "\t");

			if(serverport != NULL) {
				temp_string = appendString(psd->host, ":");
				serverurl = appendString(temp_string, serverport);
				free(temp_string);

				temp_string = appendString(serverurl, ":");
				serverinfo = appendString(temp_string, psd->id);
				free(serverurl);
				free(temp_string);

				if(tail == NULL) {
					tail = llist_first(serverList);
				}
				tail = llist_insert(tail, serverList, (char*)serverinfo);
				tail = llist_next(tail);

				list = list_to_send();

		        res = libwebsocket_write(wsi, (unsigned char*)&list[LWS_SEND_BUFFER_PRE_PADDING], strlen(&list[LWS_SEND_BUFFER_PRE_PADDING]), LWS_WRITE_TEXT);
		        fprintf(stderr, "sent list: %d\n", res);
		        free(list);
			}
			break;
		default:
			break;
		}

		break;

	case LWS_CALLBACK_CLOSED:
		psd = (struct per_session_data *) user;
		fprintf(stderr, "connection closed\n");
		fprintf(stderr, "%s\n", psd->id);
		remove_server(psd);
		tail = set_tail();
		break;
		default:
			break;
	}
	return 0;
}

int callback_ns(struct libwebsocket_context *ctx, struct libwebsocket *wsi, enum libwebsocket_callback_reasons reason, void *user, void *in,
		size_t len) {

	char *server;
	int res;

	switch (reason) {
	case LWS_CALLBACK_ESTABLISHED:
		server = server_to_send();
        res = libwebsocket_write(wsi, (unsigned char*)&server[LWS_SEND_BUFFER_PRE_PADDING], strlen(&server[LWS_SEND_BUFFER_PRE_PADDING]), LWS_WRITE_TEXT);
        fprintf(stderr, "send res: %d\n", res);
        free(server);
		break;
	default:
		break;
	}
	return 0;
}

void init_server_list() {
	serverList = llist_empty(free);
}

void free_server_list() {
	llist_free(serverList);
}


