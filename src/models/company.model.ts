// models/company.model.ts
import { Schema, model, Document } from "mongoose";

export interface ICompany extends Document {
  name: string;
  code?: string;
  metadata?: Record<string, any>;
  status: "active" | "deleted"; // add status
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true },
    code: { type: String, index: true, unique: true, sparse: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["active", "deleted"],
      default: "active",
    },
  },
  { timestamps: true }
);

export const CompanyModel = model<ICompany>("Company", CompanySchema);
