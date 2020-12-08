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

function PCSCHAIRsendPaperData(title, authors, paperId) {
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

		var paperId = $.urlParam("paperNumber").parseInt();
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

		if (!pcsVenueInfo || pcsVenueInfo.paper_pcs_id != paperId ) {
			chrome.runtime.sendMessage({type: "update", sendData: sendData }, function() {
			    // active paper data updated
			});
		}
		
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
	else if (window.location.host == "new.precisionconference.com" && window.location.pathname.match(/chair\d*\/subs/) != null) {
		var paperId = window.location.pathname.match(/\/(\d+)$/)[1];
		var title = $("span.h1SubTitle").text();
		var authors = "";
		
		var authorRows = $("ul.authorList > li");
		for(var i = 0; i < authorRows.length; i++) {
			if (i > 0) authors += "\n";
			
			var name = $($(authorRows[i]).children("span")[0]).text();
			var affiliation = $($(authorRows[i]).children("span")[1]).text();
			authors += name + " - " + affiliation;
		}
		
		// Only send paper data if we got everything that we need (e.g., not if on an error page)
		if (title != null && title != "" && authors != "") {
			// alert("PCS2 ID: " + paperId + "\nTitle: " + title + "\n" + authors);

			chrome.runtime.sendMessage({type: "check-auto-update-state"}, function(data) {
				if (data.updating) {
					// Send the update automatically
					PCSCHAIRsendPaperData(title, authors, paperId)
				} else {
					// Create a button to send the update
					var buttonDiv = $(document.createElement("div")).html(
						'<span>pcschair.org Buttons: </span>' +
						'<button id="PCSCHAIRmakeactive">Make This Paper Active</button> ' +
						'<button id="PCSCHAIRclearactive">Clear Active Paper</button>');
					$("main").prepend(buttonDiv);

					$("#PCSCHAIRmakeactive").click(function(e) {
						PCSCHAIRsendPaperData(title, authors, paperId);
					});

					$("#PCSCHAIRclearactive").click(function(e) {
						PCSCHAIRclearActivePaper(false);
					});
				}
			})
		}
	}
	else if (window.location.host == "new.precisionconference.com" && window.location.pathname.match(/submissions$/) != null) {
		// on submissions page
		var waitForTable = function() {
			var dataRows = $('tbody tr');
			if (dataRows.length > 0 && $('tbody').prop('offsetParent') != null) {
				var dataHeaders = $('thead th');
				var idIndex = -1;
				for (let idx = 0; idx < dataHeaders.length; idx++) {
					if ($(dataHeaders[idx]).text() == "ID") {
						idIndex = idx;
						break;
					}
				}
				
				if (idIndex >= 0) {
					// ready to add buttons
					var buttonsAdded = 0;
				
					dataRows.each(function(index, row) {
						var paperId = parseInt(row.children[idIndex].textContent);
						if (!isNaN(paperId)) {
							buttonsAdded ++;
							$(row).prepend($(document.createElement('td')).
								addClass('dt-left').
								html('<button id="add' + paperId + '">Add</button>'))
							$("#add" + paperId).click(function(e) {
								chrome.runtime.sendMessage({type: "add-paper-to-queue", paperId: paperId}, function(data) {
									// paper should be added
								})
							});
						}
					})

					if (buttonsAdded > 0) {
						$('thead tr').prepend($(document.createElement('th')).addClass('dt-left').text('pcschair'));
						
						// register a mutation observer to ensure the header is re-added if columns are reconfigured
						const config = { childList: true, subtree: true };
						const headNode = $('thead')[0];
						const callback = function(mutationsList, observer) {
							observer.disconnect();
							$('thead tr').prepend($(document.createElement('th')).addClass('dt-left').text('pcschair'));
							observer.observe(headNode, config);
						}
						const observer = new MutationObserver(callback);
						observer.observe(headNode, config);
					}
				}
			} else {
				setTimeout(waitForTable, 1000);
			}
		}

		setTimeout(waitForTable, 1000);
	}
	else if ((window.location.host == "www.pcschair.org" || (window.location.host.indexOf("localhost") == 0)) && window.location.pathname.indexOf("admin") > 0) {

		$("#link-status").text("Installed");
		$("#setExtensionIdButton").removeClass("invisible");
		$("#setExtensionIdButton").click(function(event) {
			var venueMatch = window.location.pathname.match(/venues\/([^\/]+)\//);
			if (venueMatch) {
				var venueID = venueMatch[1];
				chrome.runtime.sendMessage({type: "link-extension", 
				                            hostname: window.location.host,
				                            "venueID" : venueID}, function(data) {
					// TODO(JWN): could handle this better
					window.location.reload();
				})
			}
		});

		$("#autoUpdatePapers").change(function(e) {
			chrome.runtime.sendMessage({type: "set-auto-update-state", updating: $("#autoUpdatePapers").prop('checked')}, function() {
			    // auto-update updated
			});
		})

		chrome.runtime.sendMessage({type: "check-auto-update-state"}, function(data) {
			$("#autoUpdatePapers").prop('checked', data.updating);
		})

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

				// Only needed to support original PCS
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
