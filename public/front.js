$(document).ready(function() {
	var hasSeenNewest = true,
		historyManipulated = false,
		currentID = location.pathname.length > 4 ? location.pathname.replace("/story/", "") : "00000",
		tofocus = $(".getfocus"), count = 0, writesaver,
		actionform = $("#next"), writestoryarea = actionform.find("textarea"),
		origboxheight = writestoryarea.innerHeight(), prevText = "",
		valuechange = "change keyup keydown keypress",
		localstore = typeof(Storage) !== "undefined",
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
						if (localstore) localStorage.removeItem("save_"+currentID);
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
					} else {
						$("#next .status").text("saving...");
						if (localstore) localStorage.setItem("save_"+currentID, nowText);
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
				}, 1000);
			}
		}
		prevText = nowText;
	});
	$("#next .status").text("restoring...");
	if (localstore) writestoryarea.val(localStorage.getItem("save_"+currentID) || "").change();
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
			var element = $(this);
			element.mousedown(function(e) {
				if (radialmenu.is(":visible")) hideMenu();
				else if (!$(e.target).is("a, a *") && e.which == 1) showMenu(e.pageX-parseInt($("#wrapper").css("padding-left")), e.pageY, element);
			}).on("touchstart", function(e) {
				if (radialmenu.is(":visible")) hideMenu();
				else if (!$(e.target).is("a, a *")) showMenu(e.originalEvent.touches[0].pageX-2*parseInt($("#wrapper").css("padding-left")), e.originalEvent.touches[0].pageY, element);
			}).find(".options a").focus(function() {
				element.addClass("hover");
			}).blur(function() {
				element.removeClass("hover");
			});
		});
	}

	attachEventHandlers("#story .piece");

	function showMenu(x, y, element) {
		radialopen = new Date();
		$("body").addClass("dragging");
		var id = element.attr("id").replace("piece", "");
		radialmenu.find("a, div").unbind().on("mouseup touchend", function() {
			if (new Date() - radialopen > 300) {
				// it's a drag!
				$(this).click();
			} else {
				$("body").removeClass("dragging");
			}
		}).click(function() {
			hideMenu();
		});
		$(document).unbind("mouseup touchend").on("mouseup touchend", function(e) {
			if (new Date() - radialopen > 300 && !$(e.target).is("#radial, #radial *")) hideMenu();
		});
		radialmenu.find(".close").click(hideMenu);
		radialmenu.find(".star").click(function(e) {
			var myself = $(this);
			$.post(myself.attr("href"), {
				id: id
			}, function(data) {
				if (data.status == "failed") {
					message(data.message, "Failed to star");
				} else {
					element.toggleClass("starred", data.data.starred);
				}
			}, "json");
			e.preventDefault();
		}).attr("href", "/"+(element.hasClass("starred") ? "unstar" : "star"))
		.find("i").removeClass().addClass("icon-star"+(element.hasClass("starred") ? "_border" : ""));
		radialmenu.find(".rewind").click(function(e) {
			if (historyManipulated) window.location.replace("/story/"+id);
			else window.location = "/story/"+id;
			e.preventDefault();
		}).attr("href", "/story/"+id);
		radialmenu.find(".author").click(function(e) {
			window.location = $(this).attr("href");
			e.preventDefault();
		}).attr("href", element.find(".author").attr("href"));
		radialmenu.hide().addClass("collapsed").css({
			top: y,
			left: x
		}).outerWidth();
		radialmenu.show().removeClass("collapsed");
		clearTimeout(radialclose);
	}

	function hideMenu() {
		$("body").removeClass("dragging");
		radialmenu.addClass("collapsed");
		radialclose = setTimeout(function() {
			radialmenu.hide();
		}, 500);
	}

	radialmenu.show().hide();

	function renderPiece(piece) {
		var snippet = $(".master.piece").clone();
		snippet.removeClass("master").addClass("hidden").attr("id", "piece"+piece.shortID);
		snippet.find(".author").attr("href", "/user/"+piece.author.id).find("i").text(piece.author.emoji);
		snippet.find(".author").find("span").text("by "+piece.author.display);
		snippet.toggleClass("starred", piece.starred);
		//var staraction = piece.starred ? "unstar" : "star";
		//snippet.find(".star").attr("href", "/"+staraction).find("span").text(staraction);
		//snippet.find(".rewind").attr("href", "/story/"+piece.id);
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
			});
		});
	}
});

$(".inputlike").find("textarea, input, button").focus(function() {
	$(this).parents(".inputlike").addClass("focus");
}).blur(function() {
	$(this).parents(".inputlike").removeClass("focus");
});
