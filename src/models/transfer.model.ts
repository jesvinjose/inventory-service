import { Schema, model, Document, Types } from "mongoose";

export interface ITransfer extends Document {
  fromLocationId: Types.ObjectId;
  toLocationId: Types.ObjectId;
  productId: Types.ObjectId;
  quantity: number;
  unit: string;
  status: "pending" | "completed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const TransferSchema = new Schema<ITransfer>(
  {
    fromLocationId: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
    toLocationId: {
      type: Schema.Types.ObjectId,
      ref: "Location",
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
