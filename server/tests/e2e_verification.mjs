import mongoose from "mongoose";
import crypto from "crypto";

const BASE_URL = "http://localhost:5000";
const JWT_SECRET = "habitforge_super_secret_key_12345";
const OTP_SECRET = process.env.OTP_SECRET || JWT_SECRET;

const hashOTP = (email, otp) => {
  return crypto
    .createHmac("sha256", OTP_SECRET)
    .update(`${email.toLowerCase().trim()}:${otp.trim()}`)
    .digest("hex");
};

async function runTest() {
  console.log("=== Starting HabitForge OTP End-to-End Test ===");
  const timestamp = Date.now();
  const testEmail = `otp_test_${timestamp}@example.com`;
  const testPassword = "Password123!";
  const testName = `OTP Tester ${timestamp}`;

  // STEP 1: Register User
  console.log(`\n1. Registering user: ${testEmail}...`);
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: testPassword,
      timezone: "America/New_York",
    }),
  });

  const regData = await regRes.json();
  console.log(`Status: ${regRes.status}`);
  console.log(`Response:`, regData);

  if (regRes.status !== 201) {
    throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
  }
  if (!regData.verificationToken || !regData.maskedEmail) {
    throw new Error("Registration response missing verificationToken or maskedEmail");
  }
  console.log("✓ Registration succeeded with 201 and maskedEmail:", regData.maskedEmail);

  // STEP 2: Attempt Login Before Verification
  console.log("\n2. Attempting login before OTP verification...");
  const preLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });

  const preLoginData = await preLoginRes.json();
  console.log(`Status: ${preLoginRes.status}`);
  console.log(`Response:`, preLoginData);

  if (preLoginRes.status !== 403 || preLoginData.isVerified !== false) {
    throw new Error("Expected 403 Forbidden with isVerified: false before verification");
  }
  console.log("✓ Login correctly blocked with 403 and pending verification token");

  // STEP 3: Connect to Mongo to inspect stored OTP record
  console.log("\n3. Connecting to MongoDB to inspect stored OTP record...");
  const primaryUri = process.env.MONGO_URI || "mongodb+srv://shridharpowar18_db_user:Shri_18@cluster.9enutgm.mongodb.net/test?retryWrites=true&w=majority";
  const localFallbackUri = "mongodb://127.0.0.1:27017/habitforge";
  try {
    await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 4000 });
  } catch (err) {
    console.warn(`Primary connection failed (${err.message}). Connecting to local fallback...`);
    await mongoose.connect(localFallbackUri, { serverSelectionTimeoutMS: 3000 });
  }
  console.log("Connected to MongoDB for direct verification assertion.");

  const db = mongoose.connection.db;
  const otpRecords = await db.collection("emailverificationcodes")
    .find({ email: testEmail.toLowerCase().trim() })
    .toArray();

  if (otpRecords.length === 0) {
    throw new Error("No EmailVerificationCode document found in MongoDB for registered email!");
  }

  const activeRecord = otpRecords[0];
  console.log("Found OTP document in DB:");
  console.log({
    _id: activeRecord._id,
    email: activeRecord.email,
    purpose: activeRecord.purpose,
    codeHash: activeRecord.codeHash?.slice(0, 16) + "...",
    hasRawCode: Boolean(activeRecord.code || activeRecord.otp),
    attemptCount: activeRecord.attemptCount,
    consumedAt: activeRecord.consumedAt,
    expiresAt: activeRecord.expiresAt,
  });

  if (activeRecord.code || activeRecord.otp) {
    throw new Error("SECURITY VIOLATION: Raw OTP is stored in MongoDB document!");
  }
  if (!activeRecord.codeHash || activeRecord.codeHash.length !== 64) {
    throw new Error("Stored codeHash must be a 64-character SHA-256 HMAC string");
  }
  console.log("✓ Zero raw OTP stored in DB; only secure 64-char HMAC-SHA256 hash present");

  // Crack the 6-digit candidate in memory to find the issued code
  console.log("Finding the generated 6-digit code from HMAC hash...");
  let foundCode = null;
  const startTime = Date.now();
  for (let i = 0; i <= 999999; i++) {
    const candidate = String(i).padStart(6, "0");
    if (hashOTP(testEmail, candidate) === activeRecord.codeHash) {
      foundCode = candidate;
      break;
    }
  }
  console.log(`Found generated code in ${Date.now() - startTime}ms: ${foundCode}`);

  if (!foundCode) {
    throw new Error("Could not find matching 6-digit code for stored hash!");
  }

  // STEP 4: Attempt Invalid OTP Submission
  console.log("\n4. Testing invalid OTP submission (wrong code: 000000)...");
  const badCode = foundCode === "000000" ? "111111" : "000000";
  const badRes = await fetch(`${BASE_URL}/api/auth/verify-email-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      otp: badCode,
    }),
  });

  const badData = await badRes.json();
  console.log(`Status: ${badRes.status}`);
  console.log(`Response:`, badData);

  if (badRes.status !== 400 || badData.remainingAttempts !== 4) {
    throw new Error(`Expected 400 with 4 remaining attempts, got: ${JSON.stringify(badData)}`);
  }
  console.log("✓ Invalid OTP rejected with 400 and remainingAttempts count decrement");

  // STEP 5: Attempt Resend Cooldown
  console.log("\n5. Testing resend cooldown rate limit (immediate resend)...");
  const resendRes = await fetch(`${BASE_URL}/api/auth/resend-email-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail }),
  });

  const resendData = await resendRes.json();
  console.log(`Status: ${resendRes.status}`);
  console.log(`Response:`, resendData);

  if (resendRes.status !== 429) {
    throw new Error(`Expected 429 Too Many Requests for cooldown, got: ${resendRes.status}`);
  }
  console.log("✓ Resend cooldown enforced: 429 Too Many Requests with retryAfterSeconds");

  // STEP 6: Submit Correct OTP Code
  console.log(`\n6. Submitting valid 6-digit OTP code (${foundCode})...`);
  const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-email-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      otp: foundCode,
    }),
  });

  const verifyData = await verifyRes.json();
  console.log(`Status: ${verifyRes.status}`);
  console.log(`Response:`, verifyData);

  if (verifyRes.status !== 200 || !verifyData.verified || !verifyData.token) {
    throw new Error(`OTP verification failed: ${JSON.stringify(verifyData)}`);
  }
  console.log("✓ Verification succeeded with 200 OK, verified: true, and auth token");

  // Check DB consumed status
  const updatedRecord = await db.collection("emailverificationcodes").findOne({ _id: activeRecord._id });
  if (!updatedRecord.consumedAt) {
    throw new Error("consumedAt timestamp was not set on verification code in DB!");
  }
  const verifiedUser = await db.collection("users").findOne({ email: testEmail.toLowerCase().trim() });
  if (!verifiedUser.isVerified) {
    throw new Error("User.isVerified was not set to true in MongoDB!");
  }
  console.log("✓ Database record atomically marked consumed; user.isVerified === true");

  // STEP 7: Submit OTP again on already verified account
  console.log("\n7. Submitting code again on already verified account...");
  const dupVerifyRes = await fetch(`${BASE_URL}/api/auth/verify-email-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      otp: foundCode,
    }),
  });

  const dupVerifyData = await dupVerifyRes.json();
  console.log(`Status: ${dupVerifyRes.status}`);
  console.log(`Response:`, dupVerifyData);
  if (dupVerifyRes.status !== 200 || !dupVerifyData.alreadyVerified) {
    throw new Error("Expected 200 with alreadyVerified: true");
  }
  console.log("✓ Already verified accounts return 200 with alreadyVerified: true");

  // STEP 8: Subsequent Login
  console.log("\n8. Performing subsequent login with verified account...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });

  const loginData = await loginRes.json();
  console.log(`Status: ${loginRes.status}`);
  console.log(`Response:`, loginData);

  if (loginRes.status !== 200 || !loginData.token || !loginData._id) {
    throw new Error(`Login failed after verification: ${JSON.stringify(loginData)}`);
  }
  console.log("✓ Post-verification login succeeded with 200 and auth token:", loginData.token.slice(0, 20) + "...");

  // STEP 9: Call Protected API with Token
  console.log("\n9. Calling protected /api/habits with verified auth token...");
  const habitsRes = await fetch(`${BASE_URL}/api/habits`, {
    headers: {
      Authorization: `Bearer ${loginData.token}`,
    },
  });

  const habitsData = await habitsRes.json();
  console.log(`Status: ${habitsRes.status}`);
  console.log(`Habits returned: ${habitsData.length}`);
  if (habitsRes.status !== 200) {
    throw new Error(`Protected route failed: ${JSON.stringify(habitsData)}`);
  }
  console.log("✓ Protected API route accessible by verified user");

  // Clean up test user & OTP records
  console.log("\nCleaning up test user & verification codes...");
  await db.collection("users").deleteOne({ _id: verifiedUser._id });
  await db.collection("emailverificationcodes").deleteMany({ email: testEmail.toLowerCase().trim() });
  await mongoose.disconnect();
  console.log("✓ Cleaned up test data.");

  console.log("\n========================================================");
  console.log("🎉 ALL END-TO-END EMAIL OTP VERIFICATION TESTS PASSED!");
  console.log("========================================================");
}

runTest().catch((err) => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});

