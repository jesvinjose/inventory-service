import { Schema, model, Document, Types } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

export interface IProduct extends Document {
  companyId: Types.ObjectId;
  name: string;
  sku: string;
  description?: string;
  unit: string; // e.g. 'box', 'tablet', 'kg'
  status: "active" | "deleted";
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    description: { type: String },
    unit: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "deleted"],
      default: "active",
    },
  },
  { timestamps: true }
);

ProductSchema.plugin(mongoosePaginate);

export const ProductModel = model<IProduct>("Product", ProductSchema);
