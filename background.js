var STATE = {
	TIMER_VALUE: 5,
	EXTENSION_LINKED: false,
	PCS_ASSIST_SERVER_HOST: "http://www.pcschair.org",
	PCS_VENUE_ID: "1",
	PCS_SUB_COMMITTEE_FLAG: false,
	PCS2_FLAG: true,
	PCS2_VENUE_NAME: "eics_pacmb",

	PCS_USER_REF: null
};

loadState();

function loadState() {
	chrome.storage.local.get(['extensionData'], function(result) {
		if (result.extensionData != undefined) {
			STATE = result.extensionData;
		}
	});
}

function saveState() {
	chrome.storage.local.set({extensionData: STATE});
}

function updateVenueWithData(sendData, callback) {
	if (STATE.EXTENSION_LINKED) {
		if (sendData.timer != null) {
			var newTime = new Date((new Date()).getTime() + STATE.TIMER_VALUE*60*1000);
			sendData.timer = newTime.toUTCString();
		}

		sendData = {venue: sendData};
		$.ajax({
		           type: "PUT",
		           url: "http://" + STATE.PCS_ASSIST_SERVER_HOST + "/venues/" + STATE.PCS_VENUE_ID + ".json",
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
		STATE.TIMER_VALUE = message.timerValue;
		saveState();
	}
	else if (message.type == "set-pcs-user-ref") {
		STATE.PCS_USER_REF = message.pcsUserRef;
		saveState();
	}
	else if (message.type == "link-extension") {
		STATE.PCS_ASSIST_SERVER_HOST = message.hostname;
		STATE.PCS_VENUE_ID = message.venueID;
		STATE.EXTENSION_LINKED = message.hostname != null && message.hostname != "" && message.venueID != null && message.venueID != "";

		if (STATE.EXTENSION_LINKED) {
			$.ajax({
			        type: "GET",
			        url: "http://" + STATE.PCS_ASSIST_SERVER_HOST + "/venues/" + STATE.PCS_VENUE_ID + ".json",
			        dataType: "json",
					error: function() { 
						STATE.EXTENSION_LINKED = false;
						callback({linked: STATE.EXTENSION_LINKED}); 
					},
					success: function(data) {
						STATE.PCS2_FLAG = data.pcs2_flag;
						STATE.PCS2_VENUE_NAME = data.pcs2_venue_name;
						STATE.PCS_SUB_COMMITTEE_FLAG = data.sub_committee;
						saveState();

						callback({linked: STATE.EXTENSION_LINKED});
					}
			});
		}
	}
	else if (message.type == "check-link-status") {
		if (STATE.EXTENSION_LINKED == undefined)
			STATE.EXTENSION_LINKED = false;
		callback({linked: STATE.EXTENSION_LINKED});
	}
	else if (message.type == "open-pcs-page") {
		if (STATE.EXTENSION_LINKED) {
			if (STATE.PCS2_FLAG) {
				chrome.tabs.query({url: 'https://new.precisionconference.com/*'}, function(results) {
					if (results.length > 0) {
						chrome.tabs.create({'windowId': results[0].windowId, 'index': results[0].index+1, 'url': "https://new.precisionconference.com/" + STATE.PCS2_VENUE_NAME + "/chair/subs/" + message.paperId});
					} else {
						chrome.tabs.create({'url': "https://new.precisionconference.com/" + STATE.PCS2_VENUE_NAME + "/chair/subs/" + message.paperId});
					}
				});
			}
			else if (STATE.PCS_USER_REF != null) {
				chrome.tabs.query({url: 'https://confs.precisionconference.com/*'}, function(results) {
					if (results.length > 0) {
						chrome.tabs.create({'windowId': results[0].windowId, 'index': results[0].index+1, 'url': "https://confs.precisionconference.com/~chi18a/adminOnePaper?userRef=" + STATE.PCS_USER_REF + "&paperNumber=" + message.paperId + "&noHomeButton=true&noLogoutButton=true&closeWindowButton=true&anonView=true"});
					} else {
						chrome.tabs.create({'url': "https://confs.precisionconference.com/~chi18a/adminOnePaper?userRef=" + STATE.PCS_USER_REF + "&paperNumber=" + message.paperId + "&noHomeButton=true&noLogoutButton=true&closeWindowButton=true&anonView=true"});
					}
				});
			}
		}
	}
});
