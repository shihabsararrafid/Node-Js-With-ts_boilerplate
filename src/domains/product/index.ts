import { Router } from "express";
import { routes } from "./api";

const defineRoutes = (expressRouter: Router) => {
  expressRouter.use("/products", routes());
};

export default defineRoutes;
