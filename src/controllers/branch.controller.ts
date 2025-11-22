import { Request, Response } from "express";
import { BranchModel } from "../models/branch.model";
import { WarehouseModel } from "../models/warehouse.model";
import mongoose from "mongoose";

export const createBranch = async (req: Request, res: Response) => {
  try {
    const { companyId, name, address } = req.body;

    if (!companyId || !name) {
      return res
        .status(400)
        .json({ status: false, message: "companyId and name are required." });
    }

    // ✅ Create branch
    const branch = new BranchModel({ companyId, name, address });
    await branch.save();

    // ✅ Auto-create default warehouse
    const defaultWarehouse = new WarehouseModel({
      branchId: branch._id,
      name: "Default Storage",
      isCentral: false,
      isDefault: true, // 👈 mark as default
    });
    await defaultWarehouse.save();

    return res.status(201).json({
      status: true,
      message: "Branch created successfully with default warehouse.",
      data: { branch, defaultWarehouse },
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: false,
        message: "Branch name must be unique within the company.",
      });
    }
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const getBranches = async (req: Request, res: Response) => {
  try {
    // 🔹 Extract query params
    const {
      page = "1",
      limit = "10",
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
      companyId, // optional filter by company
    } = req.body as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));

    // ✅ Only active branches
    const filters: Record<string, any> = { status: "active" };

    // 🔹 Optional company filter
    if (companyId) {
      filters.companyId = companyId;
    }

    // 🔹 Optional search (by name or address)
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }

    // 🔹 Dynamic sorting
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    // 🔹 Perform pagination
    const result = await BranchModel.paginate(filters, {
      page: pageNum,
      limit: limitNum,
      sort,
      lean: true,
      select: "name address status", // 🔹 only these fields
      populate: {
        path: "companyId",
        select: "name", // 🔹 Only fetch specific fields from Company
      },
    });

    // ✅ Standardized response
    return res.status(200).json({
      status: true,
      message: "Active branches fetched successfully",
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
    return res.status(500).json({ status: false, message: error.message });
  }
};

// Get a single branch by ID
export const getBranchById = async (req: Request, res: Response) => {
  try {
    const branch = await BranchModel.findOne({
      _id: req.body.id,
      status: { $ne: "deleted" },
    })
      .select("name address status companyId")
      .populate({
        path: "companyId",
        select: "name code", // only fetch required company fields
      })
      .lean(); // optional, gives plain JS object

    if (!branch) {
      return res
        .status(404)
        .json({ message: "Branch not found.", status: false });
    }
    return res.status(200).json({
      status: true,
      message: "Branch found successfully.",
      data: branch,
    });
  } catch (error: any) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// Soft delete a branch
export const deleteBranch = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { id } = req.body;
    if (!id) {
      return res
        .status(400)
        .json({ status: false, message: "Branch ID is required." });
    }

    // 🔹 Find and update only if branch is active
    const branch = await BranchModel.findOneAndUpdate(
      { _id: id, status: "active" },
      { status: "deleted" },
      { new: true, session }
    );

    if (!branch) {
      return res
        .status(404)
        .json({
          status: false,
          message: "Branch not found or already deleted.",
        });
    }

    // 🔹 Step 2: Soft delete all warehouses under this branch
    await WarehouseModel.updateMany(
      { branchId: branch._id, status: { $ne: "deleted" } },
      { $set: { status: "deleted" } },
      { session }
    );

    // 🔹 Step 3: Commit the transaction
    await session.commitTransaction();

    return res
      .status(200)
      .json({ status: true, message: "Branch and its warehouses deleted successfully (soft delete)." });
  } catch (error: any) {
    // 🔹 Rollback on any error
    await session.abortTransaction();
    return res.status(500).json({ status: false, message: error.message || "Failed to delete branch." });
  } finally {
    // ✅ Always end the session
    await session.endSession();
  }
};

export const updateBranch = async (req: Request, res: Response) => {
  try {
    const { id, name, address, status } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ status: false, message: "Branch ID is required." });
    }

    // ✅ Find existing branch
    const branch = await BranchModel.findById(id);
    if (!branch || branch.status === "deleted") {
      return res
        .status(404)
        .json({ status: false, message: "Branch not found or deleted." });
    }

    // ✅ Apply updates (only fields that are provided)
    if (name !== undefined) branch.name = name.trim();
    if (address !== undefined) branch.address = address.trim();
    if (status !== undefined) branch.status = status;

    // ✅ Save with validation
    await branch.save();

    return res.status(200).json({
      status: true,
      message: "Branch updated successfully.",
      data: branch,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      // Handle duplicate name within same company
      return res.status(400).json({
        status: false,
        message: "Branch name must be unique within the company.",
      });
    }

    return res
      .status(500)
      .json({ status: false, message: error.message || "Server error" });
  }
};

export const getBranchesForDropdown = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.body;

    // 🔹 Filter active branches, optionally by companyId
    const filter: any = { status: "active" };
    if (companyId) filter.companyId = companyId;

    // 🔹 Fetch with company populated
    const branches = await BranchModel.find(filter)
      .populate("companyId", "name") // only bring company name
      .select("_id name companyId")
      .sort({ name: 1 });

    // 🔹 Map for clean dropdown response
    const data = branches.map((b) => ({
      id: b._id,
      name: b.name,
      company: b.companyId ? (b.companyId as any).name : null,
      companyId: b.companyId?._id || null,
    }));

    return res.status(200).json({
      status: true,
      message: "Branches fetched successfully.",
      data,
    });
  } catch (error: any) {
    return res.status(500).json({
      status: false,
      message: error.message || "Failed to fetch branches.",
    });
  }
};


