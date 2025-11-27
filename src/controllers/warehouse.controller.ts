// controllers/warehouse.controller.ts
import { Request, Response } from "express";
import { WarehouseModel } from "../models/warehouse.model";
import mongoose from "mongoose";
import { InventoryModel } from "../models/inventory.model";
import { BranchModel } from "../models/branch.model";

export const createWarehouse = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  try {
    const { companyId, branchIds, name, coordinates } = req.body;

    if (!companyId || !name || !coordinates) {
      return res.status(400).json({
        status: false,
        message: "companyId, name and coordinates are required.",
      });
    }

    let geoCoordinates = undefined;
    if (coordinates) {
      geoCoordinates = Array.isArray(coordinates)
        ? { type: "Point", coordinates }
        : coordinates;
    }
    const normalizedBranchIds = Array.isArray(branchIds) ? branchIds : [];
    let createdWarehouse: any = null;

    await session.withTransaction(async () => {
      // Validate branches
      if (normalizedBranchIds.length > 0) {
        const branches = await BranchModel.find({
          _id: { $in: normalizedBranchIds },
          companyId,
          status: "active",
        }).session(session);

        if (branches.length !== normalizedBranchIds.length) {
          throw Object.assign(new Error("Invalid branches."), {
            statusCode: 400,
          });
        }
      }
      // Create warehouse
      const w = new WarehouseModel({
        companyId,
        branchIds,
        name,
        coordinates: geoCoordinates,
      });

      createdWarehouse = await w.save({ session });
    });

    await session.endSession();

    return res.status(201).json({
      status: true,
      message: "Warehouse created successfully.",
      data: createdWarehouse,
    });
  } catch (err: any) {
    await session.endSession();

    if (err?.code === 11000) {
      return res.status(400).json({
        status: false,
        message: "Warehouse name must be unique per company",
      });
    }

    return res.status(err?.statusCode || 500).json({
      status: false,
      message: err?.message,
    });
  }
};

export const getWarehouses = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, branchId, status } = req.body;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));

    const filter: any = {};

    if (branchId) filter.branchIds = branchId;
    if (status) filter.status = status;

    const options = {
      page: pageNum,
      limit: limitNum,
      populate: { path: "branchIds", select: "name address" },
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
