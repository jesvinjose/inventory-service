import { Request, Response } from "express";
import { CompanyModel } from "../models/company.model";

// Create a new company
export const createCompany = async (req: Request, res: Response) => {
  try {
    const { name, code, metadata } = req.body;
    const company = await CompanyModel.create({ name, code, metadata });
    res.status(201).json({
      status: true,
      message: "company created successfully",
      data: company,      
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ status: false, message: "Company code must be unique." });
    }
    return res.status(500).json({ status: false, message: error.message });
  }
};

// Get all companies
export const getCompanies = async (_req: Request, res: Response) => {
  try {
    const companies = await CompanyModel.find({ status: { $ne: "deleted" } });
    res.status(200).json({
      status: true,
      message: "companies found successfully",
      data: companies,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message, status: false });
  }
};

// Get a single company by ID
export const getCompanyById = async (req: Request, res: Response) => {
  try {
    const company = await CompanyModel.findOne({
      _id: req.body.id,
      status: { $ne: "deleted" },
    });
    if (!company) {
      return res
        .status(404)
        .json({ message: "Company not found.",status: false,  });
    }
    return res.status(200).json({ status: true,message: "Company found successfully.", data: company });
  } catch (error: any) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// Update a company
export const updateCompany = async (req: Request, res: Response) => {
  try {
    const { id, name, code, metadata } = req.body;

    const company = await CompanyModel.findOneAndUpdate(
      { _id: id, status: { $ne: "deleted" } }, // ✅ exclude deleted
      { name, code, metadata },
      { new: true, runValidators: true }
    );

    if (!company) {
      return res
        .status(404)
        .json({ status: false, message: "Company not found." });
    }

    return res.status(200).json({ status: true,message: "Company updated successfully.", data: company });
  } catch (error: any) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ status: false, message: "Company code must be unique." });
    }
    return res.status(500).json({ status: false, message: error.message });
  }
};

// Soft delete a company
export const deleteCompany = async (req: Request, res: Response) => {
  try {
    const company = await CompanyModel.findByIdAndUpdate(
      req.body.id,
      { status: "deleted" },
      { new: true }
    );

    if (!company) {
      return res
        .status(404)
        .json({ status: false, message: "Company not found." });
    }

    return res
      .status(200)
      .json({ status: true, message: "Company deleted successfully." });
  } catch (error: any) {
    return res.status(500).json({ status: false, message: error.message });
  }
};
