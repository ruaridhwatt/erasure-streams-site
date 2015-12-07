var video = document.getElementById('v');
// Create the media source
var videoCodec = 'video/mp4; codecs="avc1.640028"';
var audioCodec = 'video/mp4; codecs="mp4a.40.2"';
var mediaSource;

$(document).ready(function() {

	// Check for the various File API support.
	if (window.File && window.Blob) {

		$(document).on('click', '.go', function(event) {
			if ('MediaSource' in window) {
				mediaSource = new MediaSource;
				console.log(mediaSource.readyState); // closed
				video.src = URL.createObjectURL(mediaSource);
				mediaSource.addEventListener('sourceopen', onSourceOpen);
			} else {
				console.error('MediaSource not supported');
			}
		});

	} else {
		alert('The File APIs are not fully supported in this browser.');
	}
});

function onSourceOpen(_) {
	console.log(this.readyState); // open
	var vidInit = $('.vid-init :file').prop('files')[0];
	var audioInit = $('.audio-init :file').prop('files')[0];
	var vidSegs = $('.vid-segs :file').prop('files')[0];
	var audioSegs = $('.audio-segs :file').prop('files')[0];

	var videoSlicer = new FileSlicer(vidSegs);
	var audioSlicer = new FileSlicer(audioSegs);

	var audioBuf = mediaSource.addSourceBuffer(audioCodec);
	var audioAppender = new FileReader();
	audioAppender.onload = function() {
		audioBuf.appendBuffer(this.result);
	};

	var videoBuf = mediaSource.addSourceBuffer(videoCodec);
	var videoAppender = new FileReader();
	videoAppender.onload = function() {
		videoBuf.appendBuffer(this.result);
	};

	audioBuf.addEventListener('updateend', appendAudio);
	videoBuf.addEventListener('updateend', appendVideo);

	appendInit(vidInit, videoBuf);
	appendInit(audioInit, audioBuf);
	video.play();

	function appendInit(file, buffer) {
		var initReader = new FileReader();
		initReader.onload = function() {
			buffer.appendBuffer(this.result);
		};
		initReader.readAsArrayBuffer(file);
	}

	function appendAudio() {
		if (mediaSource.readyState == "closed") {
			console.log('mediaSource.readyState == closed');
			return;
		}
		if (mediaSource.sourceBuffers[0].updating) {
			console.log('mediaSource.sourceBuffers[0].updating');
			return;
		}
		if (audioSlicer.hasNext()) {
			audioAppender.readAsArrayBuffer(audioSlicer.next());
		}
	}

	function appendVideo() {
		if (mediaSource.readyState == "closed") {
			console.log('mediaSource.readyState == closed');
			return;
		}
		if (mediaSource.sourceBuffers[0].updating) {
			console.log('mediaSource.sourceBuffers[0].updating');
			return;
		}
		if (videoSlicer.hasNext()) {
			videoAppender.readAsArrayBuffer(videoSlicer.next());
		}
	}
}

function FileSlicer(file) {

	this.SLICE_SIZE = 512 * 1024;
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