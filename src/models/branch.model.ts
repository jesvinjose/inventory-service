import mongoose, { Schema, model, Document, Types } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

export interface IBranch extends Document {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  defaultWarehouseId: Types.ObjectId;
  name: string;
  address?: string;
  status: "active" | "deleted";
  createdAt: Date;
  updatedAt: Date;
}

// 🔹 Extend the model interface to include pagination
export interface IBranchModel<T = IBranch> extends mongoose.PaginateModel<T> {}

const BranchSchema = new Schema<IBranch>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    defaultWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    name: { type: String, required: true },
    address: { type: String },

    status: { type: String, enum: ["active", "deleted"], default: "active" },
  },
  { timestamps: true }
);

// ✅ Unique index: branch name per company
BranchSchema.index({ companyId: 1, name: 1 }, { unique: true });

// 🔹 Add pagination plugin
BranchSchema.plugin(mongoosePaginate);

// ✅ Export model with proper typing
export const BranchModel = model<IBranch, IBranchModel<IBranch>>(
  "Branch",
  BranchSchema
);
