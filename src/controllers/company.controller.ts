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
export const getCompanies = async (req: Request, res: Response) => {
  try {
    // 🔹 Extract and sanitize query parameters
    const {
      page = "1",
      limit = "10",
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
    } = req.body as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));

    // ✅ Enforce only active companies (ignore any status param)
    const filters: Record<string, any> = { status: "active" };

    // 🔹 Optional search (by name or code)
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    // 🔹 Dynamic sorting
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    // 🔹 Perform pagination
    const result = await CompanyModel.paginate(filters, {
      page: pageNum,
      limit: limitNum,
      sort,
      lean: true,
      select: "name code metadata status", // 🔹 only these fields
    });

    // ✅ Standardized API response
    return res.status(200).json({
      success: true,
      message: "Active companies fetched successfully",
      data: result.docs,
      pagination: {
        totalRecords: result.totalDocs,
        totalPages: result.totalPages,
        currentPage: result.page,
        limit: result.limit,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
        nextPage: result.nextPage,
        prevPage: result.prevPage,
      },
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
        .json({ message: "Company not found.", status: false });
    }
    return res.status(200).json({
      status: true,
      message: "Company found successfully.",
      data: company,
    });
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

    return res.status(200).json({
      status: true,
      message: "Company updated successfully.",
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

export const getCompaniesForDropdown = async (req: Request, res: Response) => {
  try {
    const companies = await CompanyModel.find({
      status: "active",
    }).select("name code");
    return res.status(200).json({
      status: true,
      message: "Companies found successfully for drop down.",
      data: companies,
    });
  } catch (error: any) {
    return res.status(500).json({ status: false, message: error.message });
  }
};
