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
    const { id, name, isCentral, coordinates, status } = req.body;

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
    if (isCentral !== undefined) existingWarehouse.isCentral = isCentral;
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
  try {
    const { id } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ status: false, message: "id is required." });
    }

    // Fetch only active warehouse
    const warehouse = await WarehouseModel.findOne({
      _id: id,
      status: { $ne: "deleted" },
    });

    // Case 1: Not found or already deleted
    if (!warehouse) {
      return res.status(404).json({
        status: false,
        message: "Warehouse not found or already deleted.",
      });
    }

    // Case 2: Perform soft delete
    warehouse.status = "deleted";
    await warehouse.save();

    return res.status(200).json({
      status: true,
      message: "Warehouse deleted successfully (soft delete).",
    });
  } catch (error: any) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
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

