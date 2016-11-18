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
		agent.get("/meows")
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
	it("attempt to create a user account without any information", function(done) {
		agent.post("/signup")
			.expect(function(res) {
				res.body.location = "/signup";
			})
			.end(done);
	});
	it("create a user account using valid data", function(done) {
		agent.post("/signup")
			.send({
				email: "test@example.com",
				username: "test",
				password: "P@$$w0rd",
				reentered: "P@$$w0rd"
			})
			.expect(function(res) {
				res.body.location = "/";
			})
			.end(done);
	});
	it("create a user account", function(done) {
		agent.post("/login")
			.send({
				email: "test@example.com",
				password: "P@$$w0rd"
			})
			.expect(function(res) {
				res.body.location = "/";
			})
			.end(done);
	});
});
