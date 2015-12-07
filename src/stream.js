var wsServerUrl = "ws://localhost:8888";
var infoSocket;
var audioSocket;
var videoSocket;
var infoIntention = "lst";
var audioIntention = null;
var videoIntention = null;

$(document).ready(function() {
	//wsInfoConnect(); // use when using dedicated webserver
	wsConnect(); // use when bypassing webserver
});

function wsInfoConnect() {
	console.log("Opening Info Websocket to " + wsServerUrl + "...");
	infoSocket = new WebSocket(wsServerUrl, "info");

	infoSocket.onopen = function(openEvent) {
		console.log("Info Socket Opened!");
		if (infoIntention) {
			infoSocket.send(infoIntention);
		}
	};

	infoSocket.onmessage = function(messageEvent) {
		var received = messageEvent.data;
		console.log(received);
		handleCommand(received);
	};

	infoSocket.onerror = function(errorEvent) {
		console.log("Error in connection to " + wsServerUrl);
	};
}

function wsAudioConnect() {
	console.log("Opening Audio Websockets to " + wsServerUrl + "...");
	audioSocket = new WebSocket(wsServerUrl, "audio");

	audioSocket.onopen = function(openEvent) {
		console.log("Audio Socket Opened!");
		if (audioIntention) {
			infoSocket.send(audioIntention);
		}
	};

	audioSocket.onmessage = function(messageEvent) {
		var received = messageEvent.data;
		if (typeof received == "string") {
			handleCommand(received);
		} else {
			// TODO
			bufferAudio(received);
		}
	};

	audioSocket.onerror = function(errorEvent) {
		console.log("Error in connection to " + wsServerUrl);
	};
}

function wsVideoConnect() {
	console.log("Opening Video Websockets to " + wsServerUrl + "...");
	videoSocket = new WebSocket(wsServerUrl, "video");

	videoSocket.onopen = function(openEvent) {
		console.log("Video Socket Opened!");
		if (videoIntention) {
			infoSocket.send(videoIntention);
		}
	};

	videoSocket.onmessage = function(messageEvent) {
		var received = messageEvent.data;
		if (typeof received == "string") {
			handleCommand(received);
		} else {
			// TODO
			bufferVideo(received);
		}
	};

	videoSocket.onerror = function(errorEvent) {
		console.log("Error in connection to " + wsServerUrl);
	};
}

function wsConnect() {
	wsInfoConnect();
	wsAudioConnect();
	wsVideoConnect();
}

function wsClose() {
	infoSocket.close();
	if (audioSocket)
		audioSocket.close();
	if (videoSocket)
		videoSocket.close();
}

$(window).on("beforeunload", function() {
	wsClose();
});

function handleCommand(received) {
	var c = received.split("\t");
	switch (c[0]) {
	case ("video-list"):
		infoIntention = null;
		createStreamList(c);
		break;
	case ("mpd-file"):
		infoIntention = null;
		parseMpd(c);
		break;
	case ("swith-server"):
		wsClose();
		wsServerUrl = c[1];
		wsConnect();
		break;
	case ("NOK"):
		alert("File not found!");
		break;
	default:
		console.log("unknown command: " + c[0]);
		break;
	}
}

function creatStreamList(streams) {
	var list = "";
	for ( var i = 1; i < streams.length; i++) {
		list += "<li><a href=\"#\">" + streams[i] + "</a></li>";
	}
	$(".streams").html(list);
	$(".streams a").on("click", function(event) {
		var filename = $(this).text();
		startStreaming(filename);
	});
}

function startStreaming(filename) {
	// TODO get and parse MPD
	// TODO create relevant mediasource
	audioIntention = "stm\t" + filename;
	videoIntention = "stm\t" + filename;
	audioSocket.send(audioIntention);
	videoSocket.send(videoIntention);
}

function parceMpd(mpd) {

}