var wsServerUrl = "ws://dobby.cs.umu.se:8888";

var infoSocket = null;
var audioSocket = null;
var videoSocket = null;

var infoIntention = "lst";
var audioIntention = null;
var audioInd = 0;
var videoIntention = null;
var videoInd = 0;

var filename = null;
var video = document.getElementById('v');
var mediaSource = null;
var audioAppender = null;
var videoAppender = null;

$(document).ready(function() {
	// wsInfoConnect(); // use when using dedicated webserver
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
		if (typeof received == "string") {
			handleCommand(received);
		} else {
			infoIntention = null;
			var mpd;
			var fileReader = new FileReader();
			fileReader.onload = function() {
				mpd = new Mpd(this.result);
				createMediaSource(mpd);
			};
			fileReader.readAsText(received);

		}
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
		} else if (audioAppender) {
			audioAppender.appendBlob(received);
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
		} else if (videoAppender) {
			videoAppender.appendBlob(received);
			requestNextBlob(videoSocket, );
		}
	};

	videoSocket.onerror = function(errorEvent) {
		console.log("Error in connection to " + wsServerUrl);
	};
}

function wsConnect() {
	wsInfoConnect();
	//wsAudioConnect();
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
	case ("EOA"):
		console.log("Audio buffering complete");
		audioAppender = audioIntention = null;
		break;
	case ("EOV"):
		console.log("Video buffering complete");
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

function createMediaSource(mpd) {
	mediaSource = new MediaSource;
	video.src = URL.createObjectURL(mediaSource);
	mediaSource.addEventListener('sourceopen', function() {
		audioInd = 0;
		videoInd = 0;
		if (mpd.audioType && audioSocket) {
			var audioBuffer = mediaSource.addSourceBuffer(mpd.audioType);
			audioAppender = new MediaAppender(audioBuffer);
			audioSocket.send("ini\t" + filename);
		} else {
			console.log("Audio stream could not be initialised!");
			audioIntention = null;
		}

		if (mpd.videoType && videoSocket) {
			var videoBuffer = mediaSource.addSourceBuffer(mpd.videoType);
			videoAppender = new MediaAppender(videoBuffer);
			videoSocket.send("ini\t" + filename);
		} else {
			console.log("Video stream could not be initialised!");
			videoIntention = null;
		}
		mediaSource.removeEventListener('sourceopen', this);
	});
}

function MediaAppender(sourceBuffer) {
	var fileReader = new FileReader();
	fileReader.onload = function() {
		sourceBuffer.appendBuffer(this.result);
	};
	this.appendBlob = function(blob) {
		console.log("appending: " );
		fileReader.readAsArrayBuffer(blob);
	};
}
