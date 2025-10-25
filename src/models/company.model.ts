// models/company.model.ts
import mongoose, { Schema, model, Document } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

export interface ICompany extends Document {
  name: string;
  code?: string;
  metadata?: Record<string, any>;
  status: "active" | "deleted"; // add status
  createdAt: Date;
  updatedAt: Date;
}

// 🔹 Extend the model interface to include pagination
export interface ICompanyModel<T = ICompany>
  extends mongoose.PaginateModel<T> {}

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

// 🔹 Add pagination plugin
CompanySchema.plugin(mongoosePaginate);

export const CompanyModel = model<ICompany, ICompanyModel<ICompany>>(
  "Company",
  CompanySchema
);
