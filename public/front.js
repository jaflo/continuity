$(document).ready(function() {
	var hasSeenNewest = true,
		historyManipulated = false,
		currentID = location.pathname.length > 4 ? location.pathname.replace("/story/", "") : "00000",
		tofocus = $(".getfocus"), count = 0, writesaver, storyarea = $("#story"),
		actionform = $("#next"), writestoryarea = actionform.find("textarea"),
		origboxheight = writestoryarea.innerHeight(), prevText = "",
		valuechange = "change keyup keydown keypress",
		transitionend = "webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend",
		localstore = $("#user").hasClass("loggedout") && typeof(Storage) !== "undefined", bubbleDragDlick = false,
		radialmenu = $("#radial"), radialopen = new Date(), radialclose;

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

	writestoryarea.on(valuechange, function(e) {
		var nowText = $(this).val();
		if (prevText != nowText) {
			actionform.toggleClass("hastext", nowText.length > 0);
			var button = actionform.find("button");
			if (nowText.length > 0 && nowText.length < 200) {
				button.attr("disabled", "disabled").find(".write").text("your continuation is "+(200-nowText.length)+" characters too short");
			} else if (nowText.length > 2000) {
				button.attr("disabled", "disabled").find(".write").text("your continuation is "+(nowText.length-2000)+" characters too long");
			} else {
				button.removeAttr("disabled").find(".write").text("submit your continuation");
			}
			$("main").append($("<div id=tester class=inputlike>").text(nowText));
			var determinedheight = $("#tester").innerHeight() + 30;
			writestoryarea.height(determinedheight > origboxheight ? determinedheight : "");
			$("#tester").remove();
			if (!e.isTrigger) {
				clearTimeout(writesaver);
				$("#next .status").text("waiting");
				writesaver = setTimeout(function() {
					if (nowText == "") {
						$("#next .status").text("clearing...");
						if (localstore) {
							localStorage.removeItem("save_"+currentID);
							$("#next .status").text("cleared");
						} else {
							$.post("/savefragment", $("#next").serialize(), function(data) {
								if (data.status == "failed") {
									$("#next .status").text("failed");
									message(data.message, "Clear failed");
								} else {
									$("#next .status").text("cleared");
								}
							}, "json").fail(function() {
								$("#next .status").text("failed");
							});
						}
					} else {
						$("#next .status").text("saving...");
						if (localstore) {
							localStorage.setItem("save_"+currentID, nowText);
							$("#next .status").text("saved");
						} else {
							$.post("/savefragment", $("#next").serialize(), function(data) {
								if (data.status == "failed") {
									$("#next .status").text("failed");
									message(data.message, "Save failed");
								} else {
									$("#next .status").text("saved");
								}
							}, "json").fail(function() {
								$("#next .status").text("failed");
							});
						}
					}
				}, 1000);
			}
		}
		prevText = nowText;
	});
	$("#next .status").text("restoring...");
	writestoryarea.val(writestoryarea.val() || localStorage.getItem("save_"+currentID)).change();
	$("#next .status").text("ready");

	actionform.submit(function(e) {
		if (!$(this).find("button").attr("disabled")) {
			if (writestoryarea.val().length > 0) {
				$.post("/create", $("#next").serialize(), function(data) {
					actionform.find("textarea, button").removeAttr("disabled");
					if (data.status == "failed") {
						message(data.message, "Failed to create");
					} else {
						writestoryarea.val("");
						if (localstore) localStorage.removeItem("save_"+currentID);
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
			element.click(function() {
				var previous = $("#story .highlighed.piece");
				if (!element.hasClass("highlighed")) {
					element.height("auto");
					var before = element.outerHeight();
					element.find(".more").show();
					var after = element.outerHeight();
					element.height(before);
					element.addClass("highlighed").height(after);
					element.unbind(transitionend).on(transitionend, function() {
						element.height("auto");
					});
					previous = previous.not("#"+element.attr("id"));
				}
				if (previous.length > 0) {
					previous.height("auto");
					var before = previous.outerHeight() - 2*parseFloat(previous.css("padding-top"));
					previous.removeClass("highlighed").find(".more").hide();
					var after = previous.outerHeight() - 2*parseFloat(previous.find(".more").css("padding-top"));
					previous.find(".more").show();
					previous.height(before);
					previous.removeClass("highlighed");
					previous.height(after);
					previous.unbind(transitionend).on(transitionend, function() {
						previous.height("auto");
						previous.find(".more").hide();
					});
				}
			});
			element.find("time").timeago();
			element.find(".rewind").click(function() {
				if (historyManipulated) window.location.replace("/story/"+id);
				else window.location = "/story/"+id;
				return false;
			});
			element.find(".star").click(function() {
				var myself = $(this);
				$.post(element.hasClass("starred") ? "/unstar" : "/star", {
					id: id
				}, function(data) {
					console.log(data);
					if (data.status == "failed") {
						message(data.message, "Failed to star");
					} else {
						myself.find("i").removeClass().addClass(data.data.starred ? "icon-star_border" : "icon-star");
						element.toggleClass("starred", data.data.starred);
						myself.find("span").text(data.message);
						myself.attr("title", data.data.starred ? "Unstar" : "Star");
					}
				}, "json");
				return false;
			});
		});
	}

	attachEventHandlers("#story .piece");

	function renderPiece(piece) {
		var snippet = $(".master.piece").clone();
		snippet.removeClass("master").addClass("hidden").attr("id", "piece"+piece.shortID);
		snippet.find(".author").attr("href", "/user/"+piece.author.id).find("i").text(piece.author.emoji);
		snippet.find(".author").find("span").text("by "+piece.author.display);
		snippet.toggleClass("starred", piece.starred);
		snippet.find(".star").attr("title", piece.starred ? "Unstar" : "Star").find("span").text(piece.starcount);
		snippet.find(".star i").removeClass().addClass(piece.starred ? "icon-star_border" : "icon-star");
		snippet.find(".content").text(piece.content);
		snippet.find("time").attr("datetime", new Date(piece.createdat).toISOString()).text($.timeago(new Date(piece.createdat)));
		var storyHeight = storyarea.outerHeight();
		attachEventHandlers(snippet);
		storyarea.append(snippet);
		var newStoryHeight = $("#story").outerHeight(),
			newSnippet = $("#story .piece").last();
		storyarea.height(storyHeight).outerHeight();
		storyarea.height(newStoryHeight);
		$("html, body").stop().animate({
			scrollTop: newSnippet.offset().top-200
		}, 300, "swing");
		updateAddress(piece.shortID);
		storyarea.on(transitionend, function() {
			newSnippet.removeClass("hidden");
			$("#story").height("auto");
		});
		$("#next .status").text("restoring...");
		if (localstore) writestoryarea.val(localStorage.getItem("save_"+currentID) || "").change();
		if (piece.storyfragment) writestoryarea.val(piece.storyfragment || "").change();
		$("#next .status").text("ready");
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
			container.find(".box").on(transitionend, function() {
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
			});
		});
	}

	$(".inputlike").find("textarea, input, button").focus(function() {
		$(this).parents(".inputlike").addClass("focus");
	}).blur(function() {
		$(this).parents(".inputlike").removeClass("focus");
	});

});
