var video = document.getElementById('v');
// Create the media source
var mimeCodec = 'video/mp4; codecs="avc1.640028"';
var mediaSource;

$(document).ready(function() {

	// Check for the various File API support.
	if (window.File && window.Blob) {

		$(document).on('change', '.btn-file :file', function(event) {
			var file = event.target.files[0];
			$('h2.video-title').html(file.name);
			if ('MediaSource' in window && MediaSource.isTypeSupported(mimeCodec)) {
				mediaSource = new MediaSource;
				console.log(mediaSource.readyState); // closed
				video.src = URL.createObjectURL(mediaSource);
				mediaSource.addEventListener('sourceopen', onSourceOpen);
			} else {
				console.error('Unsupported MIME type or codec: ', mimeCodec);
			}
		});

	} else {
		alert('The File APIs are not fully supported in this browser.');
	}
});

function onSourceOpen(_) {
	console.log(this.readyState); // open
	var file = $('.btn-file :file').prop('files')[0];
	if (!file) {
		return;
	}
	var slicer = new FileSlicer(file);
	
	if (mediaSource.sourceBuffers.length > 0) {
		console.log('mediaSource.sourceBuffers.length > 0');
		return;
	}

	var sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
	
	//video.addEventListener('progress', appendNextMediaSegment);
	sourceBuffer.addEventListener('updateend', appendNextMediaSegment);
	
	appendInitSegment();
	//appendNextMediaSegment();
	video.play();
	
	function appendInitSegment() {
		var init = $('.btn-init :file').prop('files')[0];
		var initReader = new FileReader();
		initReader.onload = function() {
			mediaSource.sourceBuffers[0].appendBuffer(this.result);
		};
		initReader.readAsArrayBuffer(init);
	}

	function appendNextMediaSegment() {
		console.log("appending");
		var fileReader = new FileReader();
		fileReader.onload = function() {
			mediaSource.sourceBuffers[0].appendBuffer(this.result);
		};
		if (mediaSource.readyState == "closed") {
			console.log('mediaSource.readyState == closed');
			return;
		}

		// If we have run out of stream data, then signal end of stream.
		if (!slicer.hasNext()) {
			return;
		}

		// Make sure the previous append is not still pending.
		if (mediaSource.sourceBuffers[0].updating) {
			console.log('mediaSource.sourceBuffers[0].updating');
			return;
		}

		fileReader.readAsArrayBuffer(slicer.next());
	}
}

function FileSlicer(file) {

	this.SLICE_SIZE = 1024*1024;
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