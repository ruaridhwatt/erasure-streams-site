#ifndef NS_CALLBACK_H_
#define NS_CALLBACK_H_

#include <libwebsockets.h>

#define MAX_SEND_SIZE 1024 * 1024
#define IP_SIZE 50
#define ID_SIZE 10
#define PORT_SIZE 6
#define HIGHEST_PORT_VALUE 65535

#define K_STR_LEN 4
#define M_STR_LEN 4

char kStr[K_STR_LEN];
char mStr[M_STR_LEN];

struct per_session_data {
	char id[ID_SIZE];
	char host[IP_SIZE];
	char port[PORT_SIZE];
};

int callback_intern(struct libwebsocket_context *ctx, struct libwebsocket *wsi, enum libwebsocket_callback_reasons reason, void *user, void *in, size_t len);
int callback_ns(struct libwebsocket_context *ctx, struct libwebsocket *wsi, enum libwebsocket_callback_reasons reason, void *user, void *in, size_t len);
void init_server_list();
void init_server_map();
void free_server_list();
void free_server_map();

#endif /* NS_CALLBACK_H_ */
