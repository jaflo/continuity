$(document).ready(function() {
	var hasSeenNewest = true, scrollable = $("#wrapper"), historyManipulated = false,
		currentID = location.pathname.length > 4 ? location.pathname.replace("/story/", "") : "00000",
		tofocus = $(".getfocus"), count = 0, writesaver, storyarea = $("#story"),
		actionform = $("#next"), writestoryarea = actionform.find("textarea"),
		origboxheight = writestoryarea.innerHeight(), prevText = "",
		valuechange = "keyup keydown keypress", canclose = true,
		transitionend = "webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend",
		localstore = $("#user").hasClass("loggedout") && typeof(Storage) !== "undefined";

	while (tofocus.val() && count < 10) {
		tofocus = tofocus.nextAll("input, select, textarea").first();
		count++; // just in case
	}
	tofocus.focus();

	$("time").timeago();

	$("a.emailus").attr("href", "mailto:"+$("a.emailus").text().replace("bot", ""));

	$(document).ajaxError(function(e, jqXHR) {
		console.log(jqXHR);
		if (jqXHR.status == 0) message("Check your internet connection.", "Unable to connect");
	});

	$("header h1 div").click(function(e) {
		if (scrollable.scrollTop() > 0) {
			scrollable.stop().animate({
				scrollTop: 0
			}, 300, "swing");
			e.preventDefault();
		}
	});

	if (typeof loadedRecaptcha != "undefined" && loadedRecaptcha) $("#signup button").removeAttr("disabled");

	$("#login, #signup").submit(function(e) {
		if ($(this).find("button").attr("disabled")) {
			e.preventDefault();
		} else {
			var msg = $("<div>"), list = $("<ul>"), missing = false;
			$(this).children("input").each(function() {
				if (!$(this).val()) {
					list.append($("<li>").text($("label[for="+$(this).attr("name")+"]").text().toLowerCase()));
					missing = true;
				}
			});
			if (missing) msg.text("You did not enter anything for").append(list);
			if ($("#password").val().length < 6) {
				msg.append("Your password is too short. Enter more than 6 characters. ");
				missing = true;
			}
			if (typeof solvedCaptcha != "undefined" && !solvedCaptcha) {
				msg.append("Please solve the captcha.");
				missing = true;
			}
			if (missing) {
				message(msg, "Missing information");
				e.preventDefault();
			} else {
				$(this).find("button").attr("disabled", "disabled");
			}
		}
	});

	function adjustHeight(thing) {
		thing.height("");
		var determinedheight = thing[0].scrollHeight;
		thing.height(determinedheight > 160 ? determinedheight : "");
	}

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
			adjustHeight(writestoryarea);
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
	writestoryarea.val(writestoryarea.val() || localStorage.getItem("save_"+currentID)).keypress();
	$("#next .status").text("ready");

	actionform.submit(function(e) {
		if (!$(this).find("button").attr("disabled")) {
			if (writestoryarea.val().length > 0) {
				$.post("/create", $("#next").serialize(), function(data) {
					actionform.find("textarea, button").removeAttr("disabled");
					if (data.status == "failed") {
						message(data.message, "Failed to create");
					} else {
						writestoryarea.val("").keypress();
						var id = currentID;
						renderPiece(data.data);
						localStorage.removeItem("save_"+id);
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
					actionform.find("textarea, button").removeAttr("disabled");
				}, "json").fail(function() {
					actionform.find("textarea, button").removeAttr("disabled");
				});
				actionform.find("button").attr("disabled", "disabled");
			}
		}
		e.preventDefault();
	});

	scrollable.scroll(function() {
		if (!hasSeenNewest && scrollable.scrollTop() + scrollable.height() > $("#editor").offset().top + 60) hasSeenNewest = true;
	});

	$(window).on("popstate", function(e) {
		// I'm too lazy to clean up, just refresh
		window.location.reload();
	});

	$(".piece .banner a").click(function() {
		$(this).parents(".piece").removeClass("sensitive").find(".banner").remove();
		return false;
	});

	function attachEventHandlers(elements) {
		$(elements).not(".master").each(function() {
			var element = $(this),
				id = element.attr("id").replace("piece", "");
			if (element.hasClass("sensitive")) element.find(".banner a").unbind("click").click(function() {
				element.removeClass("sensitive").find(".banner").remove();
				return false;
			});
			element.click(function(e) {
				if ($(e.target).is(".author a") || !canclose || element.hasClass("sensitive") || element.hasClass("removed")) return;
				var previous = $("#story .highlighed.piece");
				if (!element.hasClass("highlighed")) {
					element.height("auto");
					var before = element.outerHeight();
					element.find(".controls").show();
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
					var visible = previous.find("> div:visible, > form:visible"), hidden = previous.find("> div:hidden");
					var before = previous.outerHeight() - 2*parseFloat(previous.css("padding-top"));
					previous.removeClass("highlighed").find(".more, .editor").hide();
					previous.find(".content").show();
					var after = previous.outerHeight() - 2*parseFloat(previous.find(".controls").css("padding-top"));
					visible.show();
					hidden.hide();
					previous.height(before);
					previous.removeClass("highlighed");
					previous.height(after);
					previous.unbind(transitionend).on(transitionend, function() {
						previous.height("auto");
						previous.find(".editor, .contextual").remove();
						previous.find(".content").show();
						previous.find(".controls").hide();
					});
				}
			});
			element.find("time").timeago();
			element.find(".rewind").click(function(e) {
				if (historyManipulated) window.location.replace("/story/"+id);
				else window.location = "/story/"+id;
				blowBubble(e, false, "#4D9078", element);
				return false;
			});
			element.find(".star").click(function(e) {
				var myself = $(this);
				$.post(element.hasClass("starred") ? "/unstar" : "/star", {
					id: id
				}, function(data) {
					if (data.status == "failed") {
						message(data.message, "Failed to star");
					} else {
						myself.find("i").removeClass().addClass(data.data.starred ? "icon-star_border" : "icon-star");
						element.toggleClass("starred", data.data.starred);
						myself.find("span").text(data.message);
						myself.attr("title", data.data.starred ? "Unstar" : "Star");
					}
				}, "json");
				blowBubble(e, false, "#F2C14E", element);
				return false;
			});
			element.find(".edit").click(function(e) {
				element.height("auto");
				var before = element.outerHeight() - 2*parseFloat(element.css("padding-top"));
				var editable = $("<form class=editor><textarea>");
				var source = element.find(".content").html();
				source = source.replace(/<b>(.*?)<\/b>/g, "**$1**");
				source = source.replace(/<i>(.*?)<\/i>/g, "*$1*");
				source = source.replace(/<u>(.*?)<\/u>/g, "__$1__");
				editable.find("textarea").val(source);
				element.find(".content").hide().after(editable);
				editable.after($(".master .more").clone().removeClass("controls").addClass("pos contextual"));
				var bar = element.find(".contextual").show(), button = $("<button type=button><i>");
				bar.find("div").text("after saving, your edit cannot be undone");
				bar.find("button").remove();
				bar.append(button.clone().addClass("cancel").attr("title", "Discard changes"));
				bar.find("button.cancel").click(function() {
					canclose = true;
				}).click(blowBubble).find("i").removeClass().addClass("icon-close");
				bar.append(" ").append(button.clone().addClass("confirm").attr("title", "Save changes"));
				editable.submit(function(e) {
					if (!$(this).attr("disabled")) {
						$.post("/edit", {
							content: element.find(".editor textarea").val(),
							shortID: id
						}, function(data) {
							bar.find("button").removeAttr("disabled");
							if (data.status == "failed") {
								message(data.message, "Failed to edit");
							} else {
								toast("Your story has been edited.");
								element.find(".content").text(data.data.content);
								canclose = true;
								element.click();
							}
						}, "json").fail(function() {
							bar.find("button").removeAttr("disabled");
						});
						bar.find("button").attr("disabled", "disabled");
					}
					e.preventDefault();
				});
				bar.find("button.confirm").click(blowBubble).find("i").removeClass().addClass("icon-check").after(" Save");
				element.find(".controls").hide();
				element.find(".editor textarea").on(valuechange, function() {
					adjustHeight($(this));
				}).keypress().focus();
				canclose = false;
				var after = element.outerHeight() - 2*parseFloat(element.find(".controls").css("padding-top"));
				element.height(before);
				editable.hide();
				bar.hide();
				element.find(".content").show();
				element.height(after);
				blowBubble(e, function() {
					element.height("auto");
					element.find(".content").hide();
					editable.show();
					bar.show().outerWidth();
					bar.addClass("shown");
				}, "#4380BA", element);
				return false;
			});
			element.find(".delete").click(function(e) {
				blowBubble(e, function() {
					element.find(".content").after($(".master .more").clone().removeClass("controls").addClass("neg contextual"));
					var bar = element.find(".contextual").show(), button = bar.find("button").first().clone().removeClass();
					bar.find("div").text("deletion cannot be undone");
					bar.find("button").remove();
					bar.append(button.clone().addClass("cancel").attr("title", "Keep story"));
					bar.find("button.cancel").click(function() {
						canclose = true;
					}).click(blowBubble).text("Keep story");
					bar.append(" ").append(button.clone().addClass("confirm").attr("title", "Delete"));
					bar.find("button.confirm").click(function() {
						if (!$(this).attr("disabled")) {
							$.post("/delete", {
								shortID: id
							}, function(data) {
								bar.find("button").removeAttr("disabled");
								if (data.status == "failed") {
									message(data.message, "Failed to delete");
								} else {
									var parent = element.prev(".piece").attr("id").replace("piece", "");
									element.nextAll(".piece").remove();
									element.remove();
									updateAddress(parent);
									toast("Your story has been deleted.");
								}
							}, "json").fail(function() {
								bar.find("button").removeAttr("disabled");
							});
							bar.find("button").attr("disabled", "disabled");
						}
					}).click(blowBubble).find("i").removeClass().addClass("icon-delete");
					element.find(".controls").hide();
					bar.outerWidth();
					bar.addClass("shown");
				}, "#AD343E");
				return false;
			});
			element.find(".flag").click(function(e) {
				blowBubble(e, function() {
					element.find(".content").after($("<form class='more neg contextual raiseflag'><form>"));
					var bar = element.find(".contextual").show(), button = $("<button type=button><i>");
					bar.append($("<input>").attr("placeholder", "why should this be deleted?"));
					bar.append(button.clone().addClass("cancel").attr("title", "Nevermind"));
					bar.find("button.cancel").click(function() {
						canclose = true;
					}).click(blowBubble).text("Nevermind");
					bar.append(" ").append(button.clone().addClass("confirm").attr("title", "Flag"));
					bar.submit(function(e) {
						if (!$(this).attr("disabled")) {
							$.post("/flag", {
								reason: bar.find("input").val(),
								shortID: id
							}, function(data) {
								bar.find("button").removeAttr("disabled");
								if (data.status == "failed") {
									message(data.message, "Failed to flag");
								} else {
									toast("The story has been flagged.");
									canclose = true;
									element.click();
								}
							}, "json").fail(function() {
								bar.find("button").removeAttr("disabled");
							});
							bar.find("button").attr("disabled", "disabled");
						}
						e.preventDefault();
					});
					bar.find("button.confirm").attr("type", "submit").click(blowBubble).find("i").addClass("icon-flag");
					element.find(".controls").hide();
					element.find(".raiseflag input").focus();
					canclose = false;
					bar.outerWidth();
					bar.addClass("shown");
				}, "#AD343E");
				return false;
			});
		});
	}

	function blowBubble(e, callback, color, fill) {
		var around = $(e.target),
			bubble = $("<div>").addClass("hidden click").toggleClass("fadeout", color != "#AD343E" && color != "#4380BA"),
			container = (fill ? fill : around.parents(".more")).toggleClass("noverflow", color),
			x = around.offset().left-container.offset().left+(e.offsetX||around.outerWidth()/2),
			y = around.offset().top-container.offset().top+(e.offsetY||around.outerHeight()/2),
			diameter = Math.sqrt(Math.pow(container.outerWidth(), 2) + Math.pow(container.outerHeight(), 2))*2;
		if (color != "#AD343E" && color != "#4380BA") diameter = 300;
		bubble.css({
			background: color ? color : "rgba(0,0,0,0.7)",
			width: diameter,
			height: diameter,
			margin: -diameter/2,
			top: y,
			left: x
		});
		container.append(bubble).outerWidth();
		bubble.on(transitionend, function() {
			if (typeof callback == "function") callback();
			if (color != "#4380BA") {
				bubble.remove();
				container.removeClass("noverflow");
			} else {
				bubble.unbind(transitionend).addClass("fadeout").on(transitionend, function() {
					bubble.remove();
					container.removeClass("noverflow");
				});
			}
		}).removeClass("hidden");
	}

	attachEventHandlers("#story .piece");

	function renderPiece(piece) {
		var snippet = $(".master.piece").clone();
		snippet.removeClass("master").addClass("hidden").attr("id", "piece"+piece.shortID);
		snippet.toggleClass("starred", piece.starred);
		snippet.find(".author a").attr("href", "/user/"+piece.author.id).text(piece.author.display);
		snippet.find(".author span").text(piece.author.emoji);
		snippet.find(".star").attr("title", piece.starred ? "Unstar" : "Star").find("span").text(piece.starcount);
		snippet.find(".star i").removeClass().addClass(piece.starred ? "icon-star_border" : "icon-star");
		snippet.find(".content").text(piece.content);
		var clean = snippet.find(".content").html();
		clean = clean.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
		clean = clean.replace(/\*(.*?)\*/g, "<i>$1</i>");
		clean = clean.replace(/__(.*?)__/g, "<u>$1</u>");
		snippet.find(".content").html(clean);
		snippet.find("time").attr("datetime", new Date(piece.createdat).toISOString()).text($.timeago(new Date(piece.createdat)));
		if (!piece.mine) snippet.find(".edit, .delete").remove();
		if (piece.flagstatus == 1) {
			snippet.append("<div class=banner>This contains sensitive content. <a href=#>Show anyways</a></div>");
			snippet.addClass("sensitive");
		} else if (piece.flagstatus == 2) {
			snippet.html("<div class=banner>This has been removed.</div>");
			snippet.addClass("removed");
		}
		var storyHeight = storyarea.outerHeight();
		attachEventHandlers(snippet);
		storyarea.append(snippet);
		var newStoryHeight = $("#story").outerHeight(),
			newSnippet = $("#story .piece").last();
		storyarea.height(storyHeight).outerHeight();
		storyarea.height(newStoryHeight);
		scrollable.stop().animate({
			scrollTop: newSnippet.offset().top-200
		}, 300, "swing");
		updateAddress(piece.shortID);
		storyarea.on(transitionend, function() {
			newSnippet.removeClass("hidden");
			$("#story").height("auto");
		});
		$("#next .status").text("restoring...");
		if (localstore) writestoryarea.val(localStorage.getItem("save_"+currentID) || "").keypress();
		if (piece.storyfragment) writestoryarea.val(piece.storyfragment || "").keypress();
		$("#next .status").text("ready");
		return false;
	}

	function updateAddress(id) {
		currentID = id;
		actionform.find("input[name=parent]").val(id);
		var url = id == "00000" ? "/" : "/story/"+id;
		if (historyManipulated) {
			history.replaceState({}, id, url);
		} else {
			historyManipulated = true;
			history.pushState({}, id, url);
		}
	}

	function message(msg, title) {
		var hadFocus = $(":focus"), container = $("#message");
		container.find(".contents").html(typeof msg == "array" ? msg.join("") : msg);
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

	$("#update").submit(function(e) {
		var form = $(this);
		$.post("/user/update", form.serialize(), function(data) {
			form.find("input, button").removeAttr("disabled");
			if (data.status == "failed") {
				message(data.message, "Failed to update");
			} else {
				toast("Updated profile.");
			}
		}, "json").fail(function() {
			form.find("input, button").removeAttr("disabled");
		});
		form.find("input, button").attr("disabled", "disabled");
		e.preventDefault();
	});

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

	$("#flagprocess").submit(function() {
		if ($(this).find("select").val() == "remove" && !$(".escalate input").is(":checked")) {
			message("This will remove the story permanently. Only do this for illegal content.", "You sure?");
			return false;
		}
	}).find("select").change(function() {
		$(".escalate").toggle($(this).val() == "remove");
	});

	var toasts = [];
	function toast(message) {
		if ($(".toast").length > 0) {
			toasts.push(message);
		} else {
			var bar = $("<div>").addClass("hidden toast").text(message);
			$("body").append(bar);
			bar.outerWidth();
			bar.removeClass("hidden");
			setTimeout(function() {
				bar.addClass("hidden").on(transitionend, function() {
					bar.remove();
					if (toasts.length > 0) toast(toasts.shift());
				});
			}, 3000);
		}
	}

	$(".inputlike").find("textarea, input, button, select").focus(function() {
		$(this).parents(".inputlike").addClass("focus");
	}).blur(function() {
		$(this).parents(".inputlike").removeClass("focus");
	});

});
