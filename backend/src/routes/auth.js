const express = require("express");
const { body } = require("express-validator");
const {
  register,
  login,
  getMe,
  getAllUsers,
} = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post(
  "/register",
  [
    body("email").isEmail().toLowerCase(),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("name").trim().isLength({ min: 2 }).withMessage("Name required"),
  ],
  register,
);

router.post(
  "/login",
  [body("email").isEmail().toLowerCase(), body("password").notEmpty()],
  login,
);

router.get("/me", authenticate, getMe);

// Temporary endpoint to view all users (remove after testing)
router.get("/all-users", getAllUsers);

module.exports = router;
