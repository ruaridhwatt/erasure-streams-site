#ifndef NS_CALLBACK_H_
#define NS_CALLBACK_H_

#include <libwebsockets.h>

#define MAX_SEND_SIZE 1024 * 1024

struct toSend {
	unsigned char *data;
	size_t size;
	size_t sent;
	int writeMode;
};

int callback_ns(struct libwebsocket_context *ctx, struct libwebsocket *wsi, enum libwebsocket_callback_reasons reason, void *user, void *in, size_t len);
void init_server_list();

pthread_mutex_t mux;

#endif /* NS_CALLBACK_H_ */
