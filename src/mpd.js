function Mpd(received) {
	this.audioType = null;
	this.videoType = null;

	// Remove command
	var mpdStr = received.substring(received.indexOf("\t") + 1);
	// Parse xml
	var mpd = (new DOMParser()).parseFromString(mpdStr, "text/xml");

	var tracks = mpd.getElementsByTagName("AdaptationSet");
	var mimeType;
	var rep;
	for (var i = 0; i < tracks.length; i++) {
		mimeType = tracks[i].getAttribute("mimeType");
		switch (mimeType) {
		case "audio/mp4":
			rep = tracks[i].getElementsByTagName("Representation")[0];
			var audioCodec = rep.getAttribute("codecs");
			if (audioCodec) {
				this.audioType = mimeType + "; codecs=\"" + audioCodec + "\"";
			}
			break;
		case "video/mp4":
			rep = tracks[i].getElementsByTagName("Representation")[0];
			var videoCodec = rep.getAttribute("codecs");
			if (videoCodec) {
				this.videoType = mimeType + "; codecs=\"" + videoCodec + "\"";
			}
			break;
		}
	}
}