function MediaStreamer(filename, mpd, serverUrl, videoElem) {
	var mediaSource = new MediaSource;
	mediaSource.addEventListener('sourceopen', onSourceOpen);
	videoElem.src = window.URL.createObjectURL(mediaSource);

	function onSourceOpen() {
		if (mediaSource.sourceBuffers.length > 0) {
			return;
		}

		audioTrack = new TrackStream(serverUrl, "audio", filename, mpd,
				mediaSource);
		videoElem.addEventListener('seeking', audioTrack.seeking
				.bind(videoElem));
		videoElem.addEventListener('progress', audioTrack.progress);

		videoTrack = new TrackStream(serverUrl, "video", filename, mpd,
				mediaSource);
		videoElem.addEventListener('seeking', videoTrack.seeking
				.bind(videoElem));
		videoElem.addEventListener('progress', videoTrack.progress);
	}

}

function TrackStream(serverUrl, protocol, filename, mpd, mediaSource) {
	var codec;
	switch (protocol) {
	case "audio":
		codec = mpd.audioCodecStr;
		break;
	case "video":
		codec = mpd.videoCodecStr;
		break;
	default:
		console.log("Unknown protocol: " + protocol);
		return;
		break;
	}
	var sourceBuffer = mediaSource.addSourceBuffer(codec);
	var iniBuffered = false;
	var currSegId = 1;
	var segIncoming = false;
	var dataQueue = [];

	var command = "ini\t" + filename;

	var socket = new WebSocket(serverUrl, protocol);
	setSocketEventHandlers();

	function setSocketEventHandlers() {
		socket.onopen = function(openEv) {
			console.log("Connected to " + protocol + " Stream");
			if (command) {
				socket.send(command);
			}
		};
		socket.onmessage = function(messageEv) {
			var received = messageEv.data;
			if (typeof received == "string") {
				handleCommand(received);
			} else {
				var fileReader = new FileReader();
				fileReader.onload = function() {
					dataQueue.push(this.result);
				};
				fileReader.readAsArrayBuffer(received);
				if (!iniBuffered) {
					command = null;
					sourceBuffer.addEventListener('updateend', updateEnd);
					updateEnd();
				}
			}
		};

		socket.onerror = function(errorEv) {
			console.log("Video Stream Connection Error");
		};
	}

	var updateEnd = function() {
		if (dataQueue.length > 0 && !sourceBuffer.updating) {
			sourceBuffer.appendBuffer(dataQueue.shift());
		}
		if (!iniBuffered) {
			iniBuffered = true;
			requestNextMediaSegment();
		}
	};

	function requestNextMediaSegment() {
		if (segIncoming) {
			return false;
		}

		segIncoming = true;
		command = "get\t" + filename + "\t" + currSegId++;
		socket.send(command);
	}

	function handleCommand(received) {
		var c = received.split("\t");
		switch (c[0]) {
		case ("swith-server"):
			socket.close();
			socket = new WebSocket(c[1], protocol);
			setSocketEventHandlers();
			break;
		case ("NOK"):
			console.log(protocol + ": " + command);
			console.log("NOK received!");
			break;
		case ("EOS"):
			command = null;
			segIncoming = false;
			updateEnd();
			break;
		default:
			console.log("unknown command: " + c[0]);
			break;
		}
	}

	this.seeking = function(videoElem) {
		console.log("seeking: " + videoElem.target.currentTime);
	};

	this.progress = function() {
		console.log("Progressing " + protocol);
		requestNextMediaSegment();
	};

}
