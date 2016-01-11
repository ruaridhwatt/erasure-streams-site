function MediaStreamer(filename, mpd, serverUrl, videoElem) {
	var mediaSource = new MediaSource;
	mediaSource.addEventListener('sourceopen', onSourceOpen);
	videoElem.src = window.URL.createObjectURL(mediaSource);

	function onSourceOpen() {
		if (mediaSource.sourceBuffers.length > 0) {
			console.log("Unable to create new Media Source!");
			return;
		}

		var audioSourceBuffer = mediaSource.addSourceBuffer(mpd.audioCodecStr);
		var audioSegFactory = new SegmentFactory(serverUrl, "audio", filename);
		var audioTrack = new StreamedTrack(audioSourceBuffer, audioSegFactory);

		var videoSourceBuffer = mediaSource.addSourceBuffer(mpd.videoCodecStr);
		var videoSegFactory = new SegmentFactory(serverUrl, "video", filename);
		var videoTrack = new StreamedTrack(videoSourceBuffer, videoSegFactory);

	}

}

function StreamedTrack(sourceBuffer, segmentFactory) {

	var appendData = function(res) {
		sourceBuffer.appendBuffer(res);
	};

	var requestNextDataSeg = function() {
		segmentFactory.next();
	};

	segmentFactory.setCallback(appendData);
	sourceBuffer.addEventListener('update', requestNextDataSeg);
	/* Request initial segment */
	segmentFactory.next();
}

function SegmentFactory(initUrl, protocol, filename) {

	var socket = null;
	var i = 0;
	var command = "ini\t" + filename;

	function convertData(data) {
		var fr = new FileReader();

		fr.onload = function() {
			callback(this.result);
		};

		fr.readAsArrayBuffer(data);
	}

	function handleCommand(received) {
		var c = received.split("\t");

		switch (c[0]) {
		case ("switch-server"):
			socket.close();
			socket = new WebSocket(c[1], protocol);
			setSocketEventHandlers();
			break;
		case ("EOS"):
			hasNext = false;
			break;
		default:
			console.log("unknown command: " + c[0]);
			break;
		}
	}

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
				command = null;
				convertData(received);
			}
		};

		socket.onerror = function(errorEv) {
			console.log("Segment Factory Connection Error");
		};
	}
	var callback = function(res) {
		console.log("Callback not set");
	};

	this.setCallback = function(f) {
		callback = f;
	};
	this.hasNext = true;
	this.next = function() {
		if (this.hasNext) {
			if (!command) {
				command = "get\t" + filename + "\t" + (++i);
			}
			console.log(protocol + ": " + command);
			if (!socket) {
				socket = new WebSocket(initUrl, protocol);
				setSocketEventHandlers();
			} else {
				socket.send(command);
			}
		}
	};
}
