var AUTOSET_TIMER_FLAG = true;
var AUTOSET_TIMER_INTERVAL = 5;

var PCS_USER_REF = null;

$.urlParam = function(name){
	var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
	return results[1] || 0;
}

function PCSCHAIRclearActivePaper(closeFlag) {
	var sendData = {
		"paper_title" : "",
	    "paper_authors" : "",
		"active_paper" : false
	}

	if (AUTOSET_TIMER_FLAG) {
		sendData.timer = null;
	}

	chrome.runtime.sendMessage({type: "update", sendData: sendData }, function() {
		if (closeFlag) window.close();
	});	
}

$(function() {
	if (window.location.host == "confs.precisionconference.com") {
		chrome.runtime.sendMessage({type: "set-pcs2-info", pcs2Flag: false }, function() {
			// pcs2 flag updated
		});
		var pcsUserRef = $.urlParam("userRef");
		if (pcsUserRef != null) {
			chrome.runtime.sendMessage({type: "set-pcs-user-ref", pcsUserRef: pcsUserRef }, function() {
			    // pcs user ref updated
			});
		}
	}
	
	if (window.location.pathname.indexOf("adminOnePaper") >= 0) {

		var paperId = $.urlParam("paperNumber");
		var title = $("h1 font").text();
		var authors = "";
		
		var authorRows = $("h3 font table tbody tr");
		for(var i = 0; i < authorRows.length; i++) {
			if (i > 0) authors += "\n";
			
			var name = $($(authorRows[i]).children("td")[0]).text();
			var affiliation = $($(authorRows[i]).children("td")[2]).text();
			authors += name + " - " + affiliation;
		}
		
		// alert("ID: " + paperId + "\nTitle: " + title + "\n" + authors);
		var sendData = {
			"paper_title" : title,
		    "paper_authors" : authors,
		    "paper_pcs_id" : paperId,
			"active_paper" : true
		}

		if (AUTOSET_TIMER_FLAG) {
			var newTime = new Date((new Date()).getTime() + AUTOSET_TIMER_INTERVAL*60*1000);
			sendData.timer = newTime.toUTCString();
		}
		
		chrome.runtime.sendMessage({type: "update", sendData: sendData }, function() {
		    // active paper data updated
		});
		
		/*
		 * Removing automatic unload
		
		$($("a.rollover")[0])
			.attr("href",'')
			.click(function() { PCSCHAIRclearActivePaper(true); });
			
		$(window).on("beforeunload",function() {
			PCSCHAIRclearActivePaper(false);
		})
		*/		
	}
	else if (window.location.host == "new.precisionconference.com" && window.location.pathname.match(/chair\d*\/sub/) != null) {
		var paperId = window.location.pathname.match(/\/(\d+)$/)[1];
		var title = $("span.h1SubTitle").text();
		var authors = "";
		
		var authorRows = $("table.authorList > tbody > tr");
		for(var i = 0; i < authorRows.length; i++) {
			if (i > 0) authors += "\n";
			
			var name = $($(authorRows[i]).children("td")[0]).text();
			var affiliation = $($(authorRows[i]).children("td")[1]).text();
			authors += name + " - " + affiliation;
		}
		
		// alert("PCS2 ID: " + paperId + "\nTitle: " + title + "\n" + authors);
		var sendData = {
			"paper_title" : title,
		    "paper_authors" : authors,
		    "paper_pcs_id" : paperId,
			"active_paper" : true
		}

		if (AUTOSET_TIMER_FLAG) {
			var newTime = new Date((new Date()).getTime() + AUTOSET_TIMER_INTERVAL*60*1000);
			sendData.timer = newTime.toUTCString();
		}
		
		chrome.runtime.sendMessage({type: "update", sendData: sendData }, function() {
		    // active paper data updated
		});
		
		/*
		 * Removing automatic unload
		
		$($("a.rollover")[0])
			.attr("href",'')
			.click(function() { PCSCHAIRclearActivePaper(true); });
			
		$(window).on("beforeunload",function() {
			PCSCHAIRclearActivePaper(false);
		})
		*/		
	}
	else if ((window.location.host == "www.pcschair.org" || (window.location.host.indexOf("localhost") == 0)) && window.location.pathname.indexOf("admin") > 0) {

		$("#link-status").text("Installed");
		$("#setExtensionIdButton").removeClass("invisible");
		$("#setExtensionIdButton").click(function(event) {
			var venueMatch = window.location.pathname.match(/venues\/(\d+)\//);
			if (venueMatch) {
				var venueID = parseInt(venueMatch[1]);
				var pcs2Flag = $("#pcs2flag").text() == "true";
				var pcs2VenueName = $("#pcs2venueName").text();
				chrome.runtime.sendMessage({type: "link-extension", 
				                            hostname: window.location.host,
				                            "venueID" : venueID,
				                            "pcs2Flag": pcs2Flag, 
				                            "pcs2VenueName": pcs2VenueName}, function(data) {
					// could handle this better
					window.location.reload();
				})
			}
		});

		chrome.runtime.sendMessage({type: "check-link-status"}, function(data) {
			if (data.linked) {
				$("#link-status").text("Linked");
				
				var updateFunc = function() {
					var increment = parseInt($("#timerNum").val());
					if (Number.isInteger(increment)) {
						chrome.runtime.sendMessage({type: "timer", timerValue: increment}, function() {
							// timer value updated
						})
					}
				}

				$("#timerNum").change(updateFunc);
				updateFunc();

				$("#paper-queue").click(function(event) {
					if ($(event.target).hasClass("paperLink")) {
						var paperId = $(event.target).text();
						chrome.runtime.sendMessage({type: "open-pcs-page", paperId: paperId}, function(response) {
						    // hopefully the page opened
						});
					}
				})
			}
		})
	}
})
