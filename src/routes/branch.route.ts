import { Router } from "express";

import { createBranch, getBranchById, getBranches,  } from "../controllers/branch.controller";

const router = Router();

// All POST routes
router.post("/create", createBranch); // Create branch
router.post("/list", getBranches); // Get all branches
router.post("/getById", getBranchById); // Get branch by ID


export default router;