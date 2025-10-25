import mongoose, { Schema, model, Document, Types } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

export interface IWarehouse extends Document {
  branchId: Types.ObjectId;
  name: string; // e.g., "Main Store" or "Default Storage"
  isCentral?: boolean; // optional for central warehouse logic
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
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    isCentral: { type: Boolean, default: false },
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

// ✅ Unique index: warehouse name per branch
WarehouseSchema.index({ branchId: 1, name: 1 }, { unique: true });

// Geo index for distance queries
WarehouseSchema.index({ coordinates: "2dsphere" });

WarehouseSchema.plugin(mongoosePaginate);

export const WarehouseModel = model<IWarehouse, IWarehouseModel<IWarehouse>>(
  "Warehouse",
  WarehouseSchema
);
