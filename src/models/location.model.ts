import { Schema, model, Document, Types } from "mongoose";

export type LocationType = "branch" | "warehouse";

export interface ILocation extends Document {
  companyId: Types.ObjectId;
  name: string;
  type: LocationType;
  address?: string;
  isCentral?: boolean; // only relevant if type=warehouse
  coordinates: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema<ILocation>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    type: { type: String, required: true, enum: ["branch", "warehouse"] },
    address: { type: String },
    isCentral: { type: Boolean, default: false },
    coordinates: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
  },
  { timestamps: true }
);

// 2dsphere index for geo queries
LocationSchema.index({ coordinates: "2dsphere" });

export const LocationModel = model<ILocation>("Location", LocationSchema);
