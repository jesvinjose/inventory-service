import { Schema, model, Document, Types } from "mongoose";

export interface IInventory extends Document {
  warehouseId: Types.ObjectId;
  productId: Types.ObjectId; // from Product Service
  product_snapshot?: any; // snapshot from product microservice
  quantity: number;
  unit: string;
  createdAt: Date;
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>(
  {
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    productId: { type: Schema.Types.ObjectId, required: true, index: true },
    product_snapshot: {
      type: Schema.Types.Mixed,
      required: true,
    },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
  },
  { timestamps: true }
);

InventorySchema.index({ warehouseId: 1, productId: 1 }, { unique: true });

export const InventoryModel = model<IInventory>("Inventory", InventorySchema);
