#!/usr/bin/env node

require("dotenv").config();

// Override port for testing
process.env.PORT = 5001;

// Load and run server
require("./server.js");
