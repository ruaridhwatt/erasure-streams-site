var wsServerUrl;
var nsPort = 8888;
var infoSocket = null;
var command = "lst";
var streamer;

/**
 * Connects to the nameserver to be redirected to a media server
 */
$(document).ready(function() {
	infoSocket = new WebSocket("ws://" + document.location.host + ":" + nsPort, "redirector");
	infoSocket.onopen = function(openEvent) {
		console.log("NS socket Opened!");
	};
	infoSocket.onmessage = function(messageEvent) {
		var received = messageEvent.data;
		if (typeof received == "string") {
			handleCommand(received);
		}
	};
	infoSocket.onerror = function(errorEvent) {
		console.log("Error in connection to " + "ws://" + document.location.host + ":" + nsPort);
	};
});

/**
 * Connects to a media server
 */
function wsConnect() {
	console.log("Opening Info Websocket to " + wsServerUrl + "...");
	infoSocket = new WebSocket(wsServerUrl, "info");

	infoSocket.onopen = function(openEvent) {
		console.log("Info Socket Opened!");
		if (command) {
			infoSocket.send(command);
		}
	};

	infoSocket.onmessage = function(messageEvent) {
		var received = messageEvent.data;
		console.log(received);
		if (typeof received == "string") {
			handleCommand(received);
		} else {
			var filename = command.split("\t")[1];
			command = null;
			var videoElement = document.getElementById("v");

			var fileReader = new FileReader();
			fileReader.onload = function() {
				streamer = new MediaStreamer(filename, new Mpd(this.result),
						wsServerUrl, videoElement);
			};
			fileReader.readAsText(received);
		}
	};

	infoSocket.onerror = function(errorEvent) {
		console.log("Error in connection to " + wsServerUrl);
	};
}

$(window).on("beforeunload", function() {
	infoSocket.close();
});

/**
 * Hanldes the received text based command
 * @param received
 */
function handleCommand(received) {
	var c = received.split("\t");
	switch (c[0]) {
	case ("video-list"):
		command = null;
		createStreamList(c);
		break;
	case ("switch-server"):
		infoSocket.close();
		wsServerUrl = c[1];
		wsConnect();
		break;
	case ("NOK"):
		alert("Video unavailable!");
		command = "lst";
		audioAppender = audioIntention = null;
		videoAppender = videoIntention = null;
		break;
	default:
		console.log("unknown command: " + c[0]);
		break;
	}
}

/**
 * Creates and appends list items to the dropdown list of streams from the provided string array (streams).
 */
function createStreamList(streams) {
	var list = "";
	for ( var i = 1; i < streams.length; i++) {
		list += "<li><a href=\"#\">" + streams[i] + "</a></li>";
	}
	$(".streams").html(list);
	$(".streams a").on("click", function(event) {
		filename = $(this).text();
		startStreaming();
	});
}

/**
 * Starts the streaming process
 */
function startStreaming() {
	command = "mpd\t" + filename;
	infoSocket.send(command);
}
