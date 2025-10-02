import { Schema, model, Document, Types } from "mongoose";

export interface ITransfer extends Document {
  fromWarehouseId: Types.ObjectId;
  toWarehouseId: Types.ObjectId;
  productId: Types.ObjectId;
  quantity: number;
  unit: string;
  status: "pending" | "completed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const TransferSchema = new Schema<ITransfer>(
  {
    fromWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    toWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    productId: { type: Schema.Types.ObjectId, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const TransferModel = model<ITransfer>("Transfer", TransferSchema);
