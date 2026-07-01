import { Router } from "express";
import { body, param, query } from "express-validator";
import { protect, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { getQuestions, createQuestion, answerQuestion } from "../controllers/questionController.js";

const router = Router({ mergeParams: true });

const productIdCheck = param("productId").isMongoId().withMessage("productId must be a valid id");

router.get(
  "/",
  [
    productIdCheck,
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
  ],
  validate,
  getQuestions
);

router.post(
  "/",
  protect,
  [
    productIdCheck,
    body("question").trim().notEmpty().isLength({ max: 500 }).withMessage("Question is required and must be under 500 characters"),
  ],
  validate,
  createQuestion
);

router.put(
  "/:questionId/answer",
  protect,
  requireRole("ADMIN"),
  [
    productIdCheck,
    param("questionId").isMongoId().withMessage("questionId must be a valid id"),
    body("answer").trim().notEmpty().isLength({ max: 2000 }).withMessage("Answer is required and must be under 2000 characters"),
  ],
  validate,
  answerQuestion
);

export default router;
