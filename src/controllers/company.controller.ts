import { Request, Response } from "express";
import { CompanyModel } from "../models/company.model";

export const createCompany = async (req: Request, res: Response) => {
  try {
    const company = await CompanyModel.create(req.body);
    res.status(201).json({
      status: true,
      data: company,
      message: "company created successfully",
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message, status: false });
  }
};

export const getCompanies = async (_req: Request, res: Response) => {
  try {
    const companies = await CompanyModel.find();
    res.status(200).json({
      status: true,
      data: companies,
      message: "companies found successfully",
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message, status: false });
  }
};
