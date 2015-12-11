var wsServerUrl = "ws://dobby.cs.umu.se:1337";
var infoSocket = null;
var infoIntention = "lst";
var streamer;

$(document).ready(function() {
	wsConnect();
});

function wsConnect() {
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
		if (typeof received == "string") {
			handleCommand(received);
		} else {
			var filename = infoIntention.split("\t")[1];
			infoIntention = null;
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

function handleCommand(received) {
	var c = received.split("\t");
	switch (c[0]) {
	case ("video-list"):
		infoIntention = null;
		createStreamList(c);
		break;
	case ("swith-server"):
		wsClose();
		wsServerUrl = c[1];
		wsConnect();
		break;
	case ("NOK"):
		alert("File not found!");
		infoIntention = "lst";
		audioAppender = audioIntention = null;
		videoAppender = videoIntention = null;
		break;
	default:
		console.log("unknown command: " + c[0]);
		break;
	}
}

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

function startStreaming() {
	infoIntention = "mpd\t" + filename;
	infoSocket.send(infoIntention);
}
