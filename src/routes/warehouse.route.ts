import express from "express";
import {
  createWarehouse,
  getWarehouses,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
  getWarehousesForDropdown,
} from "../controllers/warehouse.controller.js";

const router = express.Router();

router.post("/create", createWarehouse);
router.post("/list", getWarehouses);
router.post("/getById", getWarehouseById);
router.post("/update", updateWarehouse);
router.post("/delete", deleteWarehouse);
router.post("/dropdown", getWarehousesForDropdown);

export default router;
