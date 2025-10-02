import { Schema, model, Document, Types } from "mongoose";

export interface IWarehouse extends Document {
  branchId: Types.ObjectId;
  name: string; // e.g., "Main Store" or "Default Storage"
  isCentral?: boolean; // optional for central warehouse logic
  coordinates: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  createdAt: Date;
  updatedAt: Date;
}

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
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
  },
  { timestamps: true }
);

// Geo index for distance queries
WarehouseSchema.index({ coordinates: "2dsphere" });

export const WarehouseModel = model<IWarehouse>("Warehouse", WarehouseSchema);
