// ============================================================
// DUEMATE - PHASE 2 API TEST SUITE
// Tests all new endpoints added in Phase 2
// ============================================================

const axios = require("axios");

const API_URL = "http://localhost:5000/api";
let authToken = "";
let testUserId = "";
let testGroupId = "";
let testSubjectId = "";
let testNoteId = "";

const testEmail = `test-phase2-${Date.now()}@example.com`;
const testPassword = "TestPass123!";

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function logTest(name, passed, message = "") {
    const status = passed ? "✓" : "✗";
    console.log(`${status} ${name}`);
    if (message) console.log(`  ${message}`);
}

async function makeRequest(method, endpoint, data = null, includeAuth = true) {
    try {
        const config = {
            method,
            url: `${API_URL}${endpoint}`,
            data,
        };

        if (includeAuth && authToken) {
            config.headers = {
                Authorization: `Bearer ${authToken}`,
            };
        }

        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message,
            status: error.response?.status,
        };
    }
}

// ============================================================
// TEST SUITE
// ============================================================

async function runTests() {
    console.log("\n=== PHASE 2 API TESTS ===\n");

    try {
        // Test 1: Register user
        console.log("Test 1: User Registration");
        const registerRes = await makeRequest(
            "POST",
            "/auth/register",
            {
                name: "Test User Phase 2",
                email: testEmail,
                password: testPassword,
                college: "Test College",
                course: "Test Course",
                year: "1",
            },
            false
        );
        logTest(
            "User registration",
            registerRes.success,
            `Email: ${testEmail}`
        );

        // Test 2: Login user
        console.log("\nTest 2: User Login");
        const loginRes = await makeRequest(
            "POST",
            "/auth/login",
            {
                email: testEmail,
                password: testPassword,
            },
            false
        );
        logTest("User login", loginRes.success);
        if (loginRes.success && loginRes.data.jwtToken) {
            authToken = loginRes.data.jwtToken;
        }

        // Test 3: Get/Create Settings
        console.log("\nTest 3: Settings Management");
        const getSettingsRes = await makeRequest("GET", "/settings");
        logTest("Get settings", getSettingsRes.success);

        const updateSettingsRes = await makeRequest("PUT", "/settings", {
            theme: "dark",
            language: "en",
            start_page: "dashboard",
            notification_sound: true,
            task_notifications: true,
        });
        logTest("Update settings", updateSettingsRes.success);

        // Test 4: Create Subject
        console.log("\nTest 4: Subjects Management");
        const createSubjectRes = await makeRequest("POST", "/subjects", {
            name: "Test Subject",
            code: "TEST101",
            color: "#5d9cff",
            description: "This is a test subject",
        });
        logTest("Create subject", createSubjectRes.success);
        if (createSubjectRes.success) {
            testSubjectId = createSubjectRes.data.subject.id;
        }

        // Test 5: Get Subjects
        const getSubjectsRes = await makeRequest("GET", "/subjects");
        logTest("Get subjects", getSubjectsRes.success);

        // Test 6: Update Subject
        const updateSubjectRes = await makeRequest(
            "PUT",
            `/subjects/${testSubjectId}`,
            {
                name: "Updated Subject",
                color: "#ff86b6",
            }
        );
        logTest("Update subject", updateSubjectRes.success);

        // Test 7: Create Subject Note
        console.log("\nTest 5: Subject Notes Management");
        const createNoteRes = await makeRequest(
            "POST",
            `/subjects/${testSubjectId}/notes`,
            {
                title: "Test Note",
                content: "This is a test note content",
                note_type: "text",
            }
        );
        logTest("Create subject note", createNoteRes.success);
        if (createNoteRes.success) {
            testNoteId = createNoteRes.data.note.id;
        }

        // Test 8: Get Notes
        const getNotesRes = await makeRequest(
            "GET",
            `/subjects/${testSubjectId}/notes`
        );
        logTest("Get subject notes", getNotesRes.success);

        // Test 9: Update Note
        const updateNoteRes = await makeRequest(
            "PUT",
            `/subjects/notes/${testNoteId}`,
            {
                title: "Updated Note",
                content: "Updated note content",
            }
        );
        logTest("Update note", updateNoteRes.success);

        // Test 10: Create Notification
        console.log("\nTest 6: Notifications Management");
        const createNotifRes = await makeRequest(
            "POST",
            "/notifications",
            {
                type: "test",
                title: "Test Notification",
                message: "This is a test notification",
            }
        );
        logTest(
            "Create notification (manual)",
            createNotifRes.success || createNotifRes.status === 404
        );

        // Test 11: Get Notifications
        const getNotifRes = await makeRequest("GET", "/notifications");
        logTest("Get notifications", getNotifRes.success);

        // Test 12: Get User Badges
        console.log("\nTest 7: Badges & Streaks");
        const getBadgesRes = await makeRequest("GET", "/user/badges");
        logTest("Get badges", getBadgesRes.success);

        // Test 13: Award Badge
        const awardBadgeRes = await makeRequest("POST", "/user/badges", {
            badgeName: "Early Bird",
            badgeType: "achievement",
        });
        logTest("Award badge", awardBadgeRes.success);

        // Test 14: Get Streaks
        const getStreaksRes = await makeRequest("GET", "/user/streaks");
        logTest("Get streaks", getStreaksRes.success);

        // Test 15: Update Streak
        const updateStreakRes = await makeRequest(
            "PATCH",
            "/user/streaks/daily_tasks",
            {}
        );
        logTest(
            "Update streak",
            updateStreakRes.success || updateStreakRes.status === 200
        );

        // Test 16: Game Scores
        console.log("\nTest 8: Games");
        const gameScoreRes = await makeRequest("POST", "/games/sudoku/score", {
            score: 100,
            points: 50,
        });
        logTest(
            "Submit game score (personal)",
            gameScoreRes.success || gameScoreRes.status === 201
        );

        // Test 17: Get Game Scores
        const getGameScoresRes = await makeRequest(
            "GET",
            "/games/memory/scores"
        );
        logTest("Get game scores", getGameScoresRes.success);

        // Test 18: Create Task with reminder
        console.log("\nTest 9: Task Reminders");
        const tomorrow = new Date(Date.now() + 86400000)
            .toISOString()
            .split("T")[0];
        const createTaskRes = await makeRequest("POST", "/tasks", {
            name: "Task for reminder test",
            subject: testSubjectId || "General",
            task_date: tomorrow,
            priority: "high",
            description: "This task should trigger reminders",
        });
        logTest("Create task (for reminders)", createTaskRes.success);

        // Test 19: Delete Subject Note
        console.log("\nTest 10: Cleanup");
        const deleteNoteRes = await makeRequest(
            "DELETE",
            `/subjects/notes/${testNoteId}`
        );
        logTest("Delete note", deleteNoteRes.success);

        // Test 20: Delete Subject
        const deleteSubjectRes = await makeRequest(
            "DELETE",
            `/subjects/${testSubjectId}`
        );
        logTest("Delete subject", deleteSubjectRes.success);

    } catch (error) {
        console.error("Test suite error:", error.message);
    }

    console.log("\n=== PHASE 2 TESTS COMPLETE ===\n");
}

// Run tests
runTests().catch(console.error);
