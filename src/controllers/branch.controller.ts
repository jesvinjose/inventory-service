import { Request, Response } from "express";
import { BranchModel } from "../models/branch.model";
import { WarehouseModel } from "../models/warehouse.model";
import mongoose from "mongoose";

export const createBranch = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { companyId, name, address, defaultWarehouseId } = req.body;

    if (!companyId || !name || !defaultWarehouseId) {
      return res.status(400).json({
        status: false,
        message: "companyId, name and defaultWarehouseId are required.",
      });
    }

    // 1️⃣ Validate warehouse exists & active
    const warehouse = await WarehouseModel.findOne({
      _id: defaultWarehouseId,
      status: "active",
    });

    if (!warehouse) {
      await session.abortTransaction();
      return res.status(400).json({
        status: false,
        message: "Default warehouse not found",
      });
    }

    // 2️⃣ Create the branch
    const branch = await BranchModel.create(
      [
        {
          companyId,
          name,
          address,
          defaultWarehouseId,
        },
      ],
      { session }
    );

    const createdBranch = branch[0]; // because create() with array returns array

    // 3️⃣ Auto-link branch to warehouse.branchIds if not present
    const alreadyLinked = warehouse.branchIds?.some((id) =>
      id.equals(createdBranch._id)
    );

    if (!alreadyLinked) {
      warehouse.branchIds.push(createdBranch._id);
      await warehouse.save({ session });
    }

    // 4️⃣ Commit transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      status: true,
      message:
        "Branch created successfully and linked to the default warehouse.",
      data: createdBranch,
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    if (error.code === 11000) {
      return res.status(400).json({
        status: false,
        message: "Branch name must be unique within the company.",
      });
    }

    return res.status(500).json({
      status: false,
      message: error.message,
    });
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
      select:
        "name address status companyId defaultWarehouseId createdAt updatedAt", // 🔹 only these fields
      populate: [
        {
          path: "companyId",
          select: "name", // 🔹 Only fetch specific fields from Company
        },
        {
          path: "defaultWarehouseId",
          select: "name branchIds status",
        },
      ],
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
      .select(
        "name address status companyId defaultWarehouseId createdAt updatedAt"
      )
      .populate({
        path: "companyId",
        select: "name code", // only fetch required company fields
      })
      .populate({
        path: "defaultWarehouseId",
        select: "name branchIds status",
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

export const deleteBranch = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ status: false, message: "Branch ID is required." });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid Branch ID." });
    }

    // Run everything inside a transaction
    await session.withTransaction(async () => {
      // 1) Soft-delete the branch only if it's currently active
      const branch = await BranchModel.findOneAndUpdate(
        { _id: id, status: "active" },
        { $set: { status: "deleted" } },
        { new: true, session }
      );

      if (!branch) {
        // Throw an error to abort the transaction. We'll catch it outside and return 404.
        const err: any = new Error("Branch not found or already deleted.");
        err.statusCode = 404;
        throw err;
      }

      // 2) Remove this branch reference from all warehouses
      await WarehouseModel.updateMany(
        { branchIds: branch._id },
        { $pull: { branchIds: branch._id } },
        { session }
      );

      // 👉 We are NOT deleting the warehouse even if branchIds become empty
      //    Warehouses remain active with branchIds: []
      //    This is allowed and matches your schema design
    }); // end withTransaction

    // If we reach here transaction committed successfully
    return res.status(200).json({
      status: true,
      message:
        "Branch and related warehouses updated successfully (pulled the branchId).",
    });
  } catch (error: any) {
    // If the thrown error included a statusCode (like 404), respect it
    const statusCode = error?.statusCode || 500;
    const msg =
      error?.message || "Failed to delete branch. Transaction aborted.";

    return res.status(statusCode).json({
      status: false,
      message: msg,
    });
  } finally {
    // Always end the session
    await session.endSession();
  }
};

export const updateBranch = async (req: Request, res: Response) => {
  try {
    const { id, name, address } = req.body;

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

    return res.status(500).json({ status: false, message: error.message });
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
      message: error.message,
    });
  }
};
