// controllers/warehouse.controller.ts
import { Request, Response } from "express";
import { WarehouseModel } from "../models/warehouse.model";

export const createWarehouse = async (req: Request, res: Response) => {
  try {
    const { branchId, name, isCentral, coordinates } = req.body;

    if (!branchId || !name) {
      return res
        .status(400)
        .json({ status: false, message: "branchId and name are required." });
    }

    const warehouse = new WarehouseModel({
      branchId,
      name,
      isCentral: isCentral || false,
      coordinates,
    });
    await warehouse.save();

    return res.status(201).json({
      status: true,
      message: "Warehouse created successfully.",
      data: warehouse,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: false,
        message: "Warehouse name must be unique within this branch.",
      });
    }
    return res.status(500).json({ status: false, message: error.message });
  }
};
