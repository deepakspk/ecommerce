import ProductQuestion from "../models/ProductQuestion.js";

export async function getQuestions(req, res) {
  const { productId } = req.params;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const [questions, total] = await Promise.all([
    ProductQuestion.find({ productId })
      .populate("userId", "name")
      .populate("answeredById", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ProductQuestion.countDocuments({ productId }),
  ]);

  res.json({ questions, total, page, pages: Math.ceil(total / limit) });
}

export async function createQuestion(req, res) {
  const { productId } = req.params;
  const { question } = req.body;

  const doc = await ProductQuestion.create({
    productId,
    userId: req.user._id,
    question,
  });
  await doc.populate("userId", "name");

  res.status(201).json({ question: doc });
}

export async function answerQuestion(req, res) {
  const { questionId } = req.params;
  const { answer } = req.body;

  const doc = await ProductQuestion.findByIdAndUpdate(
    questionId,
    { answer, answeredById: req.user._id, answeredAt: new Date() },
    { new: true }
  )
    .populate("userId", "name")
    .populate("answeredById", "name");

  if (!doc) return res.status(404).json({ message: "Question not found" });

  res.json({ question: doc });
}
