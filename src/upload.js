var wsServerUrl = "ws://dobby.cs.umu.se:8888";
var socket;
var uploading = false;
var intention = null;

wsConnect();

$(window).on("beforeunload", function() {
	socket.close();
});

$(document).ready(function() {

	$(document).on("change", ".btn-file :file", function(event) {
		setProgressBar(0, 100);
		var file = event.target.files[0];
		showVideo(file);
		showUpload(file);
	});

	$(document).on("click", ".btn-upload", function(event) {
		var file = $(".btn-file :file").prop("files")[0];
		if (file) {
			intention = "upl\t" + file.name;
			socket.send(intention);
		}
	});
});

function wsConnect() {
	console.log("Opening Websocket to " + wsServerUrl + "...");
	socket = new WebSocket(wsServerUrl, "upload");

	socket.onopen = function(openEvent) {
		console.log("Opened!");
		if (intention) {
			socket.send(intention);
		}
	};

	socket.onmessage = function(messageEvent) {
		var received = messageEvent.data;
		handleCommand(received);
	};

	socket.onerror = function(errorEvent) {
		console.log("Error in connection to " + wsServerUrl);
	};
}

function handleCommand(received) {
	var c = received.split("\t");
	console.log(c);
	switch (c[0]) {
	case ("OK"):
		console.log("Uploading...");
		uploadFile();
		intention = null;
		break;
	case ("swith-server"):
		socket.close();
		wsServerUrl = c[1];
		wsConnect();
		break;
	default:
		console.log("Unknown command: " + c[0]);
		break;
	}
}

function buildVideo(file) {
	var video = $("<video />", {
		id : "video",
		width : "500",
		src : URL.createObjectURL(file),
		type : "video/mp4",
		controls : true
	});
	return video;
}

function uploadFile() {
	var file = $(".btn-file :file").prop("files")[0];
	if (file && !uploading) {
		uploading = true;
		var slicer = new FileSlicer(file);
		while (slicer.hasNext()) {
			socket.send(slicer.next());
		}
		terminator = new ArrayBuffer(1);
		socket.send(terminator);
		socket.send(terminator);

		var progressInterval = setInterval(function(total) {
			setProgressBar(total - socket.bufferedAmount, total);
			if (socket.bufferedAmount == 0) {
				clearInterval(progressInterval);
			}
		}, 100, file.size);
	}
}

function showVideo(file) {
	if (file) {
		$("#video-title").html(file.name);
		$("div.video-wrapper").html(buildVideo(file));
	} else {
		$("#video-title").html("");
		$("div.video-wrapper").html("");
	}

}

function showUpload(bool) {
	if (bool) {
		$(".progress-upload").show();
	} else {
		$(".progress-upload").hide();
	}
}

function FileSlicer(file) {

	this.SLICE_SIZE = 10 * 1024 * 1024;
	this.start = 0;
	this.end = this.SLICE_SIZE;

	this.hasNext = function() {
		return (this.start < file.size);
	};

	this.next = function() {
		var slice = file.slice(this.start, this.end);
		this.start = this.end;
		this.end = Math.min(this.end + this.SLICE_SIZE, file.size);
		return slice;
	};
}

function setProgressBar(bytesUploaded, total) {
	var percent = Math.round(bytesUploaded * 100 / total);
	$(".progress-upload").prop("value", percent);
	if (bytesUploaded == total) {
		uploading = false;
		showUpload(false);
	}
}