// controllers/warehouse.controller.ts
import { Request, Response } from "express";
import { WarehouseModel } from "../models/warehouse.model";
import mongoose from "mongoose";
import { InventoryModel } from "../models/inventory.model";

export const createWarehouse = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  try {
    const {
      branchId,
      name,
      isCentral = false,
      coordinates,
      isDefault = false,
    } = req.body;

    if (!branchId || !name) {
      return res
        .status(400)
        .json({ status: false, message: "branchId and name are required." });
    }

    // start transaction
    await session.withTransaction(async () => {
      // If isCentral true, unset existing central for the branch
      if (isCentral) {
        await WarehouseModel.updateMany(
          { branchId, isCentral: true, status: "active" },
          { $set: { isCentral: false } },
          { session }
        );
      }

      // If isDefault true, unset existing default for the branch
      if (isDefault) {
        await WarehouseModel.updateMany(
          { branchId, isDefault: true, status: "active" },
          { $set: { isDefault: false } },
          { session }
        );
      }

      const warehouse = new WarehouseModel({
        branchId,
        name,
        isCentral,
        isDefault,
        coordinates,
      });
      await warehouse.save({ session });
      // response must be outside transaction callback in some setups,
      // but keeping simple: return by throwing/capturing result after commit.
      // We'll attach created warehouse to session for outer scope.
      (session as any).createdWarehouse = warehouse;
    });

    const created = (session as any).createdWarehouse;
    session.endSession();

    return res.status(201).json({
      status: true,
      message: "Warehouse created successfully.",
      data: created,
    });
  } catch (error: any) {
    // Duplicate key could happen if two concurrent creators race despite transaction;
    // the partial unique index ensures DB-level safety.
    if (error.code === 11000) {
      // customize message for isCentral or name duplicate based on key pattern
      const msg =
        /isCentral/.test(error.message) || /isDefault/.test(error.message)
          ? "Only one central/default warehouse is allowed per branch."
          : "Warehouse name must be unique within this branch.";
      return res.status(400).json({ status: false, message: msg });
    }

    return res.status(500).json({ status: false, message: error.message });
  }
};

export const getWarehouses = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, branchId, status } = req.body;

    const filter: any = {};
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: { path: "branchId", select: "name" },
      sort: { createdAt: -1 },
    };

    const result = await WarehouseModel.paginate(filter, options);

    return res.status(200).json({
      status: true,
      message: "Warehouses fetched successfully.",
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
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

export const getWarehouseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;

    if (!id)
      return res
        .status(400)
        .json({ status: false, message: "id is required." });

    const warehouse = await WarehouseModel.findById(id)
      .populate("branchId", "name")
      .lean();

    if (!warehouse)
      return res
        .status(404)
        .json({ status: false, message: "Warehouse not found." });

    return res.status(200).json({
      status: true,
      message: "Warehouse fetched successfully.",
      data: warehouse,
    });
  } catch (error: any) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const updateWarehouse = async (req: Request, res: Response) => {
  try {
    const { id, name, coordinates, status } = req.body;

    if (!id)
      return res
        .status(400)
        .json({ status: false, message: "id is required." });

    const existingWarehouse = await WarehouseModel.findById(id);
    if (!existingWarehouse)
      return res
        .status(404)
        .json({ status: false, message: "Warehouse not found." });

    if (name) existingWarehouse.name = name;
    if (coordinates) existingWarehouse.coordinates = coordinates;
    if (status) existingWarehouse.status = status;

    await existingWarehouse.save();

    return res.status(200).json({
      status: true,
      message: "Warehouse updated successfully.",
      data: existingWarehouse,
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

export const deleteWarehouse = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  try {
    const { id } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ status: false, message: "id is required." });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: false, message: "Invalid id." });
    }

    // Use transaction for safe check + delete
    let result: any;
    await session.withTransaction(async () => {
      // Fetch warehouse (only non-deleted)
      const warehouse = await WarehouseModel.findOne({
        _id: id,
        status: { $ne: "deleted" },
      }).session(session);

      // Case 1: Not found or already deleted
      if (!warehouse) {
        throw {
          statusCode: 404,
          body: {
            status: false,
            message: "Warehouse not found or already deleted.",
          },
        };
      }

      // Check if any inventory exists in this warehouse
      // Since you will never keep quantity = 0 records, ANY record means active inventory.
      const hasInventory = await InventoryModel.exists({
        warehouseId: id,
      }).session(session);

      if (hasInventory) {
        throw {
          statusCode: 400,
          body: {
            status: false,
            message:
              "Cannot delete warehouse: inventory exists in this warehouse.",
          },
        };
      }

      // Soft delete
      await WarehouseModel.updateOne(
        { _id: id },
        { $set: { status: "deleted" } }
      ).session(session);

      result = {
        status: true,
        message: "Warehouse deleted successfully (soft delete).",
      };
    });

    return res.status(200).json(result);
  } catch (error: any) {
    // Custom thrown error
    if (error?.statusCode) {
      return res.status(error.statusCode).json(error.body);
    }

    // Generic error
    return res.status(500).json({
      status: false,
      message: error?.message,
    });
  } finally {
    // ✅ Always end the session
    await session.endSession();
  }
};

export const getWarehousesForDropdown = async (req: Request, res: Response) => {
  try {
    const { branchId } = req.body;
    const filter: any = { status: "active" };
    if (branchId) filter.branchId = branchId;

    const warehouses = await WarehouseModel.find(filter)
      .select("_id name branchId")
      .populate("branchId", "name")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      status: true,
      message: "Warehouses fetched for dropdown successfully.",
      data: warehouses,
    });
  } catch (error: any) {
    return res.status(500).json({ status: false, message: error.message });
  }
};
