const express = require("express");
const { body } = require("express-validator");
const {
  register,
  login,
  getMe,
  getAllUsers,
  registerPending,
  resendVerification,
} = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Original register (Google OAuth path, immediate login)
router.post(
  "/register",
  [
    body("email").isEmail().toLowerCase(),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("name").trim().isLength({ min: 2 }).withMessage("Name required"),
  ],
  register,
);

// Email+password registration — sends confirmation email, does NOT log in
router.post(
  "/register-pending",
  [
    body("email").isEmail().toLowerCase(),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("name").trim().isLength({ min: 2 }).withMessage("Name required"),
  ],
  registerPending,
);

// Resend verification email
router.post("/resend-verification", resendVerification);

router.post(
  "/login",
  [body("email").isEmail().toLowerCase(), body("password").notEmpty()],
  login,
);

router.get("/me", authenticate, getMe);

// Temporary: view all users
router.get("/all-users", getAllUsers);

module.exports = router;