var socket;

$(window).on('beforeunload', function(){
    socket.close();
});

$(document).ready(function() {

	// Check for the various File API support.
	if (window.File && window.Blob) {

		socket = new WebSocket("ws://localhost:8888", "init");

		$(document).on('change', '.btn-file :file', function(event) {
			var file = event.target.files[0];
			$('h2.video-title').html(file.name);
			$('div.video-wrapper').html(buildVideo(file));
		});

		$(document).on('click', '.btn-upload', function(event) {
			$('.prog-upload').prop('style', "width: 0%");
			$('.prog-upload').prop('aria-valuenow', "0");
			$('.prog-upload').html("0%");
			$('.progress').show("slow");
			var file = $('.btn-file :file').prop('files')[0];
			var slicer = new FileSlicer(file);
			while (slicer.hasNext()) {
				socket.send(slicer.next());
			}
			var progressInterval = setInterval(function(total) {

				if (socket.bufferedAmount == 0) {
					clearInterval(progressInterval);
					$('.progress').hide("slow");
				} else {
					var progress = Math.round(((total - socket.bufferedAmount) / total) * 100);
					var progStr = progress + "%";
					console.log(progStr);
					$('.prog-upload').prop('style', "width: " + progStr);
					$('.prog-upload').prop('aria-valuenow', progress.toString());
					$('.prog-upload').html(progStr);
				}
			}, 200, file.size);
		});

	} else {
		alert('The File APIs are not fully supported in this browser.');
	}
});

function buildVideo(file) {
	var video = $('<video />', {
		id : 'video',
		width : "600",
		height : "400",
		src : URL.createObjectURL(file),
		type : 'video/mp4',
		controls : true
	});
	return video;
}

function FileSlicer(file) {

	this.SLICE_SIZE = 10*1024*1024;
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