import { Request, Response } from "express";
import { InventoryModel } from "../models/inventory.model";
import mongoose from "mongoose";
const { Types } = mongoose;

const isValidObjectId = (id?: string) => {
  return !!id && Types.ObjectId.isValid(id);
};

// Once GRN is read inventory gets created/updated at the warehouse
export const createOrUpdateFromGRN = async (req: Request, res: Response) => {
  try {
    const { warehouseId, productId, product_snapshot, quantity, unit } =
      req.body;

    if (!isValidObjectId(warehouseId) || !isValidObjectId(productId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid warehouseId or productId" });
    }
    if (typeof quantity !== "number") {
      return res
        .status(400)
        .json({ success: false, message: "quantity must be a number" });
    }
    if (!unit) {
      return res.status(400).json({ success: false, message: "unit required" });
    }

    // Check if inventory exists
    const existing = await InventoryModel.findOne({
      warehouseId,
      productId,
    });

    if (existing) {
      // ❗ Strict rule: unit mismatch not allowed
      if (existing.unit !== unit) {
        return res.status(400).json({
          success: false,
          message: `Unit mismatch: Existing inventory uses "${existing.unit}", but GRN sent "${unit}".`,
        });
      }

      // Just update quantity (unit remains same)
      existing.quantity += quantity;
      if (product_snapshot) {
        existing.product_snapshot = product_snapshot; // optional snapshot update
      }
      await existing.save();

      return res.status(200).json({ success: true, data: existing });
    }

    // New inventory entry — unit is set here
    const created = await InventoryModel.create({
      warehouseId,
      productId,
      product_snapshot,
      quantity,
      unit,
    });

    return res.status(200).json({ success: true, data: created });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
