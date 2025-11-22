import { Router } from "express";

import {
  createBranch,
  deleteBranch,
  getBranchById,
  getBranches,
  getBranchesForDropdown,
  updateBranch,
} from "../controllers/branch.controller";

const router = Router();

// All POST routes
router.post("/create", createBranch); // Create branch
router.post("/list", getBranches); // Get all branches
router.post("/getById", getBranchById); // Get branch by ID
router.post("/delete", deleteBranch); // Soft delete branch
router.post("/update", updateBranch); // Update branch
router.post("/dropdown", getBranchesForDropdown); // List branches for dropdown

export default router;
