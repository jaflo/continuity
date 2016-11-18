$("#next textarea").on("change keyup keydown keypress", function() {
	$("#next").toggleClass("hastext", $(this).val().length > 0);
});

$("#next").submit(function(e) {
	if ($("#next textarea").val().length > 0) {
		$.post("/create", $("#next").serialize(), function(data) {
			if (data.status == "failed") {
				alert("Failed to create: "+data.message);
			} else {
				renderPiece({
					id: "abc123",
					content: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate.",
					author: {
						id: "1",
						display: "Bob",
						emoji: "😀"
					},
					created: "timestamp",
					starred: false
				});
			}
		}, "json");
	} else {
		$.get("/next", {
			parent: currentID
		}, function(data) {
			if (data.status == "failed") {
				alert("Failed to load: "+data.message);
			} else {
				renderPiece({
					id: "abc123",
					content: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate.",
					author: {
						id: "1",
						display: "Bob",
						emoji: "😀"
					},
					created: "timestamp",
					starred: false
				});
			}
		}, "json");
	}
	e.preventDefault();
});

var hasSeenNewest = true,
	historyManipulated = false,
	currentID = "00000";

$(window).scroll(function() {
	var win = $(window);
	if (!hasSeenNewest && win.scrollTop() + win.height() > $("#editor").offset().top + 60) hasSeenNewest = true;
}).on("popstate", function(e) {
	// I'm too lazy to clean up, just refresh
	window.location.reload();
});

function renderPiece(piece) {
	var snippet = $(".master.piece").clone();
	snippet.removeClass("master").addClass("hidden").attr("id", "piece"+piece.id);
	snippet.find(".author").attr("href", "/user/"+piece.author.id).find("i").text(piece.author.emoji);
	snippet.find(".author").find("span").text("by "+piece.author.display);
	var staraction = piece.starred ? "unstar" : "star";
	snippet.find(".star").attr("href", "/"+staraction).click(function() {
		$.post($(this).attr("href"), {
			id: $(this).attr("id").replace("piece", "")
		}, function(data) {
			if (data.status == "failed") {
				alert("Failed to create: "+data.message);
			} else {
				alert("Woooo!");
			}
		}, "json");
		return false;
	}).find("span").text(staraction);
	snippet.find(".rewind").attr("href", "/"+piece.id).click(function() {
		var myID = $(this).parents(".piece").attr("id").replace("piece", "");
		if (historyManipulated) window.location.replace("/"+myID);
		else window.location = "/"+myID;
		return false;
	});
	snippet.find(".content").text(piece.content);
	var storyHeight = $("#story").outerHeight();
	$("#story").append(snippet)
	var newStoryHeight = $("#story").outerHeight(),
		 newSnippet = $("#story .piece").last();
	$("#story").height(storyHeight).outerHeight();
	$("#story").height(newStoryHeight);
	$("html, body").stop().animate({
		scrollTop: newSnippet.offset().top-200
	}, 300, "swing");
	updateAddress(piece.id);
	setTimeout(function() {
		newSnippet.removeClass("hidden");
		$("#story").height("auto");
	}, 300);
	return false;
}

function updateAddress(id) {
	currentID = id;
	if (historyManipulated) {
		history.replaceState({}, id, "/"+id);
	} else {
		historyManipulated = true;
		history.pushState({}, id, "/"+id);
	}
}
