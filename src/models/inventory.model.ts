import { Schema, model, Document, Types } from "mongoose";

export interface IInventory extends Document {
  locationId: Types.ObjectId; // branch or warehouse
  productId: Types.ObjectId; // from Product Service
  quantity: number;
  unit: string;
  createdAt: Date;
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>(
  {
    locationId: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      required: true,
      index: true,
    },
    productId: { type: Schema.Types.ObjectId, required: true, index: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
  },
  { timestamps: true }
);

InventorySchema.index({ locationId: 1, productId: 1 }, { unique: true });

export const InventoryModel = model<IInventory>("Inventory", InventorySchema);
