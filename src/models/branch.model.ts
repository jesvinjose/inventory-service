import { Schema, model, Document, Types } from "mongoose";

export interface IBranch extends Document {
  companyId: Types.ObjectId;
  name: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranch>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    address: { type: String },
  },
  { timestamps: true }
);

export const BranchModel = model<IBranch>("Branch", BranchSchema);
