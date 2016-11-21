$("#next textarea").on("change keyup keydown keypress", function() {
	$("#next").toggleClass("hastext", $(this).val().length > 0);
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

var hasSeenNewest = true,
	historyManipulated = false,
	currentID = location.pathname.length > 4 ? location.pathname : "00000";

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
			if (historyManipulated) window.location.replace("/"+id);
			else window.location = "/"+id;
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
	var staraction = piece.starred ? "unstar" : "star";
	snippet.find(".star").attr("href", "/"+staraction).find("span").text(staraction);
	snippet.find(".rewind").attr("href", "/"+piece.id);
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
		history.replaceState({}, id, "/"+id);
	} else {
		historyManipulated = true;
		history.pushState({}, id, "/"+id);
	}
}

function message(msg, title) {
	$("#message .contents").text(msg);
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
	});
}
