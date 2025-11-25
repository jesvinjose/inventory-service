import express from "express";
import {
  createWarehouse,
  getWarehouses,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
  getWarehousesForDropdown,
} from "../controllers/warehouse.controller";

const router = express.Router();

router.post("/create", createWarehouse);
router.post("/list", getWarehouses);
router.post("/getById", getWarehouseById);
router.post("/update", updateWarehouse);
router.post("/delete", deleteWarehouse);
router.post("/dropdown", getWarehousesForDropdown);
// u2lCszv7G63JpWNL
// jesvinjose49_db_user
export default router;
