var request = require("supertest");
var app = require("../app");

describe("Main actions", function() {
	it("Load the initial story", function(done) {
		request(app)
			.get("/")
			.expect(200, done);
	});
});
