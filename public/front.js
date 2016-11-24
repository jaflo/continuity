$(document).ready(function() {
	var hasSeenNewest = true,
		historyManipulated = false,
		currentID = location.pathname.length > 4 ? location.pathname.replace("/story/", "") : "00000",
		tofocus = $(".getfocus"), count = 0,
		actionform = $("#next"), writestoryarea = actionform.find("textarea"),
		origboxheight = writestoryarea.innerHeight(),
		valuechange = "change keyup keydown keypress";

	while (tofocus.val() && count < 10) {
		tofocus = tofocus.nextAll("input, select, textarea").first();
		count++; // just in case
	}
	tofocus.focus();

	$("time").timeago();

	$(document).ajaxError(function(e, jqXHR) {
		console.log(jqXHR);
		if (jqXHR.status == 0) message("Check your internet connection.", "Unable to connect");
	});

	$("#login, #signup").submit(function(e) {
		if ($(this).find("button").attr("disabled")) {
			e.preventDefault();
		} else {
			var list = $("<ul>"), missing = 0;
			$(this).children("input").each(function() {
				if (!$(this).val()) {
					list.append($("<li>").text($("label[for="+$(this).attr("name")+"]").text().toLowerCase()));
					missing++;
				}
			});
			if (missing) {
				message($("<div>").text("You did not enter anything for").append(list), "Missing information");
				e.preventDefault();
			} else {
				$(this).find("button").attr("disabled", "disabled");
			}
		}
	});

	writestoryarea.on(valuechange, function() {
		actionform.toggleClass("hastext", $(this).val().length > 0);
		$("main").append($("<div id=tester class=inputlike>").text($(this).val()));
		var determinedheight = $("#tester").innerHeight() + 30;
		writestoryarea.height(determinedheight > origboxheight ? determinedheight : "");
		$("#tester").remove();
	});

	actionform.submit(function(e) {
		if (!$(this).find("button").attr("disabled")) {
			if (writestoryarea.val().length > 0) {
				$.post("/create", $("#next").serialize(), function(data) {
					actionform.find("textarea, button").removeAttr("disabled");
					if (data.status == "failed") {
						message(data.message, "Failed to create");
					} else {
						writestoryarea.val("");
						renderPiece(data.data);
					}
				}, "json").fail(function() {
					actionform.find("textarea, button").removeAttr("disabled");
				});
				actionform.find("button").attr("disabled", "disabled");
			} else {
				$.get("/next", {
					parent: currentID
				}, function(data) {
					actionform.find("textarea, button").removeAttr("disabled");
					if (data.status == "failed") {
						message(data.message, "Failed to load");
					} else {
						renderPiece(data.data);
					}
				}, "json").fail(function() {
					actionform.find("textarea, button").removeAttr("disabled");
				});
				actionform.find("button").attr("disabled", "disabled");
			}
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
		actionform.find("input[name=parent]").val(id);
		if (historyManipulated) {
			history.replaceState({}, id, "/story/"+id);
		} else {
			historyManipulated = true;
			history.pushState({}, id, "/story/"+id);
		}
	}

	function message(msg, title) {
		var hadFocus = $(":focus"), container = $("#message");
		container.find(".contents").html(msg);
		container.find(".header span").text(title || "Heyo!");
		container.find(".box").removeClass("enter exit");
		container.fadeIn(100);
		container.find(".box").addClass("enter");
		container.find("button").focus();
		container.find(".close").click(function() {
			container.find(".box").on("webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend", function() {
				container.find(".box").off();
				container.fadeOut(100);
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
			$("#emojisearch").on(valuechange, function() {
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
});
