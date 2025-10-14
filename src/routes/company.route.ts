import { Router } from "express";
import {
  createCompany,
  deleteCompany,
  getCompanies,
  getCompaniesForDropdown,
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
router.post("/dropdown", getCompaniesForDropdown); // List companies for dropdown

export default router;
