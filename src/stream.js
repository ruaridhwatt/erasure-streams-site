var entryPoint = 'ws://localhost:8888';
var socket;
var intention = 'lst';

//wsConnect(entrypoint);
// Test---------------------------------
var streams = ['video-list', 'film1', 'film2', 'film3'];
var list = '';
for (var i = 1; i < streams.length; i++) {
	list += '<li><a href="#">' + streams[i] + '</a></li>';
}
$('.streams').html(list);
$('.streams a').on('click', function(event) {
	console.log($(this).text());
});
//------------------------------------------

function wsConnect(url) {
	console.log('Opening Websocket to ' + url + '...');
	socket = new WebSocket(entryPoint, 'info');

	socket.onopen = function(openEvent) {
		console.log('Opened!');
		if (intention) {
			socket.send(intention);
		}
	};

	socket.onmessage = function(messageEvent) {
		var received = messageEvent.data;
		console.log(received);
		handleCommand(received);
	};

	socket.onerror = function(errorEvent) {
		console.log('Error in connection to ' + url);
		console.log(errorEvent);
	};
}

$(window).on('beforeunload', function() {
	socket.close();
});

function handleCommand(received) {
	var c = received.split('\t');
	switch (c[0]) {
	case ('video-list'):
		intention = null;
		createStreamList(c);
		break;
	case ("mpd-file"):
		intention = null;
		parseMpd(c);
		break;
	case ("swith-server"):
		socket.close();
		wsConnect(c[1]);
		break;
	default:
		console.log('unknown command: ' + c[0]);
		break;
	}
}

function creatStreamList(streams) {
	var list = '';
	for (var i = 1; i < streams.length; i++) {
		list += '<li><a href="#">' + streams[i] + '</a></li>';
	}
	$('.streams').html(list);
	$('.streams: a').on('click', function(event) {
		console.log(event + 'clicked');
	});
}

function streamChosen(event) {

}

function parceMpd(mpd) {

}