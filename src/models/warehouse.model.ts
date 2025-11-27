import mongoose, { Schema, model, Document, Types } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

export interface IWarehouse extends Document {
  companyId: Types.ObjectId;
  branchIds: Types.ObjectId[]; // now supports multiple branches;
  name: string; // e.g., "Main Store" or "Default Storage"
  coordinates?: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  status: "active" | "deleted";
  createdAt: Date;
  updatedAt: Date;
}

// 🔹 Extend the model interface to include pagination
export interface IWarehouseModel<T = IWarehouse>
  extends mongoose.PaginateModel<T> {}

const WarehouseSchema = new Schema<IWarehouse>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    branchIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Branch",
        required: false, // optional
        index: true,
      },
    ],
    name: { type: String, required: true },
    coordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: undefined, // ✅ don’t auto-assign Point unless given
      },
      coordinates: { type: [Number], required: false }, // [lng, lat]
    },
    status: { type: String, enum: ["active", "deleted"], default: "active" },
  },
  { timestamps: true }
);

// Unique warehouse name per company
WarehouseSchema.index({ companyId: 1, name: 1 }, { unique: true });

WarehouseSchema.index({ branchIds: 1 }); // non-unique

WarehouseSchema.plugin(mongoosePaginate);

export const WarehouseModel = model<IWarehouse, IWarehouseModel<IWarehouse>>(
  "Warehouse",
  WarehouseSchema
);
