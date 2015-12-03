var socket = new WebSocket("ws://localhost:8888", "init");

$(document).ready(function() {
	
	// Check for the various File API support.
	if (window.File && window.Blob) {
		
		$(document).on('change', '.btn-file :file', function(event) {
			var file = event.target.files[0];
			$('h2.video-title').html(file.name);
		    $('div.video-wrapper').html(buildVideo(file));
		});
		
		$(document).on('click', '.btn-upload', function(event) {
			var file = $('.btn-file :file').prop('files')[0];
		    socket.send(file.slice(0, 10*1024*1024));
		});
		
	} else {
	  alert('The File APIs are not fully supported in this browser.');
	}
});

function buildVideo(file) {
	var video = $('<video />', {
	    id: 'video',
	    width: "600",
	    height: "400",
	    src: URL.createObjectURL(file),
	    type: 'video/mp4',
	    controls: true
	});
	return video;
}

