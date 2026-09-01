const http = require("http");

console.log("Testing /test-token endpoint...");

const options = {
    hostname: "localhost",
    port: 5000,
    path: "/test-token",
    method: "GET"
};

const req = http.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => {
        data += chunk;
    });
    res.on("end", () => {
        console.log("Status:", res.statusCode);
        const json = JSON.parse(data);
        console.log("Response:", JSON.stringify(json, null, 2));
        console.log("Token field exists:", "token" in json);
        console.log("Token value:", json.token);
    });
});

req.on("error", (err) => {
    console.error("Error:", err.message);
});

req.end();
