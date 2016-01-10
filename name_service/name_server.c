#include <stdio.h>
#include <stdlib.h>
#include <getopt.h>
#include <string.h>
#include <stdbool.h>
#include <signal.h>
#include <unistd.h>
#include "libwebsockets.h"
#include <pthread.h>
#include <errno.h>
#include <limits.h>

#include "llist.h"
#include "ns_callback.h"
#include "name_server.h"

static struct libwebsocket_protocols protocols[] = { { "intern", callback_intern, sizeof(struct per_session_data), 0 },
		{ "name_service", callback_ns, sizeof(struct per_session_data), 0 },
		{ NULL, NULL, 0 } };

static volatile int force_exit = 0;

int main(int argc, char *argv[]) {
	int port, res, c, k, m;

	struct lws_context_creation_info info;
	struct libwebsocket_context *context;

	signal(SIGINT, sighandler);

	port = -1;
	k = -1;
	m = -1;
	while ((c = getopt(argc, argv, "k:m:p:")) != -1) {
		switch (c) {
		case 'k':
			res = str2int(optarg, &k);
			break;
		case 'm':
			res = str2int(optarg, &m);
			break;
		case 'p':
			res = str2int(optarg, &port);
			break;
		case '?':
			exit(1);
			break;
		default:
			exit(1);
		}
		if (res < 0) {
			break;
		}
	}

	if (res < 0 || port < 1024 || k <= 0 || m <= 0 || m > k) {
		fprintf(stderr, "wrong input\n");
		exit(1);
	}

	if (port < 1024 ) {
		exit(1);
	}

	snprintf(kStr, K_STR_LEN, "%d", k);
	snprintf(mStr, M_STR_LEN, "%d", m);

	/* Create websockets server */

	memset(&info, 0, sizeof(info));
	info.port = port;
	info.gid = -1;
	info.uid = -1;
	info.protocols = protocols;

	printf("starting server...\n");
	init_server_list();
	context = libwebsocket_create_context(&info);
	if (context == NULL) {
		fprintf(stderr, "libwebsocket init failed\n");
		return EXIT_FAILURE;
	}

	while (!force_exit) {
		libwebsocket_service(context, 500);
	}
	printf("stopping server...\n");
	libwebsocket_context_destroy(context);
	free_server_list();
	return EXIT_SUCCESS;
}

void sighandler(int sig) {
	force_exit = 1;
}

int str2int(char *str, int *i) {
	long l;
	char *pEnd;
	if (str == NULL) {
		return -1;
	}
	errno = 0;
	l = strtol(str, &pEnd, 10);
	if (pEnd == str || *pEnd != '\0' || errno == ERANGE) {
		return -1;
	}
	if (l > INT_MAX || l < INT_MIN) {
		errno = ERANGE;
		return -1;
	}
	*i = (int) l;
	return 0;
}


