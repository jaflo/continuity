var request = require("supertest");
var app = require("../app");
var agent = request.agent(app);

before(function (done) {
	process.on("initialized", done);
});

describe("main", function() {
	it("load the root story", function(done) {
		agent.get("/")
			.expect(200, done);
	});
	it("load a non-existant story", function(done) {
		agent.get("/story/meows")
			.expect(404, done);
	});
});

describe("authentication", function() {
	it("load the sign up page", function(done) {
		agent.get("/signup")
			.expect(200, done);
	});
	it("load the login page", function(done) {
		agent.get("/login")
			.expect(200, done);
	});
	it("create a user account", function(done) {
		agent.post("/signup")
			.send({
				email: "test@example.com",
				displayname: "Tester",
				emoji: "🤖",
				password: "P@$$w0rd",
				reentered: "P@$$w0rd"
			})
			.expect("Location", "/")
			.end(done);
	});
	it("log in", function(done) {
		agent.post("/login")
			.send({
				email: "test@example.com",
				password: "P@$$w0rd"
			})
			.expect("Location", "/")
			.end(done);
	});
});
