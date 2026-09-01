const http = require("http");

console.log("Testing root endpoint...");

const options = {
    hostname: "localhost",
    port: 5000,
    path: "/",
    method: "GET"
};

const req = http.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => {
        data += chunk;
    });
    res.on("end", () => {
        console.log("Status:", res.statusCode);
        console.log("Response (first 500 chars):", data.substring(0, 500));
        try {
            const json = JSON.parse(data);
            console.log("✓ Valid JSON");
            console.log(json);
        } catch (e) {
            console.log("✗ HTML response");
        }
    });
});

req.on("error", (err) => {
    console.error("Error:", err.message);
});

req.end();
