var TIMER_VALUE = 5;

var EXTENSION_LINKED = false;
var PCS_ASSIST_SERVER_HOST = "http://www.pcschair.org";
var PCS_VENUE_ID = 1;
var PCS2_FLAG = true;
var PCS2_VENUE_NAME = "eics_pacmb";

var PCS_USER_REF = null;

function updateVenueWithData(sendData, callback) {
	if (EXTENSION_LINKED) {
		if (sendData.timer != null) {
			var newTime = new Date((new Date()).getTime() + TIMER_VALUE*60*1000);
			sendData.timer = newTime.toUTCString();
		}

		sendData = {venue: sendData};
		$.ajax({
		           type: "PUT",
		           url: "http://" + PCS_ASSIST_SERVER_HOST + "/venues/" + PCS_VENUE_ID + ".json",
		           dataType: "json",
		           success: callback,
		           data: sendData
		       });
	}
}

chrome.runtime.onMessage.addListener(function(message, sender, callback) {
	if (message.type == "update") {
		updateVenueWithData(message.sendData,callback);
	}
	else if (message.type == "timer") {
		TIMER_VALUE = message.timerValue;
	}
	else if (message.type == "set-pcs-user-ref") {
		PCS_USER_REF = message.pcsUserRef;
	}
	else if (message.type == "link-extension") {
		PCS_ASSIST_SERVER_HOST = message.hostname;
		PCS_VENUE_ID = message.venueID;
		PCS2_FLAG = message.pcs2Flag;
		PCS2_VENUE_NAME = message.pcs2VenueName;
		EXTENSION_LINKED = message.hostname != null && message.hostname != "" && message.venueID != null && message.venueID != "";
		
		callback({linked: EXTENSION_LINKED});
	}
	else if (message.type == "check-link-status") {
		callback({linked: EXTENSION_LINKED});
	}
	else if (message.type == "open-pcs-page") {
		if (EXTENSION_LINKED) {
			if (PCS2_FLAG) {
				chrome.tabs.query({url: 'https://new.precisionconference.com/*'}, function(results) {
					if (results.length > 0) {
						chrome.tabs.create({'windowId': results[0].windowId, 'index': results[0].index+1, 'url': "https://new.precisionconference.com/" + PCS2_VENUE_NAME + "/chair/subs/" + message.paperId});
					} else {
						chrome.tabs.create({'url': "https://new.precisionconference.com/" + PCS2_VENUE_NAME + "/chair/subs/" + message.paperId});
					}
				});
			}
			else if (PCS_USER_REF != null) {
				chrome.tabs.query({url: 'https://confs.precisionconference.com/*'}, function(results) {
					if (results.length > 0) {
						chrome.tabs.create({'windowId': results[0].windowId, 'index': results[0].index+1, 'url': "https://confs.precisionconference.com/~chi18a/adminOnePaper?userRef=" + PCS_USER_REF + "&paperNumber=" + message.paperId + "&noHomeButton=true&noLogoutButton=true&closeWindowButton=true&anonView=true"});
					} else {
						chrome.tabs.create({'url': "https://confs.precisionconference.com/~chi18a/adminOnePaper?userRef=" + PCS_USER_REF + "&paperNumber=" + message.paperId + "&noHomeButton=true&noLogoutButton=true&closeWindowButton=true&anonView=true"});
					}
				});
			}
		}
	}
});
