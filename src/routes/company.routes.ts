import { Router } from "express";
import {
  createCompany,
  deleteCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
} from "../controllers/company.controller";

const router = Router();

// All POST routes
router.post("/create", createCompany); // Create company
router.post("/list", getCompanies); // Get all companies
router.post("/getById", getCompanyById); // Get company by ID
router.post("/update", updateCompany); // Update company
router.post("/delete", deleteCompany); // Soft delete company

export default router;
