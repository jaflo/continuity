var request = require("supertest");
var app = require("../app");

before(function (done) {
	process.on("initialized", done);
});

describe("Main actions", function() {
	it("Load the initial story", function(done) {
		request(app)
			.get("/")
			.expect(200, done);
	});
});
