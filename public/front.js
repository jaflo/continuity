var hasSeenNewest = true,
	historyManipulated = false,
	currentID = location.pathname.length > 4 ? location.pathname.replace("/story/", "") : "00000",
	tofocus = $(".getfocus"), count = 0,
	origboxheight = $("#next textarea").innerHeight();

while (tofocus.val() && count < 10) {
	tofocus = tofocus.nextAll("input, select, textarea").first();
	count++; // just in case
}
tofocus.focus();

$(document).ajaxError(function(e, jqXHR) {
	console.log(jqXHR);
	if (jqXHR.status == 0) message("Check your internet connection.", "Unable to connect");
});

$("#login, #signup").submit(function() {
	var list = $("<ul>"), missing = 0;
	$(this).children("input").each(function() {
		if (!$(this).val()) {
			list.append($("<li>").text($("label[for="+$(this).attr("name")+"]").text().toLowerCase()));
			missing++;
		}
	});
	if (missing) {
		message($("<div>").text("You did not enter anything for").append(list), "Missing information");
		return false;
	}
});

$("#next textarea").on("change keyup keydown keypress", function() {
	$("#next").toggleClass("hastext", $(this).val().length > 0);
	$("main").append($("<div id=tester class=inputlike>").text($(this).val()));
	var determinedheight = $("#tester").innerHeight() + 30;
	$("#next textarea").height(determinedheight > origboxheight ? determinedheight : "");
	$("#tester").remove();
});

$("#next").submit(function(e) {
	if ($("#next textarea").val().length > 0) {
		$.post("/create", $("#next").serialize(), function(data) {
			$("#next textarea, #next button").removeAttr("disabled");
			if (data.status == "failed") {
				message(data.message, "Failed to create");
			} else {
				$("#next textarea").val("");
				renderPiece(data.data);
			}
		}, "json");
		$("#next textarea, #next button").attr("disabled", "disabled");
	} else {
		$.get("/next", {
			parent: currentID
		}, function(data) {
			if (data.status == "failed") {
				message(data.message, "Failed to load");
			} else {
				renderPiece(data.data);
			}
		}, "json");
	}
	e.preventDefault();
});

$(window).scroll(function() {
	var win = $(window);
	if (!hasSeenNewest && win.scrollTop() + win.height() > $("#editor").offset().top + 60) hasSeenNewest = true;
}).on("popstate", function(e) {
	// I'm too lazy to clean up, just refresh
	window.location.reload();
});

function attachEventHandlers(elements) {
	$(elements).not(".master").each(function() {
		var element = $(this),
			id = element.attr("id").replace("piece", "");
		element.find(".star").click(function() {
			var myself = $(this);
			$.post(myself.attr("href"), {
				id: id
			}, function(data) {
				if (data.status == "failed") {
					message(data.message, "Failed to star");
				} else {
					myself.find("i").text(data.data.starred ? "🌟" : "⭐");
					myself.find("span").text(data.data.starred ? "unstar" : "star");
					myself.attr("href", data.data.starred ? "/unstar" : "/star");
				}
			}, "json");
			return false;
		});
		element.find(".rewind").click(function() {
			if (historyManipulated) window.location.replace("/story/"+id);
			else window.location = "/story/"+id;
			return false;
		});
		element.find(".options a").focus(function() {
			element.addClass("hover");
		}).blur(function() {
			element.removeClass("hover");
		});
	});
}

attachEventHandlers("#story .piece");

function renderPiece(piece) {
	var snippet = $(".master.piece").clone();
	snippet.removeClass("master").addClass("hidden").attr("id", "piece"+piece.shortID);
	snippet.find(".author").attr("href", "/user/"+piece.author.id).find("i").text(piece.author.emoji);
	snippet.find(".author").find("span").text("by "+piece.author.display);
	var staraction = piece.starred ? "unstar" : "star";
	snippet.find(".star").attr("href", "/"+staraction).find("span").text(staraction);
	snippet.find(".rewind").attr("href", "/story/"+piece.id);
	snippet.find(".content").text(piece.content);
	var storyHeight = $("#story").outerHeight();
	attachEventHandlers(snippet);
	$("#story").append(snippet);
	var newStoryHeight = $("#story").outerHeight(),
		newSnippet = $("#story .piece").last();
	$("#story").height(storyHeight).outerHeight();
	$("#story").height(newStoryHeight);
	$("html, body").stop().animate({
		scrollTop: newSnippet.offset().top-200
	}, 300, "swing");
	updateAddress(piece.shortID);
	setTimeout(function() {
		newSnippet.removeClass("hidden");
		$("#story").height("auto");
	}, 300);
	return false;
}

function updateAddress(id) {
	currentID = id;
	$("#next input[name=parent]").val(id);
	if (historyManipulated) {
		history.replaceState({}, id, "/story/"+id);
	} else {
		historyManipulated = true;
		history.pushState({}, id, "/story/"+id);
	}
}

function message(msg, title) {
	var hadFocus = $(":focus");
	$("#message .contents").html(msg);
	$("#message .header span").text(title || "Heyo!");
	$("#message .box").removeClass("enter exit");
	$("#message").fadeIn(100);
	$("#message .box").addClass("enter");
	$("#message button").focus();
	$("#message .close").click(function() {
		$("#message .box").on("webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend", function() {
			$("#message .box").off();
			$("#message").fadeOut(100);
		}).addClass("exit");
		hadFocus.focus();
	});
}

if ($("#emojipicker").length > 0) {
	$("#emoji").attr("type", "hidden");
	$("#emojipicker").show();
	$.getJSON("/lib/emojimap.json", function(emojimap) {
		delete emojimap["information"];
		var emojis = Object.keys(emojimap),
			chosen = $("#emoji").val() ? "" : emojis[emojis.length*Math.random() << 0],
			resultcontainer = $("#emojipicker .results").removeClass("loading").empty(),
			prevquery = "", prevemoji = $("#emoji").val();
		for (var key in emojimap) {
			var item = $("<div>").text(emojimap[key]);
			item = $("<div>").append(item).attr("title", key.replace(/_/g, " ")).click(function(e) {
				$("#emojipicker .results > div").removeClass("selected");
				$(this).addClass("selected");
				$("#emoji").val($(this).text());
				$("#emojipicker .preview").text($(this).text());
				if (!e.isTrigger) $("#emojisearch").val($(this).attr("title"));
			});
			resultcontainer.append(item);
			if (key == chosen || emojimap[key] == prevemoji) {
				item.click();
				resultcontainer.scrollTop(9999999);
				$("#emojisearch").val(key.replace(/_/g, " "));
			}
		}
		prevquery = chosen.replace(/_/g, " ");
		if (resultcontainer.scrollTop() > 50) resultcontainer.scrollTop(resultcontainer.scrollTop()+resultcontainer.outerHeight()/2);
		$("#emojisearch").on("change keyup keydown keypress", function() {
			var query = $(this).val();
			if (query != prevquery) {
				if (query.length > 0) {
					$("#emojipicker .results > div").hide().each(function() {
						var myself = $(this);
						if ((myself.text()+myself.attr("title")).indexOf(query) > -1) {
							myself.show();
						}
					});
				} else {
					$("#emojipicker .results > div").show();
				}
				prevquery = query;
			}
		}).focus(function() {
			$(this).parents(".inputlike").addClass("focus");
		}).blur(function() {
			$(this).parents(".inputlike").removeClass("focus");
		});
	});
}
