const http = require("http");

console.log("Testing basic GET request to root...");

const options = {
    hostname: "localhost",
    port: 5000,
    path: "/",
    method: "GET",
    timeout: 5000
};

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    let data = "";
    res.on("data", (chunk) => {
        data += chunk;
    });

    res.on("end", () => {
        console.log("\nResponse Preview:");
        console.log(data.substring(0, 500));
        console.log("\n---\n");
        
        // Now test an API endpoint
        testAPIEndpoint();
    });
});

req.on("error", (err) => {
    console.error("Connection error:", err.message);
    process.exit(1);
});

req.on("timeout", () => {
    console.error("Request timeout");
    req.abort();
});

req.end();

function testAPIEndpoint() {
    console.log("Testing API endpoint /api/tasks...");

    const apiOptions = {
        hostname: "localhost",
        port: 5000,
        path: "/api/tasks",
        method: "GET",
        headers: {
            "Authorization": "Bearer invalid-token",
            "Content-Type": "application/json"
        },
        timeout: 5000
    };

    const apiReq = http.request(apiOptions, (res) => {
        console.log(`Status: ${res.statusCode}`);
        let data = "";
        res.on("data", (chunk) => {
            data += chunk;
        });

        res.on("end", () => {
            console.log("Response:");
            try {
                const json = JSON.parse(data);
                console.log(JSON.stringify(json, null, 2));
            } catch (e) {
                console.log("HTML Response:", data.substring(0, 500));
            }
        });
    });

    apiReq.on("error", (err) => {
        console.error("API Error:", err.message);
    });

    apiReq.on("timeout", () => {
        console.error("API Request timeout");
        apiReq.abort();
    });

    apiReq.end();
}
